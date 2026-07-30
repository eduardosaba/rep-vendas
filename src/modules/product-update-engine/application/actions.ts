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
} from './parser-utils';

async function requireProductUpdateAdmin() {
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

  if (error || !profile || !isAdminRole(profile.role)) {
    throw new Error('Acesso negado. Apenas administradores autorizados podem executar atualizações.');
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
  ];

  return Array.from(new Set([...baseCols, ...actionCols])).join(', ');
}

function applyScopeToQuery(query: any, scope: EngineConfiguration['scope'], defaultOrgId?: string) {
  const scopeType = scope?.type || 'GLOBAL';
  const targetOrgs = scope?.targetOrganizationIds || scope?.targetCompanyIds || [];
  const targetUsers = scope?.targetUserIds || [];

  if (scopeType === 'ORGANIZATION' || scopeType === 'COMPANY') {
    const orgId = targetOrgs[0] || defaultOrgId;
    if (orgId) {
      return query.eq('organization_id', orgId);
    }
  } else if (scopeType === 'ORGANIZATION_LIST') {
    if (targetOrgs.length > 0) {
      return query.in('organization_id', targetOrgs);
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
    await requireProductUpdateAdmin();

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
    const { supabase, profile } = await requireProductUpdateAdmin();
    const config: EngineConfiguration = JSON.parse(configJsonStr);

    // Whitelist & Scope compatibility validation for each action
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

    const file = formData.get('file') as File | null;
    if (!file) return { totalRows: 0, matchedRows: 0, changedRows: 0, skippedRows: 0, notFoundRows: 0, criticalConfirmationRequired: false, sampleDetails: [], error: 'Arquivo ausente.' };

    const arrayBuffer = await file.arrayBuffer();
    const fileHash = await calculateFileHash(arrayBuffer);
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
        .order('id', { ascending: true })
        .range(pageIndex * PAGE_LIMIT, (pageIndex + 1) * PAGE_LIMIT - 1);

      query = applyScopeToQuery(query, config.scope, profile.organization_id);

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

    let matchedSpreadsheetRows = 0;
    let matchedProductsCount = 0;
    let changedSpreadsheetRows = 0;
    const changedProductsSet = new Set<string>();
    let changedFieldsCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;
    let criticalFlag = false;

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

      // Filter evaluation
      let passFilter = true;
      if (config.filters && config.filters.conditions && config.filters.conditions.length > 0) {
        const results = config.filters.conditions.map((cond) => evaluateFilterCondition(row[cond.column], cond.operator, cond.value));
        if (config.filters.connective === 'OR') {
          passFilter = results.some(Boolean);
        } else {
          passFilter = results.every(Boolean);
        }
      }

      if (!passFilter) {
        skippedCount++;
        if (sampleDetails.length < 50) {
          sampleDetails.push({
            rowNumber: idx + 1,
            rawIdentifierValues: rawIdentValues,
            normalizedIdentifierValues: normIdentValues,
            filterMatched: false,
            proposedChanges: [],
            status: 'SKIPPED_FILTER',
            message: 'Ignorado pelos critérios de filtro.',
          });
        }
        continue;
      }

      // Match products in current scoped productsList
      const matchedProds = productsList.filter((p) => {
        return config.identifier.mappings.every((m) => {
          const dbVal = applyStringNormalizations(p[m.dbField as keyof typeof p], config.identifier.normalizations);
          return dbVal === normIdentValues[m.dbField];
        });
      });

      if (matchedProds.length === 0) {
        notFoundCount++;
        if (sampleDetails.length < 50) {
          sampleDetails.push({
            rowNumber: idx + 1,
            rawIdentifierValues: rawIdentValues,
            normalizedIdentifierValues: normIdentValues,
            filterMatched: true,
            proposedChanges: [],
            status: 'NOT_FOUND',
            message: 'Produto não localizado no banco.',
          });
        }
        continue;
      }

      matchedSpreadsheetRows++;
      matchedProductsCount += matchedProds.length;

      const proposed: PreviewRowDetail['proposedChanges'] = [];
      let rowHasChanges = false;

      for (const matchedProd of matchedProds) {
        for (const act of config.actions) {
          const fieldDef = getFieldDefinition(act.targetLayer, act.targetField)!;
          const currentDbVal = matchedProd[fieldDef.column as keyof typeof matchedProd];
          const valFromSpreadsheet = act.sourceColumn ? row[act.sourceColumn] : act.fixedValue;

          const newVal = computeStructuredOperation(currentDbVal, valFromSpreadsheet, act.operation, fieldDef.type);

          if (newVal !== currentDbVal) {
            rowHasChanges = true;
            changedFieldsCount++;
            changedProductsSet.add(matchedProd.id);

            if (fieldDef.critical || act.operation === 'percentage_decrease' || (act.targetField === 'is_active' && newVal === false)) {
              criticalFlag = true;
            }
            proposed.push({
              targetLayer: act.targetLayer,
              targetField: act.targetField,
              oldValue: currentDbVal,
              newValue: newVal,
              actionType: act.operation,
            });
          }
        }
      }

      if (rowHasChanges) {
        changedSpreadsheetRows++;
      }

      if (sampleDetails.length < 50) {
        sampleDetails.push({
          rowNumber: idx + 1,
          rawIdentifierValues: rawIdentValues,
          normalizedIdentifierValues: normIdentValues,
          filterMatched: true,
          matchedProductName: matchedProds[0]?.name || matchedProds[0]?.reference_code,
          proposedChanges: proposed,
          status: proposed.length > 0 ? 'READY' : 'NO_CHANGE',
          message: proposed.length > 0
            ? `${matchedProds.length} produto(s) correspondente(s) localizado(s).`
            : `Produto localizado, mas sem alteração de valor.`,
        });
      }
    }

    if (changedSpreadsheetRows > rawData.length * 0.3) {
      criticalFlag = true;
    }

    return {
      fileHash,
      totalRows: rawData.length,
      matchedRows: matchedSpreadsheetRows,
      matchedProducts: matchedProductsCount,
      changedRows: changedSpreadsheetRows,
      changedProducts: changedProductsSet.size,
      changedFields: changedFieldsCount,
      skippedRows: skippedCount,
      notFoundRows: notFoundCount,
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
  fileHash?: string
): Promise<{ jobId?: string; error?: string }> {
  try {
    const { userId, supabase } = await requireProductUpdateAdmin();
    const config: EngineConfiguration = JSON.parse(configJsonStr);

    const { data: job, error: jobErr } = await supabase
      .from('product_update_jobs')
      .insert({
        file_name: fileName,
        file_hash: fileHash || '',
        sheet_name: sheetName,
        total_rows: totalRows,
        configuration: config as any,
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
    const { userId, supabase, profile } = await requireProductUpdateAdmin();

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

    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    const worksheet = workbook.Sheets[config.sheetName || workbook.SheetNames[0]];
    const rawData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    const chunkData = rawData.slice(chunkRowIndex, chunkRowIndex + chunkSize);
    if (chunkData.length === 0) {
      await supabase.from('product_update_jobs').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', jobId);
      return { processed: 0, applied: 0, skipped: 0, failed: 0, isCompleted: true };
    }

    const selectColumns = getDynamicProductSelectColumns(config.actions);

    const chunkIdentValues: string[] = [];
    for (const row of chunkData) {
      for (const m of config.identifier.mappings) {
        const val = applyStringNormalizations(row[m.spreadsheetColumn], config.identifier.normalizations);
        if (val) chunkIdentValues.push(val);
      }
    }

    let productsQuery = supabase.from('products').select(selectColumns);
    productsQuery = applyScopeToQuery(productsQuery, config.scope, profile.organization_id);

    const primaryMapping = config.identifier.mappings[0];
    if (primaryMapping && primaryMapping.dbField === 'reference_code' && chunkIdentValues.length > 0) {
      productsQuery = productsQuery.in('reference_code', chunkIdentValues);
    }

    const { data: matchedDbProducts, error: dbErr } = await (productsQuery as any);
    if (dbErr) {
      return { processed: 0, applied: 0, skipped: 0, failed: 0, isCompleted: false, error: dbErr.message };
    }

    const productsList: any[] = matchedDbProducts || [];
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

      const normIdentValues: Record<string, string> = {};
      for (const m of config.identifier.mappings) {
        normIdentValues[m.dbField] = applyStringNormalizations(row[m.spreadsheetColumn], config.identifier.normalizations);
      }

      const matchedProds = productsList.filter((p) => {
        return config.identifier.mappings.every((m) => {
          const dbVal = applyStringNormalizations(p[m.dbField as keyof typeof p], config.identifier.normalizations);
          return dbVal === normIdentValues[m.dbField];
        });
      });

      if (matchedProds.length === 0) {
        failed++;
        await supabase.from('product_update_job_items').insert({
          job_id: jobId,
          row_number: actualRowIndex,
          target_layer: config.actions[0]?.targetLayer || 'global',
          target_table: 'products',
          target_record_id: '00000000-0000-0000-0000-000000000000',
          target_field: 'none',
          action_type: 'none',
          status: 'failed',
          error_message: 'Produto não localizado no banco para este escopo.',
        });
        continue;
      }

      for (const matchedProd of matchedProds) {
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
    await supabase.from('product_update_jobs').update({
      status: isCompleted ? 'completed' : 'processing',
      changed_rows: (job.changed_rows || 0) + applied,
      failed_rows: (job.failed_rows || 0) + failed,
      completed_at: isCompleted ? new Date().toISOString() : null,
    }).eq('id', jobId);

    return { processed: chunkData.length, applied, skipped, failed, isCompleted };
  } catch (err: any) {
    console.error('Erro em processBatchChunkAction:', err);
    return { processed: 0, applied: 0, skipped: 0, failed: 0, isCompleted: false, error: err.message || 'Erro no lote.' };
  }
}

export async function rollbackJobAction(jobId: string): Promise<{ success: boolean; rolledBack: number; conflicts: number; errors: string[] }> {
  try {
    const { userId, supabase, profile } = await requireProductUpdateAdmin();

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
