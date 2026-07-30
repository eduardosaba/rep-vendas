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
  parsePortugueseCurrencyOrNumber,
} from './parser-utils';

export async function analyzeSpreadsheetAction(formData: FormData): Promise<AnalyzeSpreadsheetResult> {
  try {
    const userId = await getActiveUserId();
    if (!userId) return { fileName: '', fileHash: '', sheets: [], selectedSheet: '', columns: [], sampleRows: [], totalRows: 0, error: 'Usuário não autenticado.' };

    const supabase = await createClient();
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
    if (!profile || !isAdminRole(profile.role)) {
      return { fileName: '', fileHash: '', sheets: [], selectedSheet: '', columns: [], sampleRows: [], totalRows: 0, error: 'Acesso negado. Apenas administradores master podem executar esta ação.' };
    }

    const file = formData.get('file') as File | null;
    if (!file) return { fileName: '', fileHash: '', sheets: [], selectedSheet: '', columns: [], sampleRows: [], totalRows: 0, error: 'Nenhum arquivo enviado.' };

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return { fileName: file.name, fileHash: '', sheets: [], selectedSheet: '', columns: [], sampleRows: [], totalRows: 0, error: 'O arquivo Excel não contém abas válidas.' };
    }

    const selectedSheet = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[selectedSheet];
    const rawData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (rawData.length === 0) {
      return { fileName: file.name, fileHash: '', sheets: workbook.SheetNames, selectedSheet, columns: [], sampleRows: [], totalRows: 0, error: 'A aba selecionada está vazia.' };
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
      fileHash: '',
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
    const userId = await getActiveUserId();
    if (!userId) return { totalRows: 0, matchedRows: 0, changedRows: 0, skippedRows: 0, notFoundRows: 0, criticalConfirmationRequired: false, sampleDetails: [], error: 'Usuário não autenticado.' };

    const supabase = await createClient();
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
    if (!profile || !isAdminRole(profile.role)) {
      return { totalRows: 0, matchedRows: 0, changedRows: 0, skippedRows: 0, notFoundRows: 0, criticalConfirmationRequired: false, sampleDetails: [], error: 'Acesso negado.' };
    }

    const config: EngineConfiguration = JSON.parse(configJsonStr);

    // 1. Whitelist Security & Layer/Scope Matrix Check
    for (const act of config.actions) {
      const fieldDef = getFieldDefinition(act.targetLayer, act.targetField);
      if (!fieldDef) {
        return { totalRows: 0, matchedRows: 0, changedRows: 0, skippedRows: 0, notFoundRows: 0, criticalConfirmationRequired: false, sampleDetails: [], error: `O campo '${act.targetField}' na camada '${act.targetLayer}' não consta na Whitelist permitida.` };
      }
    }

    const compat = validateLayerScopeCompatibility(config.actions[0]?.targetLayer || 'global', config.scope);
    if (!compat.valid) {
      return { totalRows: 0, matchedRows: 0, changedRows: 0, skippedRows: 0, notFoundRows: 0, criticalConfirmationRequired: false, sampleDetails: [], error: compat.reason };
    }

    const file = formData.get('file') as File | null;
    if (!file) return { totalRows: 0, matchedRows: 0, changedRows: 0, skippedRows: 0, notFoundRows: 0, criticalConfirmationRequired: false, sampleDetails: [], error: 'Arquivo ausente.' };

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    const worksheet = workbook.Sheets[config.sheetName || workbook.SheetNames[0]];
    const rawData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    // Fetch all existing products from database for matching (paginated to bypass Supabase 1000-row limit)
    let productsList: any[] = [];
    let pageIndex = 0;
    const PAGE_LIMIT = 1000;
    let keepFetching = true;

    while (keepFetching) {
      const { data: pageData, error: pageErr } = await supabase
        .from('products')
        .select('id, reference_code, brand, name, price, stock, is_active, colecao, user_id, company_id, organization_id')
        .range(pageIndex * PAGE_LIMIT, (pageIndex + 1) * PAGE_LIMIT - 1);

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

    let matchedCount = 0;
    let changedCount = 0;
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

      // Match product
      const matchedProd = productsList.find((p) => {
        return config.identifier.mappings.every((m) => {
          const dbVal = applyStringNormalizations(p[m.dbField as keyof typeof p], config.identifier.normalizations);
          return dbVal === normIdentValues[m.dbField];
        });
      });

      if (!matchedProd) {
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

      matchedCount++;

      // Compute proposed changes
      const proposed: PreviewRowDetail['proposedChanges'] = [];
      for (const act of config.actions) {
        const fieldDef = getFieldDefinition(act.targetLayer, act.targetField)!;
        const currentDbVal = matchedProd[fieldDef.column as keyof typeof matchedProd];
        const valFromSpreadsheet = act.sourceColumn ? row[act.sourceColumn] : act.fixedValue;

        const newVal = computeStructuredOperation(currentDbVal, valFromSpreadsheet, act.operation, fieldDef.type);

        if (newVal !== currentDbVal) {
          changedCount++;
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

      if (sampleDetails.length < 50) {
        sampleDetails.push({
          rowNumber: idx + 1,
          rawIdentifierValues: rawIdentValues,
          normalizedIdentifierValues: normIdentValues,
          matchedProductId: matchedProd.id,
          matchedProductName: matchedProd.name,
          filterMatched: true,
          proposedChanges: proposed,
          status: 'READY',
        });
      }
    }

    if (changedCount > rawData.length * 0.3) {
      criticalFlag = true;
    }

    return {
      totalRows: rawData.length,
      matchedRows: matchedCount,
      changedRows: changedCount,
      skippedRows: skippedCount,
      notFoundRows: notFoundCount,
      criticalConfirmationRequired: criticalFlag,
      criticalReason: criticalFlag ? 'Esta operação altera dados críticos ou mais de 30% do catálogo.' : undefined,
      sampleDetails: JSON.parse(JSON.stringify(sampleDetails)),
    };
  } catch (err: any) {
    console.error('Erro em previewEngineAction:', err);
    return { totalRows: 0, matchedRows: 0, changedRows: 0, skippedRows: 0, notFoundRows: 0, criticalConfirmationRequired: false, sampleDetails: [], error: err.message || 'Erro ao gerar a prévia.' };
  }
}

export async function createJobAction(fileName: string, sheetName: string, totalRows: number, configJsonStr: string): Promise<{ jobId?: string; error?: string }> {
  try {
    const userId = await getActiveUserId();
    if (!userId) return { error: 'Usuário não autenticado.' };

    const supabase = await createClient();
    const config: EngineConfiguration = JSON.parse(configJsonStr);

    const { data: job, error: jobErr } = await supabase
      .from('product_update_jobs')
      .insert({
        file_name: fileName,
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
    const userId = await getActiveUserId();
    if (!userId) return { processed: 0, applied: 0, skipped: 0, failed: 0, isCompleted: false, error: 'Usuário não autenticado.' };

    const supabase = await createClient();
    const { data: job, error: jobErr } = await supabase.from('product_update_jobs').select('*').eq('id', jobId).single();
    if (jobErr || !job) return { processed: 0, applied: 0, skipped: 0, failed: 0, isCompleted: false, error: 'Job não encontrado.' };

    const config: EngineConfiguration = job.configuration as any;
    const file = formData.get('file') as File | null;
    if (!file) return { processed: 0, applied: 0, skipped: 0, failed: 0, isCompleted: false, error: 'Arquivo não enviado.' };

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    const worksheet = workbook.Sheets[config.sheetName || workbook.SheetNames[0]];
    const rawData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    const chunkData = rawData.slice(chunkRowIndex, chunkRowIndex + chunkSize);
    if (chunkData.length === 0) {
      await supabase.from('product_update_jobs').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', jobId);
      return { processed: 0, applied: 0, skipped: 0, failed: 0, isCompleted: true };
    }

    let productsList: any[] = [];
    let pageIndex = 0;
    const PAGE_LIMIT = 1000;
    let keepFetching = true;

    while (keepFetching) {
      const { data: pageData, error: pageErr } = await supabase
        .from('products')
        .select('id, reference_code, brand, name, price, stock, is_active, colecao, user_id, company_id, organization_id')
        .range(pageIndex * PAGE_LIMIT, (pageIndex + 1) * PAGE_LIMIT - 1);

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

    let applied = 0;
    let skipped = 0;
    let failed = 0;

    for (let idx = 0; idx < chunkData.length; idx++) {
      const row = chunkData[idx];
      const actualRowIndex = chunkRowIndex + idx + 1;

      // Filter check
      let passFilter = true;
      if (config.filters && config.filters.conditions && config.filters.conditions.length > 0) {
        const results = config.filters.conditions.map((cond) => evaluateFilterCondition(row[cond.column], cond.operator, cond.value));
        passFilter = config.filters.connective === 'OR' ? results.some(Boolean) : results.every(Boolean);
      }

      if (!passFilter) {
        skipped++;
        continue;
      }

      // Match product
      const normIdentValues: Record<string, string> = {};
      for (const m of config.identifier.mappings) {
        normIdentValues[m.dbField] = applyStringNormalizations(row[m.spreadsheetColumn], config.identifier.normalizations);
      }

      const matchedProd = productsList.find((p) => {
        return config.identifier.mappings.every((m) => {
          const dbVal = applyStringNormalizations(p[m.dbField as keyof typeof p], config.identifier.normalizations);
          return dbVal === normIdentValues[m.dbField];
        });
      });

      if (!matchedProd) {
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
          error_message: 'Produto não localizado no banco.',
        });
        continue;
      }

      // Apply actions
      for (const act of config.actions) {
        const fieldDef = getFieldDefinition(act.targetLayer, act.targetField);
        if (!fieldDef) continue;

        const currentDbVal = matchedProd[fieldDef.column as keyof typeof matchedProd];
        const valFromSpreadsheet = act.sourceColumn ? row[act.sourceColumn] : act.fixedValue;
        const newVal = computeStructuredOperation(currentDbVal, valFromSpreadsheet, act.operation, fieldDef.type);

        if (newVal !== currentDbVal) {
          const { error: updateErr } = await supabase
            .from('products')
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
    const userId = await getActiveUserId();
    if (!userId) return { success: false, rolledBack: 0, conflicts: 0, errors: ['Usuário não autenticado.'] };

    const supabase = await createClient();
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
    if (!profile || !isAdminRole(profile.role)) {
      return { success: false, rolledBack: 0, conflicts: 0, errors: ['Acesso negado.'] };
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
      // Validate current DB value to detect conflicts
      const { data: currentProd } = await supabase
        .from(item.target_table)
        .select(item.target_field)
        .eq('id', item.target_record_id)
        .single();

      if (!currentProd) {
        errors.push(`Registro ${item.target_record_id} não encontrado no rollback.`);
        continue;
      }

      const currentVal = (currentProd as any)[item.target_field];
      const expectedNewVal = item.new_value;

      // Check conflict
      if (JSON.stringify(currentVal) !== JSON.stringify(expectedNewVal)) {
        conflicts++;
        await supabase.from('product_update_job_items').update({
          status: 'conflict',
          error_message: 'Valor atual no banco foi alterado por terceiros após a importação.',
        }).eq('id', item.id);
        continue;
      }

      // Restore old value
      const { error: restoreErr } = await supabase
        .from(item.target_table)
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
    const userId = await getActiveUserId();
    if (!userId) return { success: false, error: 'Usuário não autenticado.' };

    const supabase = await createClient();
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
    if (!profile || !isAdminRole(profile.role)) {
      return { success: false, error: 'Acesso negado.' };
    }

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
    const userId = await getActiveUserId();
    if (!userId) return { success: false, error: 'Usuário não autenticado.' };

    const supabase = await createClient();
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
    if (!profile || !isAdminRole(profile.role)) {
      return { success: false, error: 'Acesso negado.' };
    }

    const { data: job, error: jobErr } = await supabase
      .from('product_update_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobErr || !job) return { success: false, error: jobErr?.message || 'Job não encontrado.' };

    const { data: items, error: itemsErr } = await supabase
      .from('product_update_job_items')
      .select('*, products(reference, name, brand, colecao)')
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
    const userId = await getActiveUserId();
    if (!userId) return { success: false, error: 'Usuário não autenticado.' };

    const supabase = await createClient();
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
    if (!profile || !isAdminRole(profile.role)) {
      return { success: false, error: 'Acesso negado.' };
    }

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
