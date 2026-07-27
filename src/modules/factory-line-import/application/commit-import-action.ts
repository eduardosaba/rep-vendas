'use server';

import { createClient } from '@/lib/supabase/server';
import { getActiveUserId } from '@/lib/auth-utils';
import * as XLSX from 'xlsx';
import { ImportSheetType, ImportScope, BRAND_ALIASES } from '../domain/types';
import { normalizeProductReference } from '@/shared/utils/normalize-product-reference';
import { normalizeBrand } from '@/shared/utils/normalize-brand';
import * as crypto from 'crypto';

function readExcelBuffer(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { header: 1 });
}

export async function commitImportAction(formData: FormData) {
  if (process.env.FACTORY_LINE_IMPORT_ENABLED !== 'true') {
    return { error: 'Funcionalidade desativada.' };
  }

  const file = formData.get('file') as File;
  const brandParam = formData.get('brand') as string;
  const sheetType = formData.get('sheetType') as ImportSheetType;
  const scope = (formData.get('scope') as ImportScope) || 'GLOBAL';
  const idempotencyKey = formData.get('idempotencyKey') as string;
  
  if (!file || !brandParam || !idempotencyKey) {
    return { error: 'Faltam parâmetros obrigatórios.' };
  }

  const supabase = await createClient();
  const userId = await getActiveUserId();
  if (!userId) return { error: 'Usuário não autenticado.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (!profile || !['master', 'admin'].includes(profile.role)) {
    return { error: 'Acesso negado.' };
  }

  // 1. Idempotency Check
  const { data: existingImport } = await supabase
    .from('factory_line_imports')
    .select('id')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (existingImport) {
    return { error: 'Esta importação já foi processada.' };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

  let rows: any[][];
  try {
    rows = readExcelBuffer(buffer) as any[][];
  } catch (err) {
    return { error: 'Falha ao ler o arquivo Excel.' };
  }

  const headerRow = rows[0] || [];
  const refIndex = headerRow.findIndex((h: any) => String(h || '').toLowerCase().includes('refer'));
  const statusIndex = headerRow.findIndex((h: any) => String(h || '').toLowerCase().includes('status') || String(h || '').toLowerCase().includes('situa'));
  
  if (refIndex === -1) {
    return { error: 'Coluna de Referência não encontrada.' };
  }

  // Generate unique references from file
  const uniqueNormalizedFileRefs = new Map<string, { normStatus: 'ACTIVE'|'INACTIVE'|'UNKNOWN' }>();
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const rawRef = String(row[refIndex] || '').trim();
    if (!rawRef) continue;
    
    const normRef = normalizeProductReference(rawRef);
    let normStatus: 'ACTIVE'|'INACTIVE'|'UNKNOWN' = 'UNKNOWN';
    
    if (sheetType === 'STATUS_COLUMN' && statusIndex !== -1) {
      const rawStatus = String(row[statusIndex] || '').toLowerCase();
      if (rawStatus.includes('ativo') || rawStatus.includes('disponível') || rawStatus.includes('disponivel') || rawStatus.includes('linha')) {
        normStatus = 'ACTIVE';
      } else if (rawStatus.includes('inativo') || rawStatus.includes('fora') || rawStatus.includes('indisponível') || rawStatus.includes('esgotado')) {
        normStatus = 'INACTIVE';
      }
    }
    
    // We keep only the first valid status if duplicates exist
    if (!uniqueNormalizedFileRefs.has(normRef)) {
      uniqueNormalizedFileRefs.set(normRef, { normStatus });
    }
  }

  // 2. Insert PENDING import record
  const { data: importRecord, error: insertError } = await supabase
    .from('factory_line_imports')
    .insert({
      brand_code: brandParam,
      brand_name: brandParam,
      import_type: sheetType,
      scope,
      file_name: file.name,
      file_hash: fileHash,
      idempotency_key: idempotencyKey,
      status: 'PROCESSING',
      created_by: userId
    })
    .select('id')
    .single();

  if (insertError || !importRecord) {
    console.error(insertError);
    return { error: 'Erro ao iniciar o registro da importação.' };
  }

  const importId = importRecord.id;

  // 3. Fetch all matching products by brand
  let allMatchedProducts: any[] = [];
  const PAGE_SIZE = 1000;
  let hasMore = true;
  let page = 0;
  
  const normalizedSelectedBrand = normalizeBrand(brandParam);
  const officialAliases = BRAND_ALIASES[brandParam] || [normalizedSelectedBrand];
  const looseBrandTerm = officialAliases[0].split(' ')[0];

  while (hasMore) {
    const { data: productsPage, error } = await supabase
      .from('products')
      .select('id, reference_code, brand, is_active, user_id, organization_id, company_id')
      .ilike('brand', `%${looseBrandTerm}%`)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      
    if (error) break;
    if (!productsPage || productsPage.length === 0) break;
    
    const filteredByBrand = productsPage.filter(p => {
      if (!p.brand) return false;
      const pBrandNorm = normalizeBrand(p.brand);
      return officialAliases.includes(pBrandNorm) || pBrandNorm === normalizedSelectedBrand;
    });
    
    allMatchedProducts = allMatchedProducts.concat(filteredByBrand);
    if (productsPage.length < PAGE_SIZE) hasMore = false;
    page++;
  }

  // 4. Generate the payload for the RPC
  const updatesPayload: any[] = [];
  
  for (const p of allMatchedProducts) {
    const pNormRef = normalizeProductReference(p.reference_code);
    const fileItem = uniqueNormalizedFileRefs.get(pNormRef);
    
    if (fileItem) {
      let desiredAction: 'ACTIVATE' | 'DEACTIVATE' | 'NONE' = 'NONE';
      let desiredActive = p.is_active;

      if (sheetType === 'FULL_CATALOG') {
        desiredAction = 'ACTIVATE';
        desiredActive = true;
      } else if (sheetType === 'ONLY_OUT_OF_STOCK') {
        desiredAction = 'DEACTIVATE';
        desiredActive = false;
      } else if (sheetType === 'ONLY_IN_STOCK') {
        desiredAction = 'ACTIVATE';
        desiredActive = true;
      } else if (sheetType === 'STATUS_COLUMN') {
        if (fileItem.normStatus === 'ACTIVE') {
          desiredAction = 'ACTIVATE';
          desiredActive = true;
        } else if (fileItem.normStatus === 'INACTIVE') {
          desiredAction = 'DEACTIVATE';
          desiredActive = false;
        }
      }

      if (desiredAction !== 'NONE') {
        updatesPayload.push({
          product_id: p.id,
          new_is_active: desiredActive,
          previous_is_active: p.is_active,
          user_id: p.user_id,
          organization_id: p.organization_id,
          company_id: p.company_id,
          reference_code: p.reference_code,
          normalized_reference: pNormRef,
          action: desiredAction
        });
      }
    }
  }

  if (updatesPayload.length === 0) {
    await supabase.from('factory_line_imports').update({ status: 'COMPLETED', completed_at: new Date().toISOString() }).eq('id', importId);
    return { success: true, message: 'Nenhum produto precisava ser alterado.' };
  }

  // 5. Send batches to RPC
  const BATCH_SIZE = 300;
  let totalUpdated = 0;
  let totalUnchanged = 0;
  let totalConflicts = 0;
  let totalFailed = 0;

  for (let i = 0; i < updatesPayload.length; i += BATCH_SIZE) {
    const batch = updatesPayload.slice(i, i + BATCH_SIZE);
    
    const { data: rpcResult, error: rpcError } = await supabase.rpc('apply_factory_line_import_batch', {
      p_import_id: importId,
      p_rows: batch
    });

    if (rpcError) {
      console.error('RPC Error for batch:', rpcError);
      totalFailed += batch.length;
    } else if (rpcResult) {
      totalUpdated += rpcResult.updated || 0;
      totalUnchanged += rpcResult.unchanged || 0;
      totalConflicts += rpcResult.conflicts || 0;
      totalFailed += rpcResult.failed || 0;
    }
  }

  const finalStatus = totalFailed > 0 ? (totalUpdated > 0 ? 'PARTIALLY_COMPLETED' : 'FAILED') : 'COMPLETED';

  await supabase.from('factory_line_imports').update({
    status: finalStatus,
    completed_at: new Date().toISOString(),
    total_rows: uniqueNormalizedFileRefs.size,
    total_matched: updatesPayload.length,
    total_updated: totalUpdated,
    total_unchanged: totalUnchanged,
    total_conflicts: totalConflicts,
    total_failed: totalFailed
  }).eq('id', importId);

  return { 
    success: true, 
    importId, 
    stats: { updated: totalUpdated, conflicts: totalConflicts, failed: totalFailed } 
  };
}
