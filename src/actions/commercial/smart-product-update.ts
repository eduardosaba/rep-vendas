'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  ALLOWED_TARGET_FIELDS,
  AllowedTargetField,
  ProductUpdateMode,
  buildProductLookupKey,
  parseBrazilianDecimal,
  parseStrictBoolean,
} from '@/domain/commercial/smart-update-parsers';

export interface SmartUpdatePreviewItem {
  lineIndex: number;
  brand: string;
  referenceCode: string;
  lookupKey: string;
  matchedProductsCount: number;
  affectedOrgsCount: number;
  status: 'READY' | 'NO_CHANGE' | 'NOT_FOUND' | 'INVALID_ROW' | 'PARTIAL_AMBIGUITY';
  oldValueText: string;
  newValueText: string;
  detailMessage: string;
}

export interface SmartUpdatePreviewResult {
  spreadsheetRows: number;
  uniqueReferences: number;
  brandsCount: number;
  matchingProductsCount: number;
  affectedOrganizationsCount: number;
  productsToUpdateCount: number;
  noChangeCount: number;
  notFoundCount: number;
  invalidRowsCount: number;
  ambiguousOrganizationsCount: number;
  previewItems: SmartUpdatePreviewItem[];
  fileHash: string;
  configHash: string;
}

export interface ExecuteSmartUpdateParams {
  fileRows: Record<string, any>[];
  matchRefCol: string;
  brandCol?: string;
  targetField: AllowedTargetField;
  valueCol?: string;
  mode: ProductUpdateMode;
  selectedBrandFilter?: string;
  filename?: string;
}

/**
 * Validação Server-Side de Autorização Master
 */
export async function requireProductUpdateMaster() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Não autenticado: Faça login para acessar esta funcionalidade.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle();

  const role = String(profile?.role || '').toLowerCase();
  const isAllowed = role === 'master' || role === 'admin' || role === 'admin_company';

  if (profileError || !isAllowed) {
    throw new Error(
      'Acesso negado: Apenas usuários com permissão administrativa (Master/Admin) possuem autorização para executar a Torre de Controle.'
    );
  }

  return { masterUser: user, profile };
}

/**
 * Análise e Geração de Preview (SELECT puro - Sem alteração no banco)
 */
export async function previewControlTowerUpdateAction(
  params: ExecuteSmartUpdateParams
): Promise<SmartUpdatePreviewResult> {
  const { masterUser } = await requireProductUpdateMaster();

  const {
    fileRows,
    matchRefCol,
    brandCol,
    targetField,
    valueCol,
    mode,
    selectedBrandFilter,
  } = params;

  // Validação de Whitelist
  if (!ALLOWED_TARGET_FIELDS[targetField]) {
    throw new Error(`Campo de destino inválido ou não autorizado: '${targetField}'.`);
  }

  if (!fileRows || fileRows.length === 0) {
    throw new Error('A planilha fornecida está vazia.');
  }

  if (!matchRefCol) {
    throw new Error('Coluna de Referência/SKU é obrigatória.');
  }

  const adminClient = createAdminClient();

  // 1. Coleta de chaves e marcas únicas da planilha
  const uniqueKeysMap = new Map<string, { brand: string; ref: string; rows: any[] }>();
  const brandsSet = new Set<string>();

  if (selectedBrandFilter) {
    brandsSet.add(selectedBrandFilter.trim().toUpperCase());
  }

  fileRows.forEach((row) => {
    const rawRef = String(row[matchRefCol] || '').trim();
    if (!rawRef) return;

    const rawBrand = brandCol && row[brandCol] ? String(row[brandCol]).trim() : selectedBrandFilter || '';
    if (rawBrand) {
      brandsSet.add(rawBrand.toUpperCase());
    }

    const key = buildProductLookupKey(rawBrand, rawRef);
    if (!uniqueKeysMap.has(key)) {
      uniqueKeysMap.set(key, { brand: rawBrand, ref: rawRef, rows: [row] });
    } else {
      uniqueKeysMap.get(key)!.rows.push(row);
    }
  });

  // 2. Busca Global em Lotes Otimizados (apenas colunas necessárias)
  const selectColumns = 'id, organization_id, user_id, brand, reference_code, name, is_active, price, price_on_request';
  let query = adminClient.from('products').select(selectColumns);

  if (brandsSet.size > 0) {
    query = query.in('brand', Array.from(brandsSet));
  }

  const { data: dbProducts, error: dbError } = await query;

  if (dbError) {
    console.error('[ControlTowerPreview] Erro na consulta ao banco:', dbError);
    throw new Error(`Falha ao consultar banco de dados: ${dbError.message}`);
  }

  // 3. Indexação de candidatos por chave normalizada no servidor
  const candidatesMap = new Map<string, any[]>();
  (dbProducts || []).forEach((prod) => {
    const key = buildProductLookupKey(prod.brand, prod.reference_code);
    if (!candidatesMap.has(key)) {
      candidatesMap.set(key, [prod]);
    } else {
      candidatesMap.get(key)!.push(prod);
    }
  });

  // 4. Métricas e análise item por item
  let matchingProductsCount = 0;
  const affectedOrgsSet = new Set<string>();
  let productsToUpdateCount = 0;
  let noChangeCount = 0;
  let notFoundCount = 0;
  let invalidRowsCount = 0;
  let ambiguousOrganizationsCount = 0;

  const previewItems: SmartUpdatePreviewItem[] = [];

  fileRows.forEach((row, index) => {
    const rawRef = String(row[matchRefCol] || '').trim();
    const rawBrand = brandCol && row[brandCol] ? String(row[brandCol]).trim() : selectedBrandFilter || '';
    const key = buildProductLookupKey(rawBrand, rawRef);

    if (!rawRef) {
      invalidRowsCount++;
      if (previewItems.length < 50) {
        previewItems.push({
          lineIndex: index + 1,
          brand: rawBrand || 'N/A',
          referenceCode: rawRef || 'VÁZIO',
          lookupKey: key,
          matchedProductsCount: 0,
          affectedOrgsCount: 0,
          status: 'INVALID_ROW',
          oldValueText: '---',
          newValueText: '---',
          detailMessage: 'Código de referência em branco.',
        });
      }
      return;
    }

    const matchedProds = candidatesMap.get(key) || [];

    if (matchedProds.length === 0) {
      notFoundCount++;
      if (previewItems.length < 50) {
        previewItems.push({
          lineIndex: index + 1,
          brand: rawBrand || 'N/A',
          referenceCode: rawRef,
          lookupKey: key,
          matchedProductsCount: 0,
          affectedOrgsCount: 0,
          status: 'NOT_FOUND',
          oldValueText: '---',
          newValueText: '---',
          detailMessage: 'Nenhum produto global localizado com esta marca e referência.',
        });
      }
      return;
    }

    // Agrupamento por organização para detecção de ambiguidade interna
    const orgsMap = new Map<string, any[]>();
    matchedProds.forEach((prod) => {
      const orgId = prod.organization_id || prod.user_id || 'unassigned';
      if (!orgsMap.has(orgId)) {
        orgsMap.set(orgId, [prod]);
      } else {
        orgsMap.get(orgId)!.push(prod);
      }
      affectedOrgsSet.add(orgId);
    });

    // Filtra duplicidades dentro da mesma organização
    const cleanProducts: any[] = [];
    let hasOrgAmbiguity = false;

    orgsMap.forEach((prodsInOrg, orgId) => {
      if (prodsInOrg.length > 1) {
        hasOrgAmbiguity = true;
        ambiguousOrganizationsCount++;
      } else {
        cleanProducts.push(prodsInOrg[0]);
      }
    });

    matchingProductsCount += matchedProds.length;

    // Parsing do Novo Valor conforme modo e whitelist
    const rawNewValue = valueCol ? row[valueCol] : undefined;
    let targetNewValue: any = null;
    let isValueInvalid = false;

    if (targetField === 'is_active') {
      if (mode === 'DEACTIVATE_ONLY') {
        // No modo Padrão "Somente desativar":
        // Se a planilha contiver "FALSE/INATIVO/0", desativa. Caso contrário, ignora.
        const parsed = parseStrictBoolean(rawNewValue ?? false);
        if (parsed === false) {
          targetNewValue = false;
        } else if (parsed === true) {
          targetNewValue = 'IGNORE';
        } else {
          isValueInvalid = true;
        }
      } else {
        const parsed = parseStrictBoolean(rawNewValue);
        if (parsed === null) {
          isValueInvalid = true;
        } else {
          targetNewValue = parsed;
        }
      }
    } else if (targetField === 'price') {
      const parsed = parseBrazilianDecimal(rawNewValue);
      if (parsed === null) {
        isValueInvalid = true;
      } else {
        targetNewValue = parsed;
      }
    }

    if (isValueInvalid) {
      invalidRowsCount++;
      if (previewItems.length < 50) {
        previewItems.push({
          lineIndex: index + 1,
          brand: rawBrand,
          referenceCode: rawRef,
          lookupKey: key,
          matchedProductsCount: matchedProds.length,
          affectedOrgsCount: orgsMap.size,
          status: 'INVALID_ROW',
          oldValueText: '---',
          newValueText: String(rawNewValue ?? 'Inválido'),
          detailMessage: `Valor '${rawNewValue}' incompatível para o campo ${targetField}.`,
        });
      }
      return;
    }

    // Calcula alterações para produtos limpos
    let rowWillChange = false;
    let rowNoChange = false;

    cleanProducts.forEach((prod) => {
      const currentVal = prod[targetField];
      if (targetNewValue === 'IGNORE') {
        rowNoChange = true;
      } else if (String(currentVal) === String(targetNewValue)) {
        rowNoChange = true;
        noChangeCount++;
      } else {
        rowWillChange = true;
        productsToUpdateCount++;
      }
    });

    const sampleProd = cleanProducts[0] || matchedProds[0];
    const statusResult = hasOrgAmbiguity
      ? 'PARTIAL_AMBIGUITY'
      : rowWillChange
      ? 'READY'
      : 'NO_CHANGE';

    if (previewItems.length < 50) {
      previewItems.push({
        lineIndex: index + 1,
        brand: sampleProd?.brand || rawBrand,
        referenceCode: sampleProd?.reference_code || rawRef,
        lookupKey: key,
        matchedProductsCount: matchedProds.length,
        affectedOrgsCount: orgsMap.size,
        status: statusResult,
        oldValueText: String(sampleProd ? sampleProd[targetField] : '---'),
        newValueText: targetNewValue === 'IGNORE' ? 'Mantido (Ativo)' : String(targetNewValue),
        detailMessage: hasOrgAmbiguity
          ? `Alerta: Duplicidade interna detectada em algumas organizações. Atualizando ${cleanProducts.length} produtos limpos.`
          : `${matchedProds.length} cópia(s) em ${orgsMap.size} organização(ões).`,
      });
    }
  });

  const fileHash = `hash-${fileRows.length}-${Date.now()}`;
  const configHash = `cfg-${targetField}-${mode}`;

  return {
    spreadsheetRows: fileRows.length,
    uniqueReferences: uniqueKeysMap.size,
    brandsCount: brandsSet.size,
    matchingProductsCount,
    affectedOrganizationsCount: affectedOrgsSet.size,
    productsToUpdateCount,
    noChangeCount,
    notFoundCount,
    invalidRowsCount,
    ambiguousOrganizationsCount,
    previewItems,
    fileHash,
    configHash,
  };
}

/**
 * Execução da Atualização Global via Server Action protegida (UPDATE direto + Auditoria)
 */
export async function executeControlTowerUpdateAction(params: ExecuteSmartUpdateParams) {
  const { masterUser } = await requireProductUpdateMaster();
  const adminClient = createAdminClient();

  const preview = await previewControlTowerUpdateAction(params);

  if (preview.productsToUpdateCount === 0) {
    return {
      success: true,
      updatedCount: 0,
      jobId: null,
      message: 'Nenhum produto necessita de atualização.',
    };
  }

  const { fileRows, matchRefCol, brandCol, targetField, valueCol, mode, selectedBrandFilter, filename } = params;

  // 1. Registra o Job de Auditoria em public.sync_jobs
  const { data: job, error: jobErr } = await adminClient
    .from('sync_jobs')
    .insert({
      status: 'processing',
      total_count: preview.productsToUpdateCount,
      completed_count: 0,
      failed_count: 0,
      configuration: {
        scope: 'PLATFORM_GLOBAL',
        mode,
        targetField,
        filename: filename || 'Atualizacao_Torre_Controle.xlsx',
        metrics: preview,
        executedBy: masterUser.id,
      },
    })
    .select('id')
    .single();

  if (jobErr || !job) {
    throw new Error(`Falha ao registrar job de auditoria: ${jobErr?.message}`);
  }

  // 2. Coleta das marcas únicas para busca seletiva
  const brandsSet = new Set<string>();
  if (selectedBrandFilter) brandsSet.add(selectedBrandFilter.trim().toUpperCase());

  fileRows.forEach((row) => {
    const rawBrand = brandCol && row[brandCol] ? String(row[brandCol]).trim() : selectedBrandFilter || '';
    if (rawBrand) brandsSet.add(rawBrand.toUpperCase());
  });

  const { data: dbProducts } = await adminClient
    .from('products')
    .select('id, organization_id, user_id, brand, reference_code, is_active, price')
    .in('brand', Array.from(brandsSet));

  const candidatesMap = new Map<string, any[]>();
  (dbProducts || []).forEach((prod) => {
    const key = buildProductLookupKey(prod.brand, prod.reference_code);
    if (!candidatesMap.has(key)) candidatesMap.set(key, [prod]);
    else candidatesMap.get(key)!.push(prod);
  });

  let confirmedUpdatedCount = 0;
  const rollbackEntries: any[] = [];

  // 3. Execução em Lotes com UPDATE explícito (NUNCA UPSERT, NUNCA alterando user_id / org_id)
  for (const row of fileRows) {
    const rawRef = String(row[matchRefCol] || '').trim();
    const rawBrand = brandCol && row[brandCol] ? String(row[brandCol]).trim() : selectedBrandFilter || '';
    if (!rawRef) continue;

    const key = buildProductLookupKey(rawBrand, rawRef);
    const matchedProds = candidatesMap.get(key) || [];

    // Agrupa por org e filtra ambiguidades internas
    const orgsMap = new Map<string, any[]>();
    matchedProds.forEach((p) => {
      const orgId = p.organization_id || p.user_id || 'unassigned';
      if (!orgsMap.has(orgId)) orgsMap.set(orgId, [p]);
      else orgsMap.get(orgId)!.push(p);
    });

    const cleanProds: any[] = [];
    orgsMap.forEach((prods) => {
      if (prods.length === 1) cleanProds.push(prods[0]);
    });

    const rawNewValue = valueCol ? row[valueCol] : undefined;
    let targetNewValue: any = null;

    if (targetField === 'is_active') {
      if (mode === 'DEACTIVATE_ONLY') {
        const parsed = parseStrictBoolean(rawNewValue ?? false);
        if (parsed === false) targetNewValue = false;
        else continue;
      } else {
        const parsed = parseStrictBoolean(rawNewValue);
        if (parsed === null) continue;
        targetNewValue = parsed;
      }
    } else if (targetField === 'price') {
      const parsed = parseBrazilianDecimal(rawNewValue);
      if (parsed === null) continue;
      targetNewValue = parsed;
    }

    for (const prod of cleanProds) {
      const currentVal = prod[targetField];
      if (String(currentVal) === String(targetNewValue)) continue;

      // Executa o UPDATE restrito APENAS ao campo de destino e updated_at
      const updatePayload: Record<string, any> = {
        [targetField]: targetNewValue,
        updated_at: new Date().toISOString(),
      };

      const { data: updatedRows, error: updateErr } = await adminClient
        .from('products')
        .update(updatePayload)
        .eq('id', prod.id)
        .select('id, organization_id, user_id');

      if (!updateErr && updatedRows && updatedRows.length > 0) {
        confirmedUpdatedCount++;

        // Grava no sync_job_items apenas para atualizações efetivamente confirmadas
        await adminClient.from('sync_job_items').insert({
          job_id: job.id,
          product_id: prod.id,
          status: 'success',
          created_at: new Date().toISOString(),
        });

        rollbackEntries.push({
          id: prod.id,
          old_value: currentVal,
          new_value: targetNewValue,
          organization_id: prod.organization_id,
        });
      }
    }
  }

  // 4. Finalização do Job e Gravação do Histórico em sync_logs
  await adminClient.from('sync_jobs').update({
    status: 'completed',
    completed_count: confirmedUpdatedCount,
    updated_at: new Date().toISOString(),
  }).eq('id', job.id);

  await adminClient.from('sync_logs').insert({
    user_id: masterUser.id,
    filename: filename || 'Atualização Torre de Controle',
    target_column: targetField,
    total_processed: preview.spreadsheetRows,
    updated_count: confirmedUpdatedCount,
    mismatch_count: preview.notFoundCount,
    rollback_data: rollbackEntries,
    rolled_back: false,
  });

  return {
    success: true,
    jobId: job.id,
    updatedCount: confirmedUpdatedCount,
    message: `Atualização concluída com sucesso! ${confirmedUpdatedCount} produtos alterados em todas as organizações.`,
  };
}

/**
 * Rollback Cirúrgico baseado exclusivamente em alterações confirmadas
 */
export async function rollbackControlTowerUpdateJobAction(jobId: string) {
  const { masterUser } = await requireProductUpdateMaster();
  const adminClient = createAdminClient();

  const { data: job, error: jobErr } = await adminClient
    .from('sync_jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle();

  if (jobErr || !job) {
    throw new Error('Job de atualização não encontrado.');
  }

  const targetField = job.configuration?.targetField || 'is_active';

  const { data: syncLog } = await adminClient
    .from('sync_logs')
    .select('*')
    .eq('user_id', masterUser.id)
    .eq('rolled_back', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!syncLog || !Array.isArray(syncLog.rollback_data) || syncLog.rollback_data.length === 0) {
    throw new Error('Nenhum dado de rollback encontrado para este job.');
  }

  let restoredCount = 0;
  for (const item of syncLog.rollback_data) {
    const targetProductId = item.product_id || item.id;
    if (!targetProductId || item.old_value === undefined) continue;

    // Trava de segurança: Verifica se o valor atual no banco ainda é o new_value aplicado pelo job.
    // Se outro usuário ou processo alterou o produto posteriormente, o rollback é ignorado para esse item.
    const { data: currentProd } = await adminClient
      .from('products')
      .select('id, ' + targetField)
      .eq('id', targetProductId)
      .maybeSingle();

    if (!currentProd) continue;

    if (item.new_value !== undefined && String((currentProd as any)[targetField]) !== String(item.new_value)) {
      console.warn(`[Rollback] Produto ${targetProductId} foi modificado por outro processo após o job. Ignorando rollback para este item.`);
      continue;
    }

    const { error: revertErr } = await adminClient
      .from('products')
      .update({
        [targetField]: item.old_value,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetProductId);

    if (!revertErr) {
      restoredCount++;
    }
  }

  await adminClient.from('sync_logs').update({ rolled_back: true }).eq('id', syncLog.id);
  await adminClient.from('sync_jobs').update({ status: 'rolled_back', updated_at: new Date().toISOString() }).eq('id', jobId);

  return {
    success: true,
    restoredCount,
    message: `Rollback concluído! ${restoredCount} produtos restaurados ao valor anterior.`,
  };
}
