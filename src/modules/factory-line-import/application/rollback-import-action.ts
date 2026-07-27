'use server';

import { createClient } from '@/lib/supabase/server';
import { getActiveUserId } from '@/lib/auth-utils';
import { isAdminRole } from '@/lib/auth/roles';

export async function rollbackImportAction(importId: string) {
  if (process.env.FACTORY_LINE_IMPORT_ENABLED !== 'true') {
    return { error: 'Funcionalidade desativada.' };
  }

  const supabase = await createClient();
  const userId = await getActiveUserId();
  if (!userId) return { error: 'Usuário não autenticado.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (!profile || !isAdminRole(profile.role)) {
    return { error: 'Acesso negado.' };
  }

  const { data: importRecord, error: importError } = await supabase
    .from('factory_line_imports')
    .select('status')
    .eq('id', importId)
    .single();

  if (importError || !importRecord) {
    return { error: 'Importação não encontrada.' };
  }

  if (['ROLLED_BACK', 'ROLLBACK_PROCESSING'].includes(importRecord.status)) {
    return { error: 'Esta importação já foi ou está sendo desfeita.' };
  }

  await supabase.from('factory_line_imports')
    .update({ status: 'ROLLBACK_PROCESSING', rollback_started_at: new Date().toISOString() })
    .eq('id', importId);

  let allRows: any[] = [];
  const PAGE_SIZE = 1000;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: rowsPage, error } = await supabase
      .from('factory_line_import_rows')
      .select('id')
      .eq('import_id', importId)
      .eq('apply_status', 'UPDATED')
      .is('rollback_status', null)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      console.error('Erro ao buscar linhas para rollback:', error);
      return { error: 'Erro de comunicação ao recuperar histórico para rollback.' };
    }
    if (!rowsPage || rowsPage.length === 0) {
      hasMore = false;
      break;
    }
    
    allRows = allRows.concat(rowsPage);
    if (rowsPage.length < PAGE_SIZE) hasMore = false;
    page++;
  }

  let totalRestored = 0;
  let totalConflicts = 0;
  let totalFailed = 0;
  let totalAlreadyProcessed = 0;
  let totalNotApplicable = 0;
  let totalNotFound = 0;

  const BATCH_SIZE = 200;
  for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
    const batchIds = allRows.slice(i, i + BATCH_SIZE).map(r => r.id);
    
    const { data: rpcResult, error: rpcError } = await supabase.rpc('apply_factory_line_import_rollback_batch', {
      p_import_id: importId,
      p_row_ids: batchIds
    });

    if (rpcError) {
      console.error('Rollback RPC Error:', rpcError);
      totalFailed += batchIds.length;
    } else if (rpcResult) {
      totalRestored += rpcResult.restored || 0;
      totalConflicts += rpcResult.conflicts || 0;
      totalFailed += rpcResult.failed || 0;
      totalAlreadyProcessed += rpcResult.already_processed || 0;
      totalNotApplicable += rpcResult.not_applicable || 0;
      totalNotFound += rpcResult.not_found || 0;
    }
  }

  return { 
    success: true, 
    stats: { 
      restored: totalRestored, 
      conflicts: totalConflicts, 
      failed: totalFailed,
      already_processed: totalAlreadyProcessed,
      not_applicable: totalNotApplicable,
      not_found: totalNotFound
    } 
  };
}
