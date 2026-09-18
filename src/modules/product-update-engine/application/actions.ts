'use server';

import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getActiveUserId } from '@/lib/auth-utils';
import { getFieldDefinition } from '../domain/field-registry';
import { validateLayerScopeCompatibility } from '../domain/layer-scope-matrix';
import {
  AnalyzeSpreadsheetResult,
  EngineConfiguration,
  NormalizerRule,
  OrganizationPreviewItem,
  PreviewEngineResult,
  PreviewRowDetail,
  PreviewStatus,
  SpreadsheetColumn,
} from '../domain/types';
import {
  applyStringNormalizations,
  computeStructuredOperation,
  evaluateFilterCondition,
  computeConfigHash,
  buildProductLookupKey,
  normalizeLookupValue,
  normalizeProductKey,
  IGNORE_FIELD,
  areValuesEqual,
} from './parser-utils';

async function requireProductUpdateAccess() {
  const userId = await getActiveUserId();
  if (!userId) {
    throw new Error('Usuário não autenticado.');
  }

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, role, organization_id, company_id')
    .eq('id', userId)
    .maybeSingle();

  if (error || !profile) {
    throw new Error('Perfil não encontrado.');
  }

  const role = profile.role as string;
  const isMaster = role === 'master';
  const isAdmin = role === 'admin';
  const isCompanyAdmin = ['company_admin', 'admin_company'].includes(role);
  const isRepresentative = role === 'representative' || role === 'rep';

  if (!isMaster && !isAdmin && !isCompanyAdmin && !isRepresentative) {
    throw new Error('Acesso negado.');
  }

  return { userId, supabase, profile, isMaster, isAdmin, isCompanyAdmin, isRepresentative };
}

async function requireProductUpdateMaster() {
  const ctx = await requireProductUpdateAccess();
  if (!ctx.isMaster) {
    throw new Error('Acesso negado. Apenas usuários autorizados da Torre de Controle (role = master) podem executar atualizações globais.');
  }
  return ctx;
}

const requireProductUpdateAdmin = requireProductUpdateAccess;

function validateCompanyAdminScope(profile: any, scope: any): void {
  const role = profile.role as string;
  const isRepresentative = role === 'representative' || role === 'rep';
  if (isRepresentative) {
    const scopeType = scope?.type || 'USER';
    if (scopeType !== 'USER' && scopeType !== 'USER_AUTHORSHIP') {
      throw new Error('Acesso negado: Representantes autônomos só podem executar atualizações no escopo dos seus próprios produtos.');
    }
    return;
  }

  const isCompanyAdmin = ['company_admin', 'admin_company'].includes(profile.role);
  if (!isCompanyAdmin) return;

  const scopeType = scope?.type || 'GLOBAL';
  const targetOrgs = scope?.targetOrganizationIds || [];
  const targetCompanies = scope?.targetCompanyIds || [];

  if (scopeType !== 'COMPANY' && scopeType !== 'ORGANIZATION') {
    throw new Error('Acesso negado: Administradores de empresa só podem executar no escopo COMPANY ou ORGANIZATION.');
  }

  if (scopeType === 'COMPANY') {
    if (!profile.company_id || !targetCompanies.includes(profile.company_id)) {
      throw new Error('Acesso negado: Empresa fora do seu escopo.');
    }
  }

  if (scopeType === 'ORGANIZATION') {
    if (!profile.organization_id || !targetOrgs.includes(profile.organization_id)) {
      throw new Error('Acesso negado: Organização fora do seu escopo.');
    }
  }
}

function extractIdentifierConfig(identifier: any): { spreadsheetColumn: string; dbField: string; normalizations: NormalizerRule[] } {
  const spreadsheetColumn = identifier?.spreadsheetColumn || identifier?.mappings?.find((m: any) => m.dbField !== 'brand')?.spreadsheetColumn || 'REFERENCIA';
  const dbField = identifier?.dbField || identifier?.mappings?.find((m: any) => m.dbField !== 'brand')?.dbField || 'reference_code';
  const normalizations: NormalizerRule[] = identifier?.normalizations && identifier.normalizations.length > 0
    ? identifier.normalizations
    : ['trim', 'uppercase'];

  return { spreadsheetColumn, dbField, normalizations };
}

function filterSpreadsheetRowsByBrand(
  rawData: Record<string, any>[],
  brandScope?: any,
  identifierMappings?: any[]
): Record<string, any>[] {
  if (!brandScope || brandScope.mode === 'all' || !brandScope.selectedBrandName) {
    return rawData;
  }

  const selectedBrand = String(brandScope.selectedBrandName).trim();
  if (!selectedBrand) return rawData;

  const targetBrandNorm = normalizeProductKey(selectedBrand, { rules: ['trim', 'uppercase'] });

  let brandCol = brandScope.spreadsheetBrandColumn;
  if (!brandCol && identifierMappings) {
    brandCol = identifierMappings.find((m: any) => m.dbField === 'brand')?.spreadsheetColumn;
  }
  if (!brandCol && rawData.length > 0) {
    const keys = Object.keys(rawData[0]);
    const brandKeywords = ['marca', 'brand', 'fabricante', 'marca do produto'];
    brandCol = keys.find((k) => brandKeywords.includes(k.trim().toLowerCase()));
  }

  if (!brandCol) return rawData;

  const filtered = rawData.filter((row) => {
    const val = row[brandCol];
    if (val === null || val === undefined || val === '') return false;
    const rowBrandNorm = normalizeProductKey(val, { rules: ['trim', 'uppercase'] });
    return rowBrandNorm === targetBrandNorm || rowBrandNorm.includes(targetBrandNorm) || targetBrandNorm.includes(rowBrandNorm);
  });

  return filtered.length > 0 ? filtered : rawData;
}

async function fetchProductsByBatches(
  queryClient: any,
  dbField: string,
  searchValues: string[],
  selectColumns: string,
  userScope?: any,
  normalizations: NormalizerRule[] = ['trim', 'uppercase']
): Promise<any[]> {
  const uniqueValues = Array.from(new Set(searchValues.map((v) => String(v ?? '').trim()).filter(Boolean)));
  if (uniqueValues.length === 0) return [];

  const searchCandidates = new Set<string>();
  for (const val of uniqueValues) {
    searchCandidates.add(val);
    const cleanedQuotes = String(val).replace(/["'«»]/g, '').trim();
    if (cleanedQuotes) searchCandidates.add(cleanedQuotes);

    if (normalizations.includes('alphanumeric_only')) {
      const alpha = normalizeProductKey(val, { rules: ['alphanumeric_only'] });
      if (alpha) searchCandidates.add(alpha);
    }
  }

  const candidateArray = Array.from(searchCandidates);
  const BATCH_SIZE = 50; // Batch de 50 para evitar HTTP GET 414 URI Too Long no PostgREST
  let allProducts: any[] = [];

  for (let i = 0; i < candidateArray.length; i += BATCH_SIZE) {
    const chunk = candidateArray.slice(i, i + BATCH_SIZE);

    let offset = 0;
    const PAGE_SIZE = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = queryClient
        .from('products')
        .select(selectColumns)
        .range(offset, offset + PAGE_SIZE - 1)
        .in(dbField, chunk);

      if (userScope?.mode === 'specific' && Array.isArray(userScope.targetUserIds) && userScope.targetUserIds.length > 0) {
        query = query.in('user_id', userScope.targetUserIds);
      }

      const { data, error } = await query;
      if (error) {
        console.error('[PRODUCT UPDATE FETCH ERROR]', {
          dbField,
          batchSize: chunk.length,
          firstValues: chunk.slice(0, 5),
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        throw new Error(`Erro ao consultar produtos (${dbField}): ${error.message} [Código ${error.code}]`);
      }

      if (data && data.length > 0) {
        allProducts = allProducts.concat(data);
        if (data.length < PAGE_SIZE) {
          hasMore = false;
        } else {
          offset += PAGE_SIZE;
        }
      } else {
        hasMore = false;
      }
    }
  }

  const productMap = new Map<string, any>();
  for (const p of allProducts) {
    if (p.id) productMap.set(p.id, p);
  }

  return Array.from(productMap.values());
}

function buildLookupMap(
  products: any[],
  dbField: string,
  normalizations: NormalizerRule[]
): Map<string, any[]> {
  const map = new Map<string, any[]>();

  for (const p of products) {
    const rawVal = p[dbField];
    if (rawVal === null || rawVal === undefined || rawVal === '') continue;

    const cleanedVal = String(rawVal).replace(/["'«»]/g, '').trim();
    const normVal = applyStringNormalizations(cleanedVal, normalizations);
    if (!normVal) continue;

    if (!map.has(normVal)) map.set(normVal, []);
    map.get(normVal)!.push(p);

    // Também indexar pelo valor original com trim para busca direta
    const rawTrimmed = String(rawVal).trim();
    if (rawTrimmed && rawTrimmed !== normVal) {
      if (!map.has(rawTrimmed)) map.set(rawTrimmed, []);
      if (!map.get(rawTrimmed)!.some((item) => item.id === p.id)) {
        map.get(rawTrimmed)!.push(p);
      }
    }
  }

  return map;
}

async function resolveCanonicalBrandName(supabase: any, brandId?: string): Promise<string> {
  if (!brandId || !brandId.trim()) return '';
  const trimmedId = brandId.trim();
  try {
    const { data: bData } = await supabase.from('brands').select('name').eq('id', trimmedId).maybeSingle();
    return bData?.name ? bData.name.trim() : '';
  } catch {
    return '';
  }
}

export async function getBrandUsersAction(brandId?: string): Promise<Array<{ id: string; full_name?: string; email?: string }>> {
  try {
    const { supabase, profile, isMaster } = await requireProductUpdateAccess();
    if (!brandId || !brandId.trim()) {
      return [];
    }

    const isGlobalScope = true;
    const queryClient = isMaster && isGlobalScope ? createAdminClient() : supabase;
    const canonicalBrandName = await resolveCanonicalBrandName(queryClient, brandId);
    if (!canonicalBrandName) return [];

    const { data: prods, error: prodErr } = await queryClient
      .from('products')
      .select('user_id')
      .ilike('brand', canonicalBrandName)
      .not('user_id', 'is', null);

    if (prodErr || !prods || prods.length === 0) return [];

    const rawUserIds = prods.map((p: any) => p.user_id).filter(Boolean);
    const userIds = Array.from(new Set(rawUserIds)) as string[];
    if (userIds.length === 0) return [];

    const { data: profilesData, error: profErr } = await queryClient
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);

    if (profErr || !profilesData) return [];
    return profilesData.map((pr: any) => ({
      id: pr.id,
      full_name: pr.full_name || '',
      email: pr.email || '',
    }));
  } catch (err: any) {
    console.error('Erro em getBrandUsersAction:', err);
    return [];
  }
}

async function calculateFileHash(arrayBuffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getDynamicProductSelectColumns(actions: EngineConfiguration['actions']): string {
  const actionCols = actions
    .map((act) => getFieldDefinition(act.targetLayer, act.targetField)?.column)
    .filter((col): col is string => Boolean(col));

  const baseCols = [
    'id',
    'reference_code',
    'reference_id',
    'sku',
    'barcode',
    'brand',
    'name',
    'color_nome',
    'price',
    'is_active',
    'is_launch',
    'colecao',
    'user_id',
    'organization_id',
    'company_id',
  ];

  return Array.from(new Set([...baseCols, ...actionCols])).join(', ');
}

function applyScopeToQuery(query: any, scope: EngineConfiguration['scope'], defaultOrgId?: string) {
  const scopeType = scope?.type || 'GLOBAL';
  const targetOrgs = scope?.targetOrganizationIds || scope?.targetCompanyIds || [];
  const targetUsers = scope?.targetUserIds || [];

  if (scopeType === 'PLATFORM_GLOBAL' || scopeType === 'GLOBAL') {
    return query;
  }

  if (scopeType === 'ORGANIZATION' || scopeType === 'COMPANY') {
    const orgId = targetOrgs[0] || defaultOrgId;
    if (orgId) {
      return query.or(`organization_id.eq.${orgId},company_id.eq.${orgId},user_id.eq.${orgId}`);
    }
  } else if (scopeType === 'ORGANIZATION_LIST') {
    if (targetOrgs.length > 0) {
      const listStr = targetOrgs.join(',');
      return query.or(`organization_id.in.(${listStr}),company_id.in.(${listStr}),user_id.in.(${listStr})`);
    }
  } else if (scopeType === 'USER' || scopeType === 'USER_AUTHORSHIP') {
    if (targetUsers.length > 0) {
      return query.in('user_id', targetUsers);
    }
  }
  return query;
}

export async function analyzeSpreadsheetAction(formData: FormData): Promise<AnalyzeSpreadsheetResult> {
  try {
    await requireProductUpdateAccess();

    const file = formData.get('file') as File | null;
    if (!file) return { fileName: '', fileHash: '', sheets: [], selectedSheet: '', columns: [], sampleRows: [], totalRows: 0, error: 'Nenhum arquivo enviado.' };

    const arrayBuffer = await file.arrayBuffer();
    const fileHash = await calculateFileHash(arrayBuffer);
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), {
      type: 'array',
      dense: true,
      cellFormula: false,
      cellHTML: false,
      cellStyles: false,
      sheetRows: 200, // Read only first 200 rows for high-speed analysis and header inspection
    });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return { fileName: file.name, fileHash, sheets: [], selectedSheet: '', columns: [], sampleRows: [], totalRows: 0, error: 'O arquivo Excel não contém abas válidas.' };
    }

    const selectedSheet = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[selectedSheet];
    const rawData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

    if (rawData.length === 0) {
      return { fileName: file.name, fileHash, sheets: workbook.SheetNames, selectedSheet, columns: [], sampleRows: [], totalRows: 0, error: 'A aba selecionada está vazia.' };
    }

    // Determine actual total row count from worksheet range if available
    let totalRows = rawData.length;
    if (worksheet && worksheet['!ref']) {
      try {
        const decoded = XLSX.utils.decode_range(worksheet['!ref']);
        if (decoded && typeof decoded.e?.r === 'number') {
          totalRows = Math.max(rawData.length, decoded.e.r);
        }
      } catch (e) {
        // fallback to rawData.length
      }
    }

    const headerKeys = Object.keys(rawData[0]);
    const columns: SpreadsheetColumn[] = headerKeys.map((key) => {
      const samples = rawData.slice(0, 5).map((row) => {
        const val = row[key];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return String(val);
        return val;
      });
      let inferredType: SpreadsheetColumn['inferredType'] = 'text';

      const nonNullSample = samples.find((s) => s !== null && s !== undefined && s !== '');
      if (typeof nonNullSample === 'boolean' || ['sim', 'não', 'true', 'false', 'ativo', 'inativo'].includes(String(nonNullSample).toLowerCase())) {
        inferredType = 'boolean';
      } else if (typeof nonNullSample === 'number') {
        inferredType = Number.isInteger(nonNullSample) ? 'integer' : 'currency';
      } else if (typeof nonNullSample === 'string' && (nonNullSample.includes('R$') || nonNullSample.includes(','))) {
        inferredType = 'currency';
      }

      return {
        name: key,
        inferredType,
        sampleValues: JSON.parse(JSON.stringify(samples)),
      };
    });

    const plainSampleRows = JSON.parse(JSON.stringify(rawData.slice(0, 10)));

    return {
      fileName: file.name,
      fileHash,
      sheets: JSON.parse(JSON.stringify(workbook.SheetNames)),
      selectedSheet,
      columns,
      sampleRows: plainSampleRows,
      totalRows,
    };
  } catch (err: any) {
    console.error('Erro em analyzeSpreadsheetAction:', err);
    return { fileName: '', fileHash: '', sheets: [], selectedSheet: '', columns: [], sampleRows: [], totalRows: 0, error: err.message || 'Erro ao analisar a planilha.' };
  }
}

export async function previewEngineAction(formData: FormData, configJsonStr: string): Promise<PreviewEngineResult> {
  try {
    const { supabase, profile, isMaster } = await requireProductUpdateAccess();
    const config: EngineConfiguration = JSON.parse(configJsonStr);

    validateCompanyAdminScope(profile, config.scope);

    const isGlobalScope = ['PLATFORM_GLOBAL', 'GLOBAL'].includes(config.scope?.type || 'GLOBAL');
    const queryClient = isMaster && isGlobalScope ? createAdminClient() : supabase;

    for (const act of config.actions) {
      const fieldDef = getFieldDefinition(act.targetLayer, act.targetField);
      if (!fieldDef) {
        return { totalRows: 0, matchedRows: 0, changedRows: 0, skippedRows: 0, notFoundRows: 0, criticalConfirmationRequired: false, sampleDetails: [], error: `O campo '${act.targetField}' na camada '${act.targetLayer}' não consta na Whitelist permitida.` };
      }
    }

    const { spreadsheetColumn, dbField, normalizations } = extractIdentifierConfig(config.identifier);

    const file = formData.get('file') as File | null;
    if (!file) return { totalRows: 0, matchedRows: 0, changedRows: 0, skippedRows: 0, notFoundRows: 0, criticalConfirmationRequired: false, sampleDetails: [], error: 'Arquivo ausente.' };

    const arrayBuffer = await file.arrayBuffer();
    const fileHash = await calculateFileHash(arrayBuffer);
    const configHash = computeConfigHash(config);

    const workbook = XLSX.read(new Uint8Array(arrayBuffer), {
      type: 'array',
      dense: true,
      cellFormula: false,
      cellHTML: false,
      cellStyles: false,
      cellDates: true,
    });
    const worksheet = workbook.Sheets[config.sheetName || workbook.SheetNames[0]];
    const rawData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

    const eligibleRawData = filterSpreadsheetRowsByBrand(rawData, config.brandScope, (config.identifier as any).mappings);
    const eligibleRows = eligibleRawData.length;

    const selectColumns = getDynamicProductSelectColumns(config.actions);

    // Debug probe for HER 0404/G ZI9
    try {
      const debugProbe = await queryClient
        .from('products')
        .select('id, reference_code, organization_id, user_id, brand')
        .eq('reference_code', 'HER 0404/G ZI9');

      console.log('[DEBUG SINGLE PRODUCT PROBE]', {
        error: debugProbe.error,
        count: debugProbe.data?.length,
        rows: debugProbe.data,
      });
    } catch (debugErr) {
      console.error('[DEBUG SINGLE PRODUCT PROBE EXCEPTION]', debugErr);
    }

    const rawSearchValues = eligibleRawData.map((row) => row[spreadsheetColumn]);
    const productsList = await fetchProductsByBatches(
      queryClient,
      dbField,
      rawSearchValues,
      selectColumns,
      config.userScope,
      normalizations
    );

    const lookupMap = buildLookupMap(productsList, dbField, normalizations);

    let matchedSpreadsheetRows = 0;
    let totalMatchedProducts = 0;
    let changedSpreadsheetRows = 0;
    let totalChangedProducts = 0;
    let totalNoChangeProducts = 0;
    let totalFieldsChangedCount = 0;
    let skippedFilterCount = 0;
    let notFoundCount = 0;
    let invalidCount = 0;
    let criticalFlag = false;

    const changedFieldsSummary: Record<string, number> = {};
    const affectedOrgsSet = new Set<string>();
    const changedSampleDetails: PreviewRowDetail[] = [];
    const noChangeSampleDetails: PreviewRowDetail[] = [];
    const unmatchedSampleDetails: PreviewRowDetail[] = [];

    for (let idx = 0; idx < eligibleRawData.length; idx++) {
      const row = eligibleRawData[idx];
      const rawVal = row[spreadsheetColumn];
      const normVal = applyStringNormalizations(rawVal, normalizations);

      if (!normVal) {
        invalidCount++;
        if (unmatchedSampleDetails.length < 50) {
          unmatchedSampleDetails.push({
            rowNumber: idx + 1,
            reference: String(rawVal || ''),
            lookupKey: normVal,
            rawIdentifierValues: { [spreadsheetColumn]: rawVal },
            normalizedIdentifierValues: { [dbField]: normVal },
            matchedProductsCount: 0,
            affectedOrganizationsCount: 0,
            changedCount: 0,
            noChangeCount: 0,
            ambiguousOrganizationsCount: 0,
            invalidReason: 'MISSING_REFERENCE',
            filterMatched: true,
            proposedChanges: [],
            status: 'INVALID_IDENTIFIER',
            message: 'Referência ausente ou vazia.',
          });
        }
        continue;
      }

      let passFilter = true;
      if (config.filters && config.filters.conditions && config.filters.conditions.length > 0) {
        const results = config.filters.conditions.map((cond) => evaluateFilterCondition(row[cond.column], cond.operator, cond.value));
        passFilter = config.filters.connective === 'OR' ? results.some(Boolean) : results.every(Boolean);
      }

      if (!passFilter) {
        skippedFilterCount++;
        if (unmatchedSampleDetails.length < 50) {
          unmatchedSampleDetails.push({
            rowNumber: idx + 1,
            reference: String(rawVal),
            lookupKey: normVal,
            rawIdentifierValues: { [spreadsheetColumn]: rawVal },
            normalizedIdentifierValues: { [dbField]: normVal },
            matchedProductsCount: 0,
            affectedOrganizationsCount: 0,
            changedCount: 0,
            noChangeCount: 0,
            ambiguousOrganizationsCount: 0,
            filterMatched: false,
            proposedChanges: [],
            status: 'SKIPPED_FILTER',
            message: 'Ignorado pelos critérios de filtro.',
          });
        }
        continue;
      }

      const allMatchedProds = lookupMap.get(normVal) || [];

      if (allMatchedProds.length === 0) {
        notFoundCount++;
        if (unmatchedSampleDetails.length < 50) {
          unmatchedSampleDetails.push({
            rowNumber: idx + 1,
            reference: String(rawVal),
            lookupKey: normVal,
            rawIdentifierValues: { [spreadsheetColumn]: rawVal },
            normalizedIdentifierValues: { [dbField]: normVal },
            matchedProductsCount: 0,
            totalUsersCount: 0,
            affectedUsersCount: 0,
            affectedOrganizationsCount: 0,
            changedCount: 0,
            noChangeCount: 0,
            ambiguousOrganizationsCount: 0,
            filterMatched: true,
            proposedChanges: [],
            status: 'NOT_FOUND',
            message: `Nenhum produto encontrado em ${dbField} com '${normVal}'.`,
          });
        }
        continue;
      }

      const totalUsersCount = new Set(allMatchedProds.map((p) => p.user_id).filter(Boolean)).size;

      // Filter candidate products by userScope
      let matchedProds = allMatchedProds;
      if (config.userScope?.mode === 'specific' && Array.isArray(config.userScope.targetUserIds) && config.userScope.targetUserIds.length > 0) {
        matchedProds = allMatchedProds.filter((p) => config.userScope!.targetUserIds!.includes(p.user_id));
      }

      if (matchedProds.length === 0) {
        notFoundCount++;
        if (unmatchedSampleDetails.length < 50) {
          unmatchedSampleDetails.push({
            rowNumber: idx + 1,
            reference: String(rawVal),
            lookupKey: normVal,
            rawIdentifierValues: { [spreadsheetColumn]: rawVal },
            normalizedIdentifierValues: { [dbField]: normVal },
            matchedProductsCount: 0,
            totalUsersCount,
            affectedUsersCount: 0,
            affectedOrganizationsCount: 0,
            changedCount: 0,
            noChangeCount: 0,
            ambiguousOrganizationsCount: 0,
            filterMatched: true,
            proposedChanges: [],
            status: 'NOT_FOUND',
            message: `Nenhum produto atende ao filtro de usuários selecionado.`,
          });
        }
        continue;
      }

      matchedSpreadsheetRows++;
      totalMatchedProducts += matchedProds.length;

      const affectedUsersCount = new Set(matchedProds.map((p) => p.user_id).filter(Boolean)).size;
      const orgProdsMap = new Map<string, any[]>();
      for (const p of matchedProds) {
        const orgId = p.organization_id || 'unknown';
        if (!orgProdsMap.has(orgId)) orgProdsMap.set(orgId, []);
        orgProdsMap.get(orgId)!.push(p);
        affectedOrgsSet.add(orgId);
      }

      let lineChangedCount = 0;
      let lineNoChangeCount = 0;
      const proposedList: any[] = [];
      const orgBreakdown: OrganizationPreviewItem[] = [];

      for (const prod of matchedProds) {
        const orgId = prod.organization_id || 'unknown';
        let prodHasChange = false;
        const prodChanges: any[] = [];

        for (const act of config.actions) {
          const fieldDef = getFieldDefinition(act.targetLayer, act.targetField);
          if (!fieldDef) continue;

          const currentDbVal = prod[fieldDef.column as keyof typeof prod];
          const valFromSpreadsheet = act.valueSource === 'fixed'
            ? act.fixedValue
            : (act.sourceColumn ? row[act.sourceColumn] : undefined);
          const newVal = computeStructuredOperation(currentDbVal, valFromSpreadsheet, act.operation, fieldDef.type);

          if (newVal === IGNORE_FIELD || newVal === 'INVALID_VALUE' || areValuesEqual(currentDbVal, newVal, fieldDef.type)) {
            continue;
          }

          prodHasChange = true;
          totalFieldsChangedCount++;
          changedFieldsSummary[act.targetField] = (changedFieldsSummary[act.targetField] || 0) + 1;

          const changeItem = {
            targetLayer: act.targetLayer,
            targetField: act.targetField,
            oldValue: currentDbVal,
            newValue: newVal,
            actionType: act.operation,
          };

          prodChanges.push(changeItem);
          proposedList.push(changeItem);
        }

        if (prodHasChange) {
          lineChangedCount++;
          totalChangedProducts++;
        } else {
          lineNoChangeCount++;
          totalNoChangeProducts++;
        }

        if (orgBreakdown.length < 20) {
          orgBreakdown.push({
            organizationId: orgId,
            productId: prod.id,
            productName: prod.name || prod.reference_code,
            status: prodHasChange ? 'READY' : 'NO_CHANGE',
            proposedChanges: prodChanges,
          });
        }
      }

      if (lineChangedCount > 0) {
        changedSpreadsheetRows++;
      }

      let rowStatus: PreviewStatus = 'READY';
      if (lineChangedCount > 0 && lineNoChangeCount > 0) {
        rowStatus = 'PARTIAL_CHANGE';
      } else if (lineChangedCount === 0 && lineNoChangeCount > 0) {
        rowStatus = 'NO_CHANGE';
      }

      const matchedDbValues = Array.from(
        new Set(
          matchedProds
            .map((p) => p[dbField])
            .filter((v) => v !== null && v !== undefined && v !== '')
            .map(String)
        )
      );

      const rowDetail: PreviewRowDetail = {
        rowNumber: idx + 1,
        reference: String(rawVal),
        lookupKey: normVal,
        rawIdentifierValues: { [spreadsheetColumn]: rawVal },
        normalizedIdentifierValues: { [dbField]: normVal },
        matchedProductId: matchedProds[0]?.id,
        matchedProductName: matchedProds[0]?.name || String(rawVal),
        matchedProductsCount: matchedProds.length,
        totalUsersCount,
        affectedUsersCount,
        affectedOrganizationsCount: orgProdsMap.size,
        matchedDbValues,
        changedCount: lineChangedCount,
        noChangeCount: lineNoChangeCount,
        ambiguousOrganizationsCount: 0,
        filterMatched: true,
        proposedChanges: proposedList,
        organizationBreakdown: orgBreakdown,
        status: rowStatus,
        message:
          rowStatus === 'READY'
            ? `${matchedProds.length} produto(s) em ${orgProdsMap.size} organização(ões).`
            : rowStatus === 'PARTIAL_CHANGE'
            ? `${lineChangedCount} a alterar, ${lineNoChangeCount} sem alteração.`
            : 'Produtos localizados já estão atualizados.',
      };

      if (proposedList.length > 0) {
        if (changedSampleDetails.length < 50) {
          changedSampleDetails.push(rowDetail);
        }
      } else {
        if (noChangeSampleDetails.length < 50) {
          noChangeSampleDetails.push(rowDetail);
        }
      }
    }

    if (changedSpreadsheetRows > rawData.length * 0.3) {
      criticalFlag = true;
    }

    // Prioritize rows WITH proposed changes in the sample, then unchanged rows, then unmatched rows
    const sampleDetails = [
      ...changedSampleDetails,
      ...noChangeSampleDetails.slice(0, Math.max(0, 50 - changedSampleDetails.length)),
      ...unmatchedSampleDetails.slice(0, Math.max(0, 50 - changedSampleDetails.length - noChangeSampleDetails.length)),
    ];

    return {
      fileHash,
      configHash,
      totalRows: rawData.length,
      eligibleRows,
      matchedRows: matchedSpreadsheetRows,
      matchedProducts: totalMatchedProducts,
      affectedOrganizations: affectedOrgsSet.size,
      changedRows: changedSpreadsheetRows,
      changedProducts: totalChangedProducts,
      changedFields: totalFieldsChangedCount,
      changedFieldsSummary,
      noChangeProducts: totalNoChangeProducts,
      skippedRows: skippedFilterCount,
      notFoundRows: notFoundCount,
      invalidRows: invalidCount,
      criticalConfirmationRequired: criticalFlag,
      criticalReason: criticalFlag ? 'Esta operação altera mais de 30% das linhas da planilha.' : undefined,
      sampleDetails: JSON.parse(JSON.stringify(sampleDetails)),
    };
  } catch (err: any) {
    console.error('Erro em previewEngineAction:', err);
    return { totalRows: 0, matchedRows: 0, changedRows: 0, skippedRows: 0, notFoundRows: 0, criticalConfirmationRequired: false, sampleDetails: [], error: err.message || 'Erro ao gerar a prévia.' };
  }
}

export async function createJobAction(
  fileName: string,
  sheetName: string,
  totalRows: number,
  configJsonStr: string,
  fileHash?: string,
  metrics?: Record<string, any>
): Promise<{ jobId?: string; error?: string }> {
  try {
    const { userId, supabase, profile } = await requireProductUpdateAccess();
    const config: EngineConfiguration = JSON.parse(configJsonStr);
    validateCompanyAdminScope(profile, config.scope);
    const configHash = computeConfigHash(config);
    config.configHash = configHash;

    const fullConfiguration = {
      ...config,
      metrics: metrics || {},
      previewGeneratedAt: new Date().toISOString(),
    };

    const { data: job, error: jobErr } = await supabase
      .from('product_update_jobs')
      .insert({
        file_name: fileName,
        file_hash: fileHash || '',
        sheet_name: sheetName,
        total_rows: totalRows,
        configuration: fullConfiguration as any,
        status: 'pending',
        created_by: userId,
      })
      .select('id')
      .single();

    if (jobErr) return { error: jobErr.message };
    return { jobId: job.id };
  } catch (err: any) {
    return { error: err.message || 'Erro ao criar job.' };
  }
}

export async function processBatchChunkAction(
  jobId: string,
  chunkRowIndex: number,
  chunkSize: number,
  formData: FormData
): Promise<{ processed: number; applied: number; skipped: number; failed: number; isCompleted: boolean; error?: string }> {
  try {
    const { userId, supabase, profile, isMaster } = await requireProductUpdateAccess();

    const { data: job, error: jobErr } = await supabase
      .from('product_update_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobErr || !job) {
      return { processed: 0, applied: 0, skipped: 0, failed: 0, isCompleted: false, error: 'Job não encontrado.' };
    }

    if (job.created_by !== userId && !['master', 'admin'].includes(profile.role)) {
      return { processed: 0, applied: 0, skipped: 0, failed: 0, isCompleted: false, error: 'Acesso negado.' };
    }

    const config: EngineConfiguration = job.configuration as any;
    validateCompanyAdminScope(profile, config.scope);

    const isGlobalScope = ['PLATFORM_GLOBAL', 'GLOBAL'].includes(config.scope?.type || 'GLOBAL');
    const queryClient = isMaster && isGlobalScope ? createAdminClient() : supabase;

    const file = formData.get('file') as File | null;
    if (!file) {
      return { processed: 0, applied: 0, skipped: 0, failed: 0, isCompleted: false, error: 'Arquivo não enviado.' };
    }

    const arrayBuffer = await file.arrayBuffer();
    const currentFileHash = await calculateFileHash(arrayBuffer);

    if (job.file_hash && currentFileHash !== job.file_hash) {
      return {
        processed: 0,
        applied: 0,
        skipped: 0,
        failed: 0,
        isCompleted: false,
        error: 'O arquivo enviado não corresponde ao arquivo aprovado na prévia.',
      };
    }

    const workbook = XLSX.read(new Uint8Array(arrayBuffer), {
      type: 'array',
      dense: true,
      cellFormula: false,
      cellHTML: false,
      cellStyles: false,
      cellDates: true,
    });
    const worksheet = workbook.Sheets[config.sheetName || workbook.SheetNames[0]];
    const rawData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

    const eligibleRawData = filterSpreadsheetRowsByBrand(rawData, config.brandScope, (config.identifier as any).mappings);

    const chunkData = eligibleRawData.slice(chunkRowIndex, chunkRowIndex + chunkSize);
    const isCompleted = chunkRowIndex + chunkSize >= eligibleRawData.length;

    if (chunkData.length === 0) {
      await queryClient.from('product_update_jobs').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', jobId);
      return { processed: 0, applied: 0, skipped: 0, failed: 0, isCompleted: true };
    }

    const { spreadsheetColumn, dbField, normalizations } = extractIdentifierConfig(config.identifier);
    const selectColumns = getDynamicProductSelectColumns(config.actions);

    const rawSearchValues = chunkData.map((row) => row[spreadsheetColumn]);
    const productsList = await fetchProductsByBatches(
      queryClient,
      dbField,
      rawSearchValues,
      selectColumns,
      config.userScope,
      normalizations
    );

    const lookupMap = buildLookupMap(productsList, dbField, normalizations);

    let skippedRows = 0;
    let noChangeCount = 0;
    const rpcRows: any[] = [];

    for (let idx = 0; idx < chunkData.length; idx++) {
      const row = chunkData[idx];
      const actualRowIndex = chunkRowIndex + idx + 1;

      let passFilter = true;
      if (config.filters && config.filters.conditions && config.filters.conditions.length > 0) {
        const results = config.filters.conditions.map((cond) => evaluateFilterCondition(row[cond.column], cond.operator, cond.value));
        passFilter = config.filters.connective === 'OR' ? results.some(Boolean) : results.every(Boolean);
      }

      if (!passFilter) {
        skippedRows++;
        continue;
      }

      const rawVal = row[spreadsheetColumn];
      const normVal = applyStringNormalizations(rawVal, normalizations);

      if (!normVal) {
        skippedRows++;
        continue;
      }

      const allMatchedProds = lookupMap.get(normVal) || [];

      let matchedProds = allMatchedProds;
      if (config.userScope?.mode === 'specific' && Array.isArray(config.userScope.targetUserIds) && config.userScope.targetUserIds.length > 0) {
        matchedProds = allMatchedProds.filter((p) => config.userScope!.targetUserIds!.includes(p.user_id));
      }

      if (matchedProds.length === 0) {
        skippedRows++;
        continue;
      }

      for (const matchedProd of matchedProds) {
        for (const act of config.actions) {
          const fieldDef = getFieldDefinition(act.targetLayer, act.targetField);
          if (!fieldDef) continue;

          const currentDbVal = matchedProd[fieldDef.column as keyof typeof matchedProd];
          const valFromSpreadsheet = act.valueSource === 'fixed'
            ? act.fixedValue
            : (act.sourceColumn ? row[act.sourceColumn] : undefined);
          const newVal = computeStructuredOperation(currentDbVal, valFromSpreadsheet, act.operation, fieldDef.type);

          if (newVal === IGNORE_FIELD || newVal === 'INVALID_VALUE' || areValuesEqual(currentDbVal, newVal, fieldDef.type)) {
            noChangeCount++;
            continue;
          }

          const { data: jobItem, error: itemErr } = await queryClient
            .from('product_update_job_items')
            .insert({
              job_id: jobId,
              row_number: actualRowIndex,
              product_id: matchedProd.id,
              company_id: matchedProd.company_id || matchedProd.organization_id,
              user_id: matchedProd.user_id,
              target_layer: act.targetLayer,
              target_table: fieldDef.table,
              target_record_id: matchedProd.id,
              target_field: fieldDef.column,
              old_value: currentDbVal as any,
              new_value: newVal as any,
              action_type: act.operation,
              status: 'pending',
            })
            .select('id')
            .single();

          if (itemErr || !jobItem) {
            console.error('[JOB ITEM INSERT ERROR]', itemErr);
            skippedRows++;
            continue;
          }

          const scopeType = config.scope?.type || 'GLOBAL';
          rpcRows.push({
            job_item_id: jobItem.id,
            product_id: matchedProd.id,
            target_table: fieldDef.table,
            target_field: fieldDef.column,
            target_type: fieldDef.type,
            old_value: currentDbVal,
            new_value: newVal,
            organization_id: matchedProd.organization_id || (scopeType === 'ORGANIZATION' ? matchedProd.company_id : undefined),
            company_id: matchedProd.company_id || (scopeType === 'COMPANY' ? matchedProd.organization_id : undefined),
            user_id: matchedProd.user_id,
          });
        }
      }
    }

    let applied = 0;
    let unchanged = 0;
    let conflicts = 0;
    let failed = 0;

    if (rpcRows.length > 0) {
      const { data: rpcResult, error: rpcError } = await queryClient.rpc('apply_product_update_batch', {
        p_job_id: jobId,
        p_rows: rpcRows,
      });

      if (rpcError) {
        console.error('RPC apply_product_update_batch error:', rpcError);
        const pendingIds = rpcRows.map((r) => r.job_item_id);
        await queryClient
          .from('product_update_job_items')
          .update({ status: 'failed', error_message: rpcError.message })
          .in('id', pendingIds);
        await queryClient.from('product_update_jobs').update({ status: 'failed', error_message: rpcError.message, completed_at: new Date().toISOString() }).eq('id', jobId);
        return { processed: chunkData.length, applied: 0, skipped: 0, failed: rpcRows.length, isCompleted: true, error: rpcError.message };
      }

      applied = rpcResult?.applied || 0;
      unchanged = rpcResult?.unchanged || 0;
      conflicts = rpcResult?.conflicts || 0;
      failed = rpcResult?.failed || 0;

      // Fallback de resiliência para campos da whitelist (ex: reference_id em bancos que ainda não rodaram a nova migration)
      if (failed > 0) {
        const { data: failedItems } = await queryClient
          .from('product_update_job_items')
          .select('id, product_id, target_field, new_value')
          .eq('job_id', jobId)
          .eq('status', 'failed')
          .ilike('error_message', '%whitelist%');

        if (failedItems && failedItems.length > 0) {
          for (const item of failedItems) {
            const field = String(item.target_field).trim();
            const { error: directErr } = await queryClient
              .from('products')
              .update({ [field]: item.new_value, updated_at: new Date().toISOString() })
              .eq('id', item.product_id);

            if (!directErr) {
              await queryClient
                .from('product_update_job_items')
                .update({ status: 'applied', applied_at: new Date().toISOString(), error_message: null })
                .eq('id', item.id);
              applied++;
              failed = Math.max(0, failed - 1);
            }
          }
        }
      }
    }

    if (isCompleted) {
      const totalErrors = conflicts + failed;
      const status = totalErrors > 0 ? (applied > 0 ? 'partially_completed' : 'failed') : 'completed';
      await queryClient
        .from('product_update_jobs')
        .update({ status, completed_at: new Date().toISOString() })
        .eq('id', jobId);
    }

    const skipped = skippedRows + noChangeCount + unchanged;
    return { processed: chunkData.length, applied, skipped, failed: conflicts + failed, isCompleted };
  } catch (err: any) {
    console.error('Erro em processBatchChunkAction:', err);
    return { processed: 0, applied: 0, skipped: 0, failed: 0, isCompleted: false, error: err.message || 'Erro no lote.' };
  }
}

export async function rollbackJobAction(jobId: string): Promise<{ success: boolean; rolledBack: number; conflicts: number; errors: string[] }> {
  try {
    const { userId, supabase, profile, isMaster } = await requireProductUpdateAccess();

    const { data: job } = await supabase.from('product_update_jobs').select('*').eq('id', jobId).single();
    if (!job) return { success: false, rolledBack: 0, conflicts: 0, errors: ['Job não encontrado.'] };
    if (job.created_by !== userId && !['master', 'admin'].includes(profile.role)) {
      return { success: false, rolledBack: 0, conflicts: 0, errors: ['Acesso negado. Se você não é o criador deste job, não pode desfazê-lo.'] };
    }

    const config: EngineConfiguration = job.configuration as any;
    validateCompanyAdminScope(profile, config.scope);

    const isGlobalScope = ['PLATFORM_GLOBAL', 'GLOBAL'].includes(config.scope?.type || 'GLOBAL');
    const queryClient = isMaster && isGlobalScope ? createAdminClient() : supabase;

    // Fetch only applied items that have not been rolled back yet
    const { data: items } = await queryClient
      .from('product_update_job_items')
      .select('id')
      .eq('job_id', jobId)
      .eq('status', 'applied')
      .is('rollback_status', null);

    if (!items || items.length === 0) {
      return { success: true, rolledBack: 0, conflicts: 0, errors: ['Nenhum item elegível para rollback.'] };
    }

    const itemIds = items.map((i: any) => i.id);
    let rolledBack = 0;
    let conflicts = 0;
    const errors: string[] = [];

    const BATCH_SIZE = 200;
    for (let i = 0; i < itemIds.length; i += BATCH_SIZE) {
      const batchIds = itemIds.slice(i, i + BATCH_SIZE);

      const { data: rpcResult, error: rpcError } = await queryClient.rpc('rollback_product_update_batch', {
        p_job_id: jobId,
        p_item_ids: batchIds,
      });

      if (rpcError) {
        console.error('RPC rollback_product_update_batch error:', rpcError);
        errors.push(`Falha no lote de rollback ${i / BATCH_SIZE + 1}: ${rpcError.message}`);
        continue;
      }

      rolledBack += rpcResult?.restored || 0;
      conflicts += rpcResult?.conflicts || 0;
      if ((rpcResult?.failed || 0) > 0) {
        errors.push(`${rpcResult.failed} itens falharam no rollback do lote ${i / BATCH_SIZE + 1}.`);
      }
    }

    return { success: true, rolledBack, conflicts, errors };
  } catch (err: any) {
    return { success: false, rolledBack: 0, conflicts: 0, errors: [err.message || 'Erro ao executar rollback.'] };
  }
}

export async function getJobsHistoryAction(): Promise<{ success: boolean; jobs?: any[]; error?: string }> {
  try {
    const { supabase } = await requireProductUpdateAdmin();

    const { data: jobs, error } = await supabase
      .from('product_update_jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };

    return { success: true, jobs: jobs || [] };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao listar histórico.' };
  }
}

export async function getJobDetailsAction(jobId: string): Promise<{ success: boolean; job?: any; items?: any[]; error?: string }> {
  try {
    const { supabase } = await requireProductUpdateAdmin();

    const { data: job, error: jobErr } = await supabase
      .from('product_update_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobErr || !job) return { success: false, error: jobErr?.message || 'Job não encontrado.' };

    const { data: items, error: itemsErr } = await supabase
      .from('product_update_job_items')
      .select('*, products(reference_code, name, brand, colecao)')
      .eq('job_id', jobId)
      .order('row_number', { ascending: true });

    if (itemsErr) return { success: false, error: itemsErr.message };

    return { success: true, job, items: items || [] };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao carregar detalhes do job.' };
  }
}

export async function getExecutiveDashboardStatsAction(): Promise<{
  success: boolean;
  kpis?: {
    totalProducts: number;
    activeProducts: number;
    inactiveProducts: number;
    averagePrice: number;
    totalStockQuantity: number;
    totalJobsExecuted: number;
    completedJobs: number;
    rolledBackJobs: number;
    recentJobs: any[];
  };
  error?: string;
}> {
  try {
    const { supabase } = await requireProductUpdateAdmin();

    const { data: prods } = await supabase
      .from('products')
      .select('id, is_active, price, stock');

    const products = prods || [];
    const totalProducts = products.length;
    const activeProducts = products.filter((p: any) => p.is_active !== false).length;
    const inactiveProducts = totalProducts - activeProducts;

    const prices = products.map((p: any) => Number(p.price) || 0).filter((p: number) => p > 0);
    const averagePrice = prices.length > 0 ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length : 0;
    const totalStockQuantity = products.reduce((acc: number, p: any) => acc + (Number(p.stock) || 0), 0);

    const { data: jobs } = await supabase
      .from('product_update_jobs')
      .select('*')
      .order('created_at', { ascending: false });

    const allJobs = jobs || [];
    const totalJobsExecuted = allJobs.length;
    const completedJobs = allJobs.filter((j: any) => j.status === 'completed').length;
    const rolledBackJobs = allJobs.filter((j: any) => j.status === 'rolled_back' || j.status === 'partially_rolled_back').length;

    return {
      success: true,
      kpis: {
        totalProducts,
        activeProducts,
        inactiveProducts,
        averagePrice,
        totalStockQuantity,
        totalJobsExecuted,
        completedJobs,
        rolledBackJobs,
        recentJobs: allJobs.slice(0, 5),
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao carregar estatísticas do dashboard.' };
  }
}

export async function getJobFailuresAction(jobId: string): Promise<{
  rowNumber: number;
  productId: string;
  targetField: string;
  oldValue: any;
  newValue: any;
  errorMessage: string;
  status: string;
}[]> {
  try {
    const { supabase } = await requireProductUpdateAccess();
    const { data, error } = await supabase
      .from('product_update_job_items')
      .select('row_number, product_id, target_field, old_value, new_value, error_message, status')
      .eq('job_id', jobId)
      .in('status', ['failed', 'conflict'])
      .order('row_number', { ascending: true })
      .limit(100);

    if (error || !data) return [];
    return data.map((item: any) => ({
      rowNumber: item.row_number,
      productId: item.product_id,
      targetField: item.target_field,
      oldValue: item.old_value,
      newValue: item.new_value,
      errorMessage: item.error_message || (item.status === 'conflict' ? 'Conflito de concorrência com o valor atual do banco' : 'Falha ao aplicar atualização'),
      status: item.status,
    }));
  } catch (err) {
    console.error('Erro em getJobFailuresAction:', err);
    return [];
  }
}
