import { SupabaseClient } from '@supabase/supabase-js';

export const SYNCABLE_FIELDS = [
  'is_launch',
  'is_active',
  'is_best_seller',
  'bestseller',
  'is_destaque',
  'price_on_request',
  'price',
  'sale_price',
  'cost',
  'original_price',
  'discount_percent',
  'name',
  'description',
  'category',
  'category_id',
  'color',
  'gender',
  'class_core',
  'material',
  'polarizado',
  'fotocromatico',
  'material_haste',
  'colecao',
  'frame_formato',
  'color_nome',
  'barcode',
  'sku',
  'technical_specs',
  'stock_quantity',
  'track_stock',
  'manage_stock',
  'min_stock_level',
  'image_url',
  'external_image_url',
  'image_path',
  'images',
  'gallery_images',
  'image_variants',
  'image_optimized',
  'image_is_shared',
] as const;

export type SyncableField = (typeof SYNCABLE_FIELDS)[number];

/**
 * Propriedades seguras permitidas para atualização em referências já existentes
 * durante a clonagem de catálogo. Preserva imagens, slugs e personalizações do cliente:
 * - price (preço / preço sugerido vendas)
 * - sale_price (preço promocional)
 * - is_launch (marcação de lançamentos)
 * - sku (código sku)
 * - barcode (código de barras / EAN)
 * - is_active (status ativo/inativo)
 * - description (descrição)
 */
export const DEFAULT_CLONE_SYNC_PROPERTIES: readonly SyncableField[] = [
  'price',
  'sale_price',
  'is_launch',
  'sku',
  'barcode',
  'is_active',
  'description',
];

export interface SyncDivergentOptions {
  supabase: SupabaseClient;
  sourceUserId: string;
  targetUserId: string;
  brands?: string[] | null;
  propertiesToSync?: string[] | 'all' | 'clone_safe';
  dryRun?: boolean;
}

export interface ChangedProductSummary {
  targetId: string;
  referenceCode: string;
  brand: string;
  changedFields: string[];
}

export interface SyncDivergentResult {
  totalChecked: number;
  divergentCount: number;
  updatedCount: number;
  changedProducts: ChangedProductSummary[];
}

/**
 * Normaliza os nomes de propriedades passados pela UI/API para os nomes
 * reais das colunas da tabela `products`.
 */
export function normalizePropertyNames(
  props: string[] | 'all' | 'clone_safe' | undefined | null
): string[] | 'all' {
  if (!props || props === 'clone_safe') {
    return [...DEFAULT_CLONE_SYNC_PROPERTIES];
  }
  if (props === 'all') return 'all';

  const mapped = new Set<string>();

  for (const raw of props) {
    const p = String(raw || '').trim().toLowerCase();
    if (!p) continue;

    if (p === 'cost_price' || p === 'cost') {
      mapped.add('cost');
    } else if (p === 'price') {
      mapped.add('price');
    } else if (p === 'sale_price') {
      mapped.add('sale_price');
    } else if (p === 'is_launch' || p === 'lancamento' || p === 'lançamento') {
      mapped.add('is_launch');
    } else if (p === 'is_active' || p === 'status') {
      mapped.add('is_active');
    } else if (p === 'is_best_seller' || p === 'bestseller') {
      mapped.add('is_best_seller');
      mapped.add('bestseller');
    } else if (p === 'stock_quantity' || p === 'stock') {
      mapped.add('stock_quantity');
      mapped.add('track_stock');
      mapped.add('manage_stock');
    } else if (p === 'description' || p === 'descricao' || p === 'descrição') {
      mapped.add('description');
    } else if (p === 'barcode' || p === 'ean' || p === 'codigo_barras') {
      mapped.add('barcode');
    } else if (p === 'sku') {
      mapped.add('sku');
    } else if (p === 'category') {
      mapped.add('category');
      mapped.add('category_id');
    } else if (p === 'images') {
      mapped.add('image_url');
      mapped.add('external_image_url');
      mapped.add('image_path');
      mapped.add('images');
      mapped.add('gallery_images');
      mapped.add('image_variants');
      mapped.add('image_optimized');
    } else if (SYNCABLE_FIELDS.includes(p as SyncableField)) {
      mapped.add(p);
    }
  }

  return Array.from(mapped);
}

/**
 * Compara dois valores para determinar se houve alteração real entre master e clone.
 */
export function isValueDifferent(srcVal: any, tgtVal: any): boolean {
  // Trata nulos e strings vazias como equivalentes quando ambos vazios
  const isSrcEmpty = srcVal === null || srcVal === undefined || srcVal === '';
  const isTgtEmpty = tgtVal === null || tgtVal === undefined || tgtVal === '';
  if (isSrcEmpty && isTgtEmpty) return false;
  if (isSrcEmpty !== isTgtEmpty) return true;

  // Booleans
  if (typeof srcVal === 'boolean' || typeof tgtVal === 'boolean') {
    return Boolean(srcVal) !== Boolean(tgtVal);
  }

  // Numbers
  if (typeof srcVal === 'number' || typeof tgtVal === 'number') {
    const numSrc = srcVal != null ? Number(srcVal) : null;
    const numTgt = tgtVal != null ? Number(tgtVal) : null;
    if (numSrc === null && numTgt === null) return false;
    if (numSrc === null || numTgt === null) return true;
    return Math.abs(numSrc - numTgt) > 0.0001;
  }

  // Arrays / Objects
  if (typeof srcVal === 'object' || typeof tgtVal === 'object') {
    try {
      return JSON.stringify(srcVal ?? null) !== JSON.stringify(tgtVal ?? null);
    } catch {
      return false;
    }
  }

  // Strings e outros tipos
  return String(srcVal ?? '').trim() !== String(tgtVal ?? '').trim();
}

/**
 * Busca todos os produtos de um usuário com paginação para evitar limites do Supabase (1000 linhas).
 */
async function fetchAllUserProducts(
  supabase: SupabaseClient,
  userId: string,
  brands: string[] | null,
  selectCols: string
): Promise<any[]> {
  const allProducts: any[] = [];
  const pageSize = 1000;
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('products')
      .select(selectCols)
      .eq('user_id', userId)
      .order('id')
      .range(from, from + pageSize - 1);

    if (brands && brands.length > 0) {
      query = query.in('brand', brands);
    }

    const { data, error } = await query;
    if (error) {
      console.error(`[syncDivergentProducts] Erro ao buscar produtos do usuário ${userId}:`, error);
      throw error;
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allProducts.push(...data);
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        from += pageSize;
      }
    }
  }

  return allProducts;
}

/**
 * Compara referências já existentes no catálogo do usuário destino contra o template de origem.
 * Identifica dados divergentes (ex: is_launch atualizado, preço novo, estoque alterado, imagens)
 * e aplica o update nos produtos existentes.
 */
export async function syncDivergentProducts({
  supabase,
  sourceUserId,
  targetUserId,
  brands = null,
  propertiesToSync = 'all',
  dryRun = false,
}: SyncDivergentOptions): Promise<SyncDivergentResult> {
  const normalizedProps = normalizePropertyNames(propertiesToSync);
  const fieldsToCheck: string[] =
    normalizedProps === 'all' ? [...SYNCABLE_FIELDS] : normalizedProps;

  // Seleciona colunas necessárias
  const colsToSelect = Array.from(
    new Set(['id', 'reference_code', 'brand', 'original_product_id', ...fieldsToCheck])
  ).join(',');

  // 1. Busca produtos de origem e destino
  const [sourceProducts, targetProducts] = await Promise.all([
    fetchAllUserProducts(supabase, sourceUserId, brands, colsToSelect),
    fetchAllUserProducts(supabase, targetUserId, brands, colsToSelect),
  ]);

  if (!sourceProducts || sourceProducts.length === 0 || !targetProducts || targetProducts.length === 0) {
    return {
      totalChecked: 0,
      divergentCount: 0,
      updatedCount: 0,
      changedProducts: [],
    };
  }

  // 2. Busca mapeamento existente em catalog_clones para correspondência rápida
  const targetIds = targetProducts.map((p) => p.id);
  const { data: cloneMappings } = await supabase
    .from('catalog_clones')
    .select('source_product_id, cloned_product_id')
    .eq('source_user_id', sourceUserId)
    .eq('target_user_id', targetUserId)
    .in('cloned_product_id', targetIds);

  const cloneMapByClonedId = new Map<string, string>();
  const cloneMapBySourceId = new Map<string, string>();
  if (Array.isArray(cloneMappings)) {
    for (const m of cloneMappings) {
      if (m.cloned_product_id && m.source_product_id) {
        cloneMapByClonedId.set(m.cloned_product_id, m.source_product_id);
        cloneMapBySourceId.set(m.source_product_id, m.cloned_product_id);
      }
    }
  }

  // 3. Indexa produtos de destino por:
  //    a) Brand + Reference Code (chave canônica)
  //    b) Reference Code
  //    c) Source Product ID mapeado
  const targetByBrandRef = new Map<string, any>();
  const targetByRef = new Map<string, any>();
  const targetBySourceId = new Map<string, any>();

  for (const tgt of targetProducts) {
    const ref = String(tgt.reference_code || '').trim().toLowerCase();
    const brand = String(tgt.brand || '').trim().toLowerCase();

    if (ref && brand) {
      targetByBrandRef.set(`${brand}:::${ref}`, tgt);
    }
    if (ref && !targetByRef.has(ref)) {
      targetByRef.set(ref, tgt);
    }
    if (tgt.original_product_id) {
      targetBySourceId.set(tgt.original_product_id, tgt);
    }
    const mappedSrcId = cloneMapByClonedId.get(tgt.id);
    if (mappedSrcId) {
      targetBySourceId.set(mappedSrcId, tgt);
    }
  }

  // 4. Compara cada produto da origem com o correspondente no destino
  const updatesToApply: Array<{
    targetId: string;
    sourceId: string;
    referenceCode: string;
    brand: string;
    payload: Record<string, any>;
    changedFields: string[];
  }> = [];

  const missingMappingsToInsert: Array<{
    source_product_id: string;
    cloned_product_id: string;
    source_user_id: string;
    target_user_id: string;
    created_at: string;
  }> = [];

  let totalChecked = 0;

  for (const src of sourceProducts) {
    const srcRef = String(src.reference_code || '').trim().toLowerCase();
    const srcBrand = String(src.brand || '').trim().toLowerCase();
    if (!srcRef) continue;

    totalChecked++;

    // Localiza produto correspondente no alvo
    let tgt =
      targetByBrandRef.get(`${srcBrand}:::${srcRef}`) ||
      targetBySourceId.get(src.id) ||
      targetByRef.get(srcRef);

    if (!tgt) continue;

    // Registra mapeamento em catalog_clones se ainda não existir
    if (!cloneMapByClonedId.has(tgt.id)) {
      missingMappingsToInsert.push({
        source_product_id: src.id,
        cloned_product_id: tgt.id,
        source_user_id: sourceUserId,
        target_user_id: targetUserId,
        created_at: new Date().toISOString(),
      });
      cloneMapByClonedId.set(tgt.id, src.id);
    }

    // Compara campos solicitados
    const changedFields: string[] = [];
    const payload: Record<string, any> = {};

    for (const field of fieldsToCheck) {
      const srcVal = src[field];
      const tgtVal = tgt[field];

      if (isValueDifferent(srcVal, tgtVal)) {
        changedFields.push(field);
        payload[field] = srcVal;
      }
    }

    if (changedFields.length > 0) {
      updatesToApply.push({
        targetId: tgt.id,
        sourceId: src.id,
        referenceCode: tgt.reference_code || src.reference_code,
        brand: tgt.brand || src.brand,
        payload,
        changedFields,
      });
    }
  }

  const divergentCount = updatesToApply.length;

  // 5. Se for dry-run (simulação), não grava nada no banco
  if (dryRun) {
    return {
      totalChecked,
      divergentCount,
      updatedCount: 0,
      changedProducts: updatesToApply.map((u) => ({
        targetId: u.targetId,
        referenceCode: u.referenceCode,
        brand: u.brand,
        changedFields: u.changedFields,
      })),
    };
  }

  // 6. Aplica updates nos produtos divergentes em lotes concorrentes
  const batchSize = 25;
  const now = new Date().toISOString();

  for (let i = 0; i < updatesToApply.length; i += batchSize) {
    const chunk = updatesToApply.slice(i, i + batchSize);
    await Promise.all(
      chunk.map((item) =>
        supabase
          .from('products')
          .update({
            ...item.payload,
            updated_at: now,
          })
          .eq('id', item.targetId)
      )
    );
  }

  // 7. Salva mapeamentos ausentes em catalog_clones
  if (missingMappingsToInsert.length > 0) {
    try {
      const cloneBatchSize = 100;
      for (let i = 0; i < missingMappingsToInsert.length; i += cloneBatchSize) {
        const chunk = missingMappingsToInsert.slice(i, i + cloneBatchSize);
        await supabase.from('catalog_clones').insert(chunk);
      }
    } catch (cloneErr) {
      console.warn('[syncDivergentProducts] Aviso ao inserir mappings em catalog_clones:', cloneErr);
    }
  }

  return {
    totalChecked,
    divergentCount,
    updatedCount: divergentCount,
    changedProducts: updatesToApply.map((u) => ({
      targetId: u.targetId,
      referenceCode: u.referenceCode,
      brand: u.brand,
      changedFields: u.changedFields,
    })),
  };
}

/**
 * Resolve organization_id e company_id do usuário destino
 */
async function resolveTargetOrgAndCompany(
  supabase: SupabaseClient,
  targetUserId: string
): Promise<{ targetOrgId: string | null; targetCompId: string | null }> {
  let targetOrgId: string | null = null;
  let targetCompId: string | null = null;

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, company_id')
      .eq('id', targetUserId)
      .maybeSingle();

    targetOrgId = profile?.organization_id || null;
    targetCompId = profile?.company_id || null;

    if (!targetOrgId) {
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_user_id', targetUserId)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (org?.id) targetOrgId = org.id;
    }

    if (!targetOrgId) {
      const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', targetUserId)
        .eq('status', 'active')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (member?.organization_id) targetOrgId = member.organization_id;
    }
  } catch (err) {
    console.warn('[cloneAndSyncCatalog] Erro ao resolver organização do destino:', err);
  }

  return { targetOrgId, targetCompId };
}

/**
 * Gera slug limpo e único para novo produto clonado
 */
function generateSlug(baseText: string, existingSlugs: Set<string>): string {
  const cleanBase =
    baseText
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'produto';

  let candidate = cleanBase;
  if (!existingSlugs.has(candidate)) {
    existingSlugs.add(candidate);
    return candidate;
  }

  let attempt = 0;
  while (attempt < 50) {
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    candidate = `${cleanBase}-${randomSuffix}`;
    if (!existingSlugs.has(candidate)) {
      existingSlugs.add(candidate);
      return candidate;
    }
    attempt++;
  }

  candidate = `${cleanBase}-${Date.now().toString(36)}`;
  existingSlugs.add(candidate);
  return candidate;
}

export interface CloneAndSyncOptions {
  supabase: SupabaseClient;
  sourceUserId: string;
  targetUserId: string;
  brands?: string[] | null;
  propertiesToSync?: string[] | 'all' | 'clone_safe';
  dryRun?: boolean;
}

export interface CloneAndSyncResult {
  insertedCount: number;
  updatedCount: number;
  totalProcessed: number;
  message: string;
}

/**
 * Operação completa de clonagem e sincronização direta:
 * 1) Insere produtos novos que o cliente ainda não possui (com fotos, metadados e slug único).
 * 2) Atualiza referências que o cliente já possui exclusivamente nos campos permitidos:
 *    price, sale_price, is_launch, sku, barcode (ean), is_active (status), description.
 * 3) Não depende de funções RPC sujeitas a divergência de tipos no schema cache.
 */
export async function cloneAndSyncCatalog({
  supabase,
  sourceUserId,
  targetUserId,
  brands = null,
  propertiesToSync = 'clone_safe',
  dryRun = false,
}: CloneAndSyncOptions): Promise<CloneAndSyncResult> {
  const { targetOrgId, targetCompId } = await resolveTargetOrgAndCompany(supabase, targetUserId);

  // Busca todos os produtos do template de origem
  const sourceProducts = await fetchAllUserProducts(supabase, sourceUserId, brands, '*');

  if (!sourceProducts || sourceProducts.length === 0) {
    return {
      insertedCount: 0,
      updatedCount: 0,
      totalProcessed: 0,
      message: 'Nenhum produto encontrado no catálogo de origem para as marcas selecionadas.',
    };
  }

  // Busca produtos existentes do destino para identificar o que já existe vs o que é novo
  const targetProducts = await fetchAllUserProducts(
    supabase,
    targetUserId,
    brands,
    'id,reference_code,brand,slug'
  );

  const targetExistingKeys = new Set<string>();
  const targetExistingRefs = new Set<string>();
  const targetExistingSlugs = new Set<string>();

  for (const tgt of targetProducts) {
    const ref = String(tgt.reference_code || '').trim().toLowerCase();
    const brand = String(tgt.brand || '').trim().toLowerCase();
    if (ref && brand) targetExistingKeys.add(`${brand}:::${ref}`);
    if (ref) targetExistingRefs.add(ref);
    if (tgt.slug) targetExistingSlugs.add(String(tgt.slug).toLowerCase());
  }

  // Separa o que precisa ser inserido como novidade (lançamento)
  const toInsert: any[] = [];
  for (const src of sourceProducts) {
    const srcRef = String(src.reference_code || '').trim().toLowerCase();
    const srcBrand = String(src.brand || '').trim().toLowerCase();

    if (srcRef && (targetExistingKeys.has(`${srcBrand}:::${srcRef}`) || targetExistingRefs.has(srcRef))) {
      // Já existe no catálogo do cliente
      continue;
    }
    toInsert.push(src);
  }

  let insertedCount = 0;

  // Insere novos produtos
  if (!dryRun && toInsert.length > 0) {
    const productsToInsert: any[] = [];
    const clonesToInsert: any[] = [];

    for (const src of toInsert) {
      const newId = crypto.randomUUID();
      const refOrName = src.reference_code || src.name || 'item';
      const cleanSlug = generateSlug(refOrName, targetExistingSlugs);

      const productPayload: Record<string, any> = {
        id: newId,
        reference_code: src.reference_code || null,
        reference_id: src.reference_id || src.reference_code || null,
        name: src.name || '',
        description: src.description || null,
        brand: src.brand || null,
        category: src.category || null,
        category_id: src.category_id || null,
        slug: cleanSlug,
        price: src.price ?? 0,
        original_price: src.original_price ?? null,
        sale_price: src.sale_price ?? null,
        cost: src.cost ?? null,
        discount_percent: src.discount_percent ?? null,
        image_url: src.image_url || null,
        external_image_url: src.external_image_url || null,
        image_path: src.image_path || null,
        images: src.images || null,
        gallery_images: src.gallery_images || null,
        image_variants: src.image_variants || null,
        image_optimized: src.image_optimized ?? null,
        image_is_shared: true,
        is_active: src.is_active ?? true,
        is_launch: src.is_launch ?? false,
        is_best_seller: src.is_best_seller ?? false,
        bestseller: src.bestseller ?? false,
        is_destaque: src.is_destaque ?? false,
        price_on_request: src.price_on_request ?? false,
        technical_specs: src.technical_specs || null,
        stock_quantity: src.stock_quantity ?? 0,
        track_stock: src.track_stock ?? false,
        manage_stock: src.manage_stock ?? false,
        min_stock_level: src.min_stock_level ?? null,
        sku: src.sku || null,
        barcode: src.barcode || null,
        color: src.color || null,
        gender: src.gender || null,
        class_core: src.class_core || null,
        short_id: src.short_id || null,
        original_product_id: src.id,
        sync_status: 'synced',
        user_id: targetUserId,
        organization_id: targetOrgId,
        company_id: targetCompId,
        source_organization_id: src.organization_id || null,
        material: src.material || null,
        polarizado: src.polarizado ?? false,
        fotocromatico: src.fotocromatico ?? false,
        material_haste: src.material_haste || null,
        colecao: src.colecao || null,
        frame_formato: src.frame_formato || null,
        color_nome: src.color_nome || null,
      };

      productsToInsert.push(productPayload);
      clonesToInsert.push({
        source_product_id: src.id,
        cloned_product_id: newId,
        source_user_id: sourceUserId,
        target_user_id: targetUserId,
        created_at: new Date().toISOString(),
      });
    }

    const insertChunkSize = 50;
    for (let i = 0; i < productsToInsert.length; i += insertChunkSize) {
      const chunk = productsToInsert.slice(i, i + insertChunkSize);
      const { error: insErr } = await supabase.from('products').insert(chunk);
      if (insErr) {
        console.warn('[cloneAndSyncCatalog] Falha no lote, tentando inserção com regeneração de slug:', insErr.message);
        for (const item of chunk) {
          const { error: singleErr } = await supabase.from('products').insert(item);
          if (singleErr) {
            item.slug = generateSlug(item.reference_code || item.name, targetExistingSlugs);
            const { error: retryErr } = await supabase.from('products').insert(item);
            if (!retryErr) insertedCount++;
          } else {
            insertedCount++;
          }
        }
      } else {
        insertedCount += chunk.length;
      }
    }

    for (let i = 0; i < clonesToInsert.length; i += 100) {
      const chunk = clonesToInsert.slice(i, i + 100);
      try {
        await supabase.from('catalog_clones').insert(chunk);
      } catch (cloneErr) {
        console.warn('[cloneAndSyncCatalog] Aviso ao salvar mapeamento catalog_clones:', cloneErr);
      }
    }
  } else if (dryRun) {
    insertedCount = toInsert.length;
  }

  // Sincroniza referências existentes nos campos permitidos (price, is_launch, sku, barcode, is_active, description)
  const syncResult = await syncDivergentProducts({
    supabase,
    sourceUserId,
    targetUserId,
    brands,
    propertiesToSync,
    dryRun,
  });

  const updatedCount = syncResult.divergentCount || syncResult.updatedCount;
  const totalProcessed = insertedCount + updatedCount;

  const msgParts: string[] = [];
  if (insertedCount > 0) msgParts.push(`${insertedCount} novos produtos adicionados`);
  if (updatedCount > 0) msgParts.push(`${updatedCount} produtos existentes atualizados`);

  const message =
    msgParts.length > 0
      ? `Sincronização concluída: ${msgParts.join(' e ')}.`
      : 'Catálogo já está sincronizado com o master.';

  return {
    insertedCount,
    updatedCount,
    totalProcessed,
    message,
  };
}
