'use server';

import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/server';
import { isAdminRole } from '@/lib/auth/roles';
import { getActiveUserId } from '@/lib/auth-utils';
import { getFieldDefinition } from '../domain/field-registry';
import { validateLayerScopeCompatibility } from '../domain/layer-scope-matrix';
import {
  AnalyzeSpreadsheetResult,
  EngineConfiguration,
  PreviewEngineResult,
  PreviewRowDetail,
  SpreadsheetColumn,
} from '../domain/types';
import {
  applyStringNormalizations,
  computeStructuredOperation,
  evaluateFilterCondition,
  computeConfigHash,
  buildProductLookupKey,
  normalizeLookupValue,
} from './parser-utils';

async function requireProductUpdateMaster() {
  const userId = await getActiveUserId();
  if (!userId) {
    throw new Error('Usuário não autenticado.');
  }

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, role, organization_id')
    .eq('id', userId)
    .maybeSingle();

  if (error || !profile || profile.role !== 'master') {
    throw new Error('Acesso negado. Apenas o usuário master da Torre de Controle pode executar atualizações de plataforma.');
  }

  return { userId, supabase, profile };
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
    'brand',
    'name',
    'color_nome',
    'price',
    'stock',
    'is_active',
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
    return query.not('organization_id', 'is', null);
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
    await requireProductUpdateMaster();

    const file = formData.get('file') as File | null;
    if (!file) return { fileName: '', fileHash: '', sheets: [], selectedSheet: '', columns: [], sampleRows: [], totalRows: 0, error: 'Nenhum arquivo enviado.' };

    const arrayBuffer = await file.arrayBuffer();
    const fileHash = await calculateFileHash(arrayBuffer);
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return { fileName: file.name, fileHash, sheets: [], selectedSheet: '', columns: [], sampleRows: [], totalRows: 0, error: 'O arquivo Excel não contém abas válidas.' };
    }

    const selectedSheet = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[selectedSheet];
    const rawData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (rawData.length === 0) {
      return { fileName: file.name, fileHash, sheets: workbook.SheetNames, selectedSheet, columns: [], sampleRows: [], totalRows: 0, error: 'A aba selecionada está vazia.' };
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
      totalRows: rawData.length,
    };
  } catch (err: any) {
    console.error('Erro em analyzeSpreadsheetAction:', err);
    return { fileName: '', fileHash: '', sheets: [], selectedSheet: '', columns: [], sampleRows: [], totalRows: 0, error: err.message || 'Erro ao analisar a planilha.' };
  }
}

export async function previewEngineAction(formData: FormData, configJsonStr: string): Promise<PreviewEngineResult> {
  try {
    const { supabase } = await requireProductUpdateMaster();
    const config: EngineConfiguration = JSON.parse(configJsonStr);

    if (config.scope.type !== 'PLATFORM_GLOBAL') {
      return { totalRows: 0, matchedRows: 0, changedRows: 0, skippedRows: 0, notFoundRows: 0, criticalConfirmationRequired: false, sampleDetails: [], error: 'A Atualização Inteligente da Torre de Controle exige escopo PLATFORM_GLOBAL.' };
    }

    for (const act of config.actions) {
      const fieldDef = getFieldDefinition(act.targetLayer, act.targetField);
      if (!fieldDef) {
        return { totalRows: 0, matchedRows: 0, changedRows: 0, skippedRows: 0, notFoundRows: 0, criticalConfirmationRequired: false, sampleDetails: [], error: `O campo '${act.targetField}' na camada '${act.targetLayer}' não consta na Whitelist permitida.` };
      }
      const compat = validateLayerScopeCompatibility(act.targetLayer, config.scope);
      if (!compat.valid) {
        return { totalRows: 0, matchedRows: 0, changedRows: 0, skippedRows: 0, notFoundRows: 0, criticalConfirmationRequired: false, sampleDetails: [], error: compat.reason };
      }
    }

    const brandMapping = config.identifier.mappings.find((m) => m.dbField === 'brand');
    const refMapping = config.identifier.mappings.find((m) => m.dbField === 'reference_code');

    if (!brandMapping || !refMapping) {
      return {
        totalRows: 0,
        matchedRows: 0,
        changedRows: 0,
        skippedRows: 0,
        notFoundRows: 0,
        criticalConfirmationRequired: false,
        sampleDetails: [],
        error: 'No modo de atualização PLATFORM_GLOBAL, é obrigatório mapear a Marca e a Referência.',
      };
    }

    const file = formData.get('file') as File | null;
    if (!file) return { totalRows: 0, matchedRows: 0, changedRows: 0, skippedRows: 0, notFoundRows: 0, criticalConfirmationRequired: false, sampleDetails: [], error: 'Arquivo ausente.' };

    const arrayBuffer = await file.arrayBuffer();
    const fileHash = await calculateFileHash(arrayBuffer);
    const configHash = computeConfigHash(config);

    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    const worksheet = workbook.Sheets[config.sheetName || workbook.SheetNames[0]];
    const rawData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    const selectColumns = getDynamicProductSelectColumns(config.actions);

    let productsList: any[] = [];
    let pageIndex = 0;
    const PAGE_LIMIT = 1000;
    let keepFetching = true;

    while (keepFetching) {
      let query = supabase
        .from('products')
        .select(selectColumns)
        .not('organization_id', 'is', null)
        .order('id', { ascending: true })
        .range(pageIndex * PAGE_LIMIT, (pageIndex + 1) * PAGE_LIMIT - 1);

      const { data: pageData, error: pageErr } = await (query as any);

      if (pageErr || !pageData || pageData.length === 0) {
        keepFetching = false;
        break;
      }
      productsList = productsList.concat(pageData);
      if (pageData.length < PAGE_LIMIT) {
        keepFetching = false;
      }
      pageIndex++;
    }

    const lookupMap = new Map<string, any[]>();
    for (const p of productsList) {
      const key = buildProductLookupKey(p.brand, p.reference_code);
      if (key) {
        if (!lookupMap.has(key)) lookupMap.set(key, []);
        lookupMap.get(key)!.push(p);
      }
    }

    let matchedSpreadsheetRows = 0;
    let totalMatchedProducts = 0;
    let changedSpreadsheetRows = 0;
    let totalChangedProducts = 0;
    let totalNoChangeProducts = 0;
    let totalFieldsChangedCount = 0;
    let skippedFilterCount = 0;
    let notFoundCount = 0;
    let invalidCount = 0;
    let ambiguousOrgRowsCount = 0;
    let criticalFlag = false;

    const affectedOrgsSet = new Set<string>();
    const brandsSet = new Set<string>();
    const brandStatsMap = new Map<string, { brand: string; refCount: number; matchedCount: number; orgsSet: Set<string>; changedCount: number }>();

    const sampleDetails: PreviewRowDetail[] = [];

    for (let idx = 0; idx < rawData.length; idx++) {
      const row = rawData[idx];
      const rawIdentValues: Record<string, any> = {};
      const normIdentValues: Record<string, string> = {};

      for (const m of config.identifier.mappings) {
        const val = row[m.spreadsheetColumn];
        rawIdentValues[m.spreadsheetColumn] = val;
        normIdentValues[m.dbField] = applyStringNormalizations(val, config.identifier.normalizations);
      }

      const rawBrand = row[brandMapping.spreadsheetColumn];
      const rawRef = row[refMapping.spreadsheetColumn];
      const normBrand = normalizeLookupValue(rawBrand);
      const normRef = normalizeLookupValue(rawRef);

      if (!normBrand || !normRef) {
        invalidCount++;
        let invalidReason: PreviewRowDetail['invalidReason'] = 'MISSING_BRAND_AND_REFERENCE';
        if (!normBrand && normRef) invalidReason = 'MISSING_BRAND';
        if (normBrand && !normRef) invalidReason = 'MISSING_REFERENCE';

        if (sampleDetails.length < 50) {
          sampleDetails.push({
            rowNumber: idx + 1,
            brand: String(rawBrand || ''),
            reference: String(rawRef || ''),
            lookupKey: '',
            rawIdentifierValues: rawIdentValues,
            normalizedIdentifierValues: normIdentValues,
            matchedProductsCount: 0,
            affectedOrganizationsCount: 0,
            changedCount: 0,
            noChangeCount: 0,
            ambiguousOrganizationsCount: 0,
            invalidReason,
            filterMatched: true,
            proposedChanges: [],
            status: 'INVALID_IDENTIFIER',
            message:
              invalidReason === 'MISSING_BRAND_AND_REFERENCE'
                ? 'Marca e referência ausentes'
                : invalidReason === 'MISSING_BRAND'
                ? 'Marca ausente'
                : 'Referência ausente',
          });
        }
        continue;
      }

      const lookupKey = `${normBrand}|${normRef}`;
      brandsSet.add(rawBrand);

      if (!brandStatsMap.has(normBrand)) {
        brandStatsMap.set(normBrand, {
          brand: String(rawBrand).trim(),
          refCount: 0,
          matchedCount: 0,
          orgsSet: new Set<string>(),
          changedCount: 0,
        });
      }
      const bStat = brandStatsMap.get(normBrand)!;
      bStat.refCount++;

      let passFilter = true;
      if (config.filters && config.filters.conditions && config.filters.conditions.length > 0) {
        const results = config.filters.conditions.map((cond) => evaluateFilterCondition(row[cond.column], cond.operator, cond.value));
        passFilter = config.filters.connective === 'OR' ? results.some(Boolean) : results.every(Boolean);
      }

      if (!passFilter) {
        skippedFilterCount++;
        if (sampleDetails.length < 50) {
          sampleDetails.push({
            rowNumber: idx + 1,
            brand: String(rawBrand),
            reference: String(rawRef),
            lookupKey,
            rawIdentifierValues: rawIdentValues,
            normalizedIdentifierValues: normIdentValues,
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

      const allMatchedProds = lookupMap.get(lookupKey) || [];

      if (allMatchedProds.length === 0) {
        notFoundCount++;
        if (sampleDetails.length < 50) {
          sampleDetails.push({
            rowNumber: idx + 1,
            brand: String(rawBrand),
            reference: String(rawRef),
            lookupKey,
            rawIdentifierValues: rawIdentValues,
            normalizedIdentifierValues: normIdentValues,
            matchedProductsCount: 0,
            affectedOrganizationsCount: 0,
            changedCount: 0,
            noChangeCount: 0,
            ambiguousOrganizationsCount: 0,
            filterMatched: true,
            proposedChanges: [],
            status: 'NOT_FOUND',
            message: 'Nenhum produto global encontrado para a chave.',
          });
        }
        continue;
      }

      const orgProdsMap = new Map<string, any[]>();
      for (const p of allMatchedProds) {
        const orgId = p.organization_id || 'unknown';
        if (!orgProdsMap.has(orgId)) orgProdsMap.set(orgId, []);
        orgProdsMap.get(orgId)!.push(p);
      }

      const validOrgProds: any[] = [];
      let ambiguousOrgsCount = 0;

      for (const [orgId, prods] of orgProdsMap.entries()) {
        if (prods.length > 1) {
          ambiguousOrgsCount++;
        } else {
          validOrgProds.push(prods[0]);
        }
      }

      if (validOrgProds.length === 0 && ambiguousOrgsCount > 0) {
        ambiguousOrgRowsCount++;
        if (sampleDetails.length < 50) {
          sampleDetails.push({
            rowNumber: idx + 1,
            brand: String(rawBrand),
            reference: String(rawRef),
            lookupKey,
            rawIdentifierValues: rawIdentValues,
            normalizedIdentifierValues: normIdentValues,
            matchedProductsCount: allMatchedProds.length,
            affectedOrganizationsCount: orgProdsMap.size,
            changedCount: 0,
            noChangeCount: 0,
            ambiguousOrganizationsCount: ambiguousOrgsCount,
            filterMatched: true,
            proposedChanges: [],
            status: 'AMBIGUOUS_IN_ORGANIZATION',
            message: 'Todas as organizações encontradas possuem duplicidade interna do produto.',
          });
        }
        continue;
      }

      matchedSpreadsheetRows++;
      totalMatchedProducts += validOrgProds.length;
      bStat.matchedCount += validOrgProds.length;

      const proposedList: PreviewRowDetail['proposedChanges'] = [];
      const orgBreakdown: PreviewRowDetail['organizationBreakdown'] = [];

      let lineChangedCount = 0;
      let lineNoChangeCount = 0;

      for (const prod of validOrgProds) {
        const orgId = prod.organization_id || 'unknown';
        affectedOrgsSet.add(orgId);
        bStat.orgsSet.add(orgId);

        const prodChanges: OrganizationPreviewItem['proposedChanges'] = [];
        let prodHasChange = false;

        for (const act of config.actions) {
          const fieldDef = getFieldDefinition(act.targetLayer, act.targetField)!;
          const currentDbVal = prod[fieldDef.column as keyof typeof prod];
          const valFromSpreadsheet = act.sourceColumn ? row[act.sourceColumn] : act.fixedValue;
          const newVal = computeStructuredOperation(currentDbVal, valFromSpreadsheet, act.operation, fieldDef.type);

          if (newVal !== currentDbVal) {
            prodHasChange = true;
            totalFieldsChangedCount++;

            if (fieldDef.critical || act.operation === 'percentage_decrease' || (act.targetField === 'is_active' && newVal === false)) {
              criticalFlag = true;
            }

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
        }

        if (prodHasChange) {
          lineChangedCount++;
          totalChangedProducts++;
          bStat.changedCount++;
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
      if (ambiguousOrgsCount > 0) {
        rowStatus = 'PARTIAL_AMBIGUITY';
      } else if (lineChangedCount > 0 && lineNoChangeCount > 0) {
        rowStatus = 'PARTIAL_CHANGE';
      } else if (lineChangedCount === 0 && lineNoChangeCount > 0) {
        rowStatus = 'NO_CHANGE';
      }

      if (sampleDetails.length < 50) {
        sampleDetails.push({
          rowNumber: idx + 1,
          brand: String(rawBrand),
          reference: String(rawRef),
          lookupKey,
          rawIdentifierValues: rawIdentValues,
          normalizedIdentifierValues: normIdentValues,
          matchedProductId: validOrgProds[0]?.id,
          matchedProductName: `${String(rawBrand)} / ${String(rawRef)}`,
          matchedProductsCount: validOrgProds.length,
          affectedOrganizationsCount: orgProdsMap.size,
          changedCount: lineChangedCount,
          noChangeCount: lineNoChangeCount,
          ambiguousOrganizationsCount: ambiguousOrgsCount,
          filterMatched: true,
          proposedChanges: proposedList,
          organizationBreakdown: orgBreakdown,
          status: rowStatus,
          message:
            rowStatus === 'READY'
              ? `${validOrgProds.length} produto(s) em ${orgProdsMap.size} organização(ões).`
              : rowStatus === 'PARTIAL_CHANGE'
              ? `${lineChangedCount} produto(s) a alterar, ${lineNoChangeCount} sem alteração.`
              : rowStatus === 'PARTIAL_AMBIGUITY'
              ? `${validOrgProds.length} produto(s) válidos (${ambiguousOrgsCount} orgs ambíguas ignoradas).`
              : 'Produtos localizados já estão atualizados.',
        });
      }
    }

    if (changedSpreadsheetRows > rawData.length * 0.3) {
      criticalFlag = true;
    }

    const brandBreakdownStats = Array.from(brandStatsMap.values()).map((b) => ({
      brand: b.brand,
      referenceCount: b.refCount,
      matchedProductsCount: b.matchedCount,
      affectedOrganizationsCount: b.orgsSet.size,
      changedProductsCount: b.changedCount,
    }));

    return {
      fileHash,
      configHash,
      totalRows: rawData.length,
      matchedRows: matchedSpreadsheetRows,
      matchedProducts: totalMatchedProducts,
      affectedOrganizations: affectedOrgsSet.size,
      changedRows: changedSpreadsheetRows,
      changedProducts: totalChangedProducts,
      changedFields: totalFieldsChangedCount,
      noChangeProducts: totalNoChangeProducts,
      skippedRows: skippedFilterCount,
      notFoundRows: notFoundCount,
      invalidRows: invalidCount,
      ambiguousOrganizationsRows: ambiguousOrgRowsCount,
      brandsIncluded: Array.from(brandsSet),
      brandBreakdown: brandBreakdownStats,
      criticalConfirmationRequired: criticalFlag,
      criticalReason: criticalFlag ? 'Esta operação altera dados críticos ou mais de 30% das linhas da planilha.' : undefined,
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
    const { userId, supabase } = await requireProductUpdateMaster();
    const config: EngineConfiguration = JSON.parse(configJsonStr);
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
    const { userId, supabase, profile } = await requireProductUpdateMaster();

    const { data: job, error: jobErr } = await supabase
      .from('product_update_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobErr || !job) {
      return { processed: 0, applied: 0, skipped: 0, failed: 0, isCompleted: false, error: 'Job não encontrado.' };
    }

    if (job.created_by !== userId && profile.role !== 'master') {
      return { processed: 0, applied: 0, skipped: 0, failed: 0, isCompleted: false, error: 'Acesso negado. Apenas o criador ou admin master pode executar este job.' };
    }

    const config: EngineConfiguration = job.configuration as any;
    if (config.scope.type !== 'PLATFORM_GLOBAL') {
      return { processed: 0, applied: 0, skipped: 0, failed: 0, isCompleted: false, error: 'Apenas escopo PLATFORM_GLOBAL é permitido nesta ação.' };
    }

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

    const expectedConfigHash = computeConfigHash(config);
    if (config.configHash && expectedConfigHash !== config.configHash) {
      return {
        processed: 0,
        applied: 0,
        skipped: 0,
        failed: 0,
        isCompleted: false,
        error: 'A configuração do job divergiu da prévia aprovada.',
      };
    }

    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    const worksheet = workbook.Sheets[config.sheetName || workbook.SheetNames[0]];
    const rawData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    const chunkData = rawData.slice(chunkRowIndex, chunkRowIndex + chunkSize);
    if (chunkData.length === 0) {
      await supabase.from('product_update_jobs').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', jobId);
      return { processed: 0, applied: 0, skipped: 0, failed: 0, isCompleted: true };
    }

    const brandMapping = config.identifier.mappings.find((m) => m.dbField === 'brand');
    const refMapping = config.identifier.mappings.find((m) => m.dbField === 'reference_code');

    if (!brandMapping || !refMapping) {
      return { processed: 0, applied: 0, skipped: 0, failed: 0, isCompleted: false, error: 'Mapeamento de marca e referência ausente.' };
    }

    const selectColumns = getDynamicProductSelectColumns(config.actions);

    let productsList: any[] = [];
    let pageIndex = 0;
    const PAGE_LIMIT = 1000;
    let keepFetching = true;

    while (keepFetching) {
      const { data: pageData, error: pageErr } = await supabase
        .from('products')
        .select(selectColumns)
        .not('organization_id', 'is', null)
        .order('id', { ascending: true })
        .range(pageIndex * PAGE_LIMIT, (pageIndex + 1) * PAGE_LIMIT - 1);

      if (pageErr || !pageData || pageData.length === 0) {
        keepFetching = false;
        break;
      }
      productsList = productsList.concat(pageData);
      if (pageData.length < PAGE_LIMIT) keepFetching = false;
      pageIndex++;
    }

    const lookupMap = new Map<string, any[]>();
    for (const p of productsList) {
      const key = buildProductLookupKey(p.brand, p.reference_code);
      if (key) {
        if (!lookupMap.has(key)) lookupMap.set(key, []);
        lookupMap.get(key)!.push(p);
      }
    }

    let applied = 0;
    let skipped = 0;
    let failed = 0;

    for (let idx = 0; idx < chunkData.length; idx++) {
      const row = chunkData[idx];
      const actualRowIndex = chunkRowIndex + idx + 1;

      let passFilter = true;
      if (config.filters && config.filters.conditions && config.filters.conditions.length > 0) {
        const results = config.filters.conditions.map((cond) => evaluateFilterCondition(row[cond.column], cond.operator, cond.value));
        passFilter = config.filters.connective === 'OR' ? results.some(Boolean) : results.every(Boolean);
      }

      if (!passFilter) {
        skipped++;
        continue;
      }

      const rawBrand = row[brandMapping.spreadsheetColumn];
      const rawRef = row[refMapping.spreadsheetColumn];
      const lookupKey = buildProductLookupKey(rawBrand, rawRef);

      if (!lookupKey) {
        failed++;
        continue;
      }

      const allMatched = lookupMap.get(lookupKey) || [];
      if (allMatched.length === 0) {
        skipped++;
        continue;
      }

      const orgProdsMap = new Map<string, any[]>();
      for (const p of allMatched) {
        const orgId = p.organization_id || 'unknown';
        if (!orgProdsMap.has(orgId)) orgProdsMap.set(orgId, []);
        orgProdsMap.get(orgId)!.push(p);
      }

      const validProds: any[] = [];
      for (const [_, prods] of orgProdsMap.entries()) {
        if (prods.length === 1) {
          validProds.push(prods[0]);
        }
      }

      if (validProds.length === 0) {
        skipped++;
        continue;
      }

      for (const matchedProd of validProds) {
        for (const act of config.actions) {
          const fieldDef = getFieldDefinition(act.targetLayer, act.targetField);
          if (!fieldDef) continue;

          const currentDbVal = matchedProd[fieldDef.column as keyof typeof matchedProd];
          const valFromSpreadsheet = act.sourceColumn ? row[act.sourceColumn] : act.fixedValue;
          const newVal = computeStructuredOperation(currentDbVal, valFromSpreadsheet, act.operation, fieldDef.type);

          if (newVal !== currentDbVal) {
            const { error: updateErr } = await supabase
              .from(fieldDef.table as any)
              .update({ [fieldDef.column]: newVal })
              .eq('id', matchedProd.id);

            if (updateErr) {
              failed++;
              await supabase.from('product_update_job_items').insert({
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
                status: 'failed',
                error_message: updateErr.message,
              });
            } else {
              applied++;
              await supabase.from('product_update_job_items').insert({
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
                status: 'applied',
                applied_at: new Date().toISOString(),
              });
            }
          } else {
            skipped++;
          }
        }
      }
    }

    const isCompleted = chunkRowIndex + chunkSize >= rawData.length;
    await supabase
      .from('product_update_jobs')
      .update({
        status: isCompleted ? 'completed' : 'processing',
        changed_rows: (job.changed_rows || 0) + applied,
        failed_rows: (job.failed_rows || 0) + failed,
        completed_at: isCompleted ? new Date().toISOString() : null,
      })
      .eq('id', jobId);

    return { processed: chunkData.length, applied, skipped, failed, isCompleted };
  } catch (err: any) {
    console.error('Erro em processBatchChunkAction:', err);
    return { processed: 0, applied: 0, skipped: 0, failed: 0, isCompleted: false, error: err.message || 'Erro no lote.' };
  }
}

export async function rollbackJobAction(jobId: string): Promise<{ success: boolean; rolledBack: number; conflicts: number; errors: string[] }> {
  try {
    const { userId, supabase, profile } = await requireProductUpdateMaster();

    const { data: job } = await supabase.from('product_update_jobs').select('*').eq('id', jobId).single();
    if (!job) return { success: false, rolledBack: 0, conflicts: 0, errors: ['Job não encontrado.'] };
    if (job.created_by !== userId && profile.role !== 'master') {
      return { success: false, rolledBack: 0, conflicts: 0, errors: ['Acesso negado. Se você não é o criador deste job, não pode desfazê-lo.'] };
    }

    const { data: items } = await supabase
      .from('product_update_job_items')
      .select('*')
      .eq('job_id', jobId)
      .eq('status', 'applied');

    if (!items || items.length === 0) {
      return { success: true, rolledBack: 0, conflicts: 0, errors: ['Nenhum item elegível para rollback.'] };
    }

    let rolledBack = 0;
    let conflicts = 0;
    const errors: string[] = [];

    for (const item of items) {
      const { data: currentProd } = await supabase
        .from(item.target_table as any)
        .select(item.target_field)
        .eq('id', item.target_record_id)
        .single();

      if (!currentProd) {
        errors.push(`Registro ${item.target_record_id} não encontrado no rollback.`);
        continue;
      }

      const currentVal = (currentProd as any)[item.target_field];
      const expectedNewVal = item.new_value;

      if (JSON.stringify(currentVal) !== JSON.stringify(expectedNewVal)) {
        conflicts++;
        await supabase.from('product_update_job_items').update({
          status: 'conflict',
          error_message: 'Valor atual no banco foi alterado por terceiros após a importação.',
        }).eq('id', item.id);
        continue;
      }

      const { error: restoreErr } = await supabase
        .from(item.target_table as any)
        .update({ [item.target_field]: item.old_value })
        .eq('id', item.target_record_id);

      if (restoreErr) {
        errors.push(`Falha ao restaurar item ${item.id}: ${restoreErr.message}`);
      } else {
        rolledBack++;
        await supabase.from('product_update_job_items').update({
          status: 'rolled_back',
          rolled_back_at: new Date().toISOString(),
        }).eq('id', item.id);
      }
    }

    await supabase.from('product_update_jobs').update({
      status: conflicts > 0 ? 'partially_rolled_back' : 'rolled_back',
      rolled_back_at: new Date().toISOString(),
    }).eq('id', jobId);

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

    const prices = products.map((p: any) => Number(p.price) || 0).filter((p) => p > 0);
    const averagePrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
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
