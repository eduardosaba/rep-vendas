import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { isGlobalAdmin } from '@/lib/auth/roles';
import crypto from 'crypto';

// Service Role Client para execução administrativa e bypass de RLS quando autorizado
function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createSupabaseClient(url, key);
}

// Struct do item no inventário
interface StorageInventoryItem {
  name: string;
  path: string; // Ex: "brands/boss/TH_2365.webp"
  size_bytes: number;
  size_kb: string;
  extension: string;
  status: 'in_use' | 'orphan' | 'unknown';
  public_url: string;
  updated_at: string;
  linked_details?: string[];
}

// Cache em memória para o inventário (5 minutos TTL)
interface InventoryCache {
  timestamp: number;
  items: StorageInventoryItem[];
  total_files: number;
  orphan_count: number;
  in_use_count: number;
  unknown_count: number;
  total_orphan_bytes: number;
}

let inventoryCache: InventoryCache | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Normaliza um caminho ou URL de armazenamento para seu formato relativo canônico
 * Ex: "https://.../product-images/public/brands/boss/foto.webp?w=480" => "brands/boss/foto.webp"
 */
function normalizeToCanonicalPath(rawPathOrUrl: string): string {
  if (!rawPathOrUrl) return '';
  let cleaned = decodeURIComponent(rawPathOrUrl.trim());
  // Strip query strings
  cleaned = cleaned.split('?')[0];

  // Extrai caminho após /product-images/ se for URL do Supabase Storage
  const bucketMarker = '/object/public/product-images/';
  const authBucketMarker = '/object/authenticated/product-images/';
  if (cleaned.includes(bucketMarker)) {
    cleaned = cleaned.substring(cleaned.indexOf(bucketMarker) + bucketMarker.length);
  } else if (cleaned.includes(authBucketMarker)) {
    cleaned = cleaned.substring(cleaned.indexOf(authBucketMarker) + authBucketMarker.length);
  } else if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    // Se for outra URL HTTP, tenta extrair caminho do bucket
    const parts = cleaned.split('/product-images/');
    if (parts.length > 1) {
      cleaned = parts[1];
    }
  }

  // Remove barras iniciais e prefixo public/
  cleaned = cleaned.replace(/^\/+/, '');
  if (cleaned.startsWith('public/')) {
    cleaned = cleaned.substring(7);
  }
  return cleaned;
}

/**
 * Monta conjunto de caminhos canônicos em uso consultando as fontes comprovadas no DB
 */
async function buildUrlsInUseSet(serviceSupabase: ReturnType<typeof getServiceSupabase>): Promise<Set<string>> {
  const urlsInUse = new Set<string>();

  const addPath = (raw: any) => {
    if (!raw) return;
    const str = String(raw);
    const canonical = normalizeToCanonicalPath(str);
    if (canonical) {
      urlsInUse.add(canonical);
      // Adiciona também forma com public/ se necessário
      urlsInUse.add(`public/${canonical}`);

      // Regra conservadora de família de imagem: extrair nome base antes de sufixos (-480w, -1200w, -main, -00)
      const baseStem = canonical.replace(/-(480w|1200w|main|00)(\.[a-z0-9]+)$/i, '$2');
      if (baseStem !== canonical) {
        urlsInUse.add(baseStem);
      }
    }
  };

  // 1. Tabela products (colunas comprovadas: image_path, image_url, images, image_variants, gallery_images)
  const { data: products, error: pErr } = await serviceSupabase
    .from('products')
    .select('image_path, image_url, images, image_variants, gallery_images');

  if (!pErr && products) {
    for (const p of products) {
      addPath(p.image_path);
      addPath(p.image_url);

      if (Array.isArray(p.images)) {
        p.images.forEach(addPath);
      }
      if (Array.isArray(p.image_variants)) {
        p.image_variants.forEach((v: any) => {
          if (v?.path) addPath(v.path);
          if (v?.url) addPath(v.url);
        });
      }
      if (Array.isArray(p.gallery_images)) {
        p.gallery_images.forEach((g: any) => {
          if (typeof g === 'string') addPath(g);
          else if (g?.path) addPath(g.path);
          else if (g?.url) addPath(g.url);
        });
      }
    }
  }

  // 2. Tabela product_images (colunas comprovadas: storage_path, url)
  const { data: prodImages, error: piErr } = await serviceSupabase
    .from('product_images')
    .select('storage_path, url');

  if (!piErr && prodImages) {
    for (const pi of prodImages) {
      addPath(pi.storage_path);
      addPath(pi.url);
    }
  }

  // 3. Tabela brands (coluna comprovada: image_path)
  const { data: brands, error: bErr } = await serviceSupabase
    .from('brands')
    .select('image_path');

  if (!bErr && brands) {
    for (const b of brands) {
      addPath(b.image_path);
    }
  }

  return urlsInUse;
}

/**
 * Varre o bucket product-images recursivamente e classifica cada arquivo
 */
async function fetchStorageInventory(
  serviceSupabase: ReturnType<typeof getServiceSupabase>,
  forceRefresh = false
): Promise<InventoryCache> {
  const now = Date.now();
  if (!forceRefresh && inventoryCache && now - inventoryCache.timestamp < CACHE_TTL_MS) {
    return inventoryCache;
  }

  // 1. Coleta conjunto de caminhos em uso no DB
  const urlsInUse = await buildUrlsInUseSet(serviceSupabase);

  // 2. Varredura recursiva do Storage
  async function listRecursive(prefix = ''): Promise<any[]> {
    const { data, error } = await serviceSupabase.storage
      .from('product-images')
      .list(prefix, { limit: 1000 });

    if (error || !data) return [];
    const result: any[] = [];
    for (const item of data) {
      if (item.name === '.emptyFolderPlaceholder') continue;
      const currentPath = prefix ? `${prefix}/${item.name}` : item.name;
      
      // Trata como pasta se não tiver ID/metadata e não tiver extensão
      if (!item.id && !item.name.includes('.')) {
        const sub = await listRecursive(currentPath);
        result.push(...sub);
      } else {
        result.push({
          ...item,
          path: currentPath,
        });
      }
    }
    return result;
  }

  const rawFiles = await listRecursive('');
  const items: StorageInventoryItem[] = [];

  let orphan_count = 0;
  let in_use_count = 0;
  let unknown_count = 0;
  let total_orphan_bytes = 0;

  for (const f of rawFiles) {
    const canonicalPath = normalizeToCanonicalPath(f.path);
    const sizeBytes = Number(f.metadata?.size || f.size || 0);
    const extMatch = f.name.match(/\.[a-z0-9]+$/i);
    const extension = extMatch ? extMatch[0].toLowerCase() : 'outro';

    // Regra de Proteção de Arquivos de Sistema e Prefixos fora do Escopo
    const isSystemOrTrash =
      canonicalPath.startsWith('trash/') ||
      canonicalPath.startsWith('logos/') ||
      canonicalPath.startsWith('avatars/') ||
      canonicalPath.startsWith('covers/') ||
      canonicalPath.startsWith('system/') ||
      f.name.includes('placeholder') ||
      f.name.includes('default-logo');

    let status: 'in_use' | 'orphan' | 'unknown' = 'orphan';

    if (isSystemOrTrash) {
      status = 'unknown'; // Protegido permanentemente
      unknown_count++;
    } else {
      // Checa se o caminho canônico ou variante pertence às URLs em uso
      const isLinked = urlsInUse.has(canonicalPath) || urlsInUse.has(`public/${canonicalPath}`);
      if (isLinked) {
        status = 'in_use';
        in_use_count++;
      } else {
        status = 'orphan';
        orphan_count++;
        total_orphan_bytes += sizeBytes;
      }
    }

    const { data: pubData } = serviceSupabase.storage
      .from('product-images')
      .getPublicUrl(f.path);

    items.push({
      name: f.name,
      path: f.path,
      size_bytes: sizeBytes,
      size_kb: (sizeBytes / 1024).toFixed(2),
      extension,
      status,
      public_url: pubData?.publicUrl || '',
      updated_at: f.updated_at || f.created_at || new Date().toISOString(),
    });
  }

  inventoryCache = {
    timestamp: now,
    items,
    total_files: items.length,
    orphan_count,
    in_use_count,
    unknown_count,
    total_orphan_bytes,
  };

  return inventoryCache;
}

/**
 * GET: Retorna lista paginada e filtrada do inventário de Storage
 */
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Autorização Canônica: apenas administradores globais (master / admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'master') {
      return NextResponse.json(
        { error: 'Acesso negado. Requer permissão exclusiva de usuário master.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(250, Math.max(1, parseInt(searchParams.get('page_size') || '25', 10)));
    const statusFilter = searchParams.get('status') || 'all'; // 'all' | 'orphan' | 'in_use' | 'unknown'
    const extensionFilter = searchParams.get('extension') || 'all';
    const searchQuery = (searchParams.get('search') || '').trim().toLowerCase();
    const sortBy = searchParams.get('sort') || 'size_desc'; // 'size_desc' | 'size_asc' | 'name_asc' | 'name_desc' | 'date_desc' | 'date_asc'
    const forceRefresh = searchParams.get('refresh') === 'true';

    const serviceSupabase = getServiceSupabase();
    const inventory = await fetchStorageInventory(serviceSupabase, forceRefresh);

    // Filtragem no Backend
    let filtered = inventory.items;

    if (statusFilter !== 'all') {
      filtered = filtered.filter((i) => i.status === statusFilter);
    }

    if (extensionFilter !== 'all') {
      if (extensionFilter === 'others') {
        const known = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
        filtered = filtered.filter((i) => !known.includes(i.extension));
      } else {
        filtered = filtered.filter((i) => i.extension === extensionFilter.toLowerCase());
      }
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (i) => i.name.toLowerCase().includes(searchQuery) || i.path.toLowerCase().includes(searchQuery)
      );
    }

    // Ordenação no Backend
    filtered.sort((a, b) => {
      if (sortBy === 'size_desc') return b.size_bytes - a.size_bytes;
      if (sortBy === 'size_asc') return a.size_bytes - b.size_bytes;
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
      if (sortBy === 'date_desc') return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      if (sortBy === 'date_asc') return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      return 0;
    });

    const total_items = filtered.length;
    const total_pages = Math.ceil(total_items / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const itemsPage = filtered.slice(startIndex, startIndex + pageSize);

    return NextResponse.json({
      items: itemsPage,
      page,
      page_size: pageSize,
      total_items,
      total_pages,
      total_files: inventory.total_files,
      orphan_count: inventory.orphan_count,
      in_use_count: inventory.in_use_count,
      unknown_count: inventory.unknown_count,
      total_orphan_bytes: inventory.total_orphan_bytes,
    });
  } catch (err: any) {
    console.error('Storage Cleanup GET Error:', err);
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}

/**
 * POST: Gerencia ações de 'summary', 'trash' e 'restore'
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'master') {
      return NextResponse.json(
        { error: 'Acesso negado. Requer permissão exclusiva de usuário master.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const action = body.action; // 'summary' | 'trash' | 'restore'
    const serviceSupabase = getServiceSupabase();

    // ------------------------------------------------------------------------
    // 1. AÇÃO: SUMMARY (Gera token_hash, grava seleção exata no DB e valida limite <= 500)
    // ------------------------------------------------------------------------
    if (action === 'summary') {
      const { status = 'orphan', extension = 'all', search = '', paths } = body;

      let targetItems: StorageInventoryItem[] = [];

      if (Array.isArray(paths) && paths.length > 0) {
        // Seleção explícita individual do cliente
        const inventory = await fetchStorageInventory(serviceSupabase, true);
        const setPaths = new Set<string>(paths);
        targetItems = inventory.items.filter((i) => setPaths.has(i.path));
      } else {
        // Seleção por filtros
        const inventory = await fetchStorageInventory(serviceSupabase, true);
        targetItems = inventory.items;

        if (status !== 'all') {
          targetItems = targetItems.filter((i) => i.status === status);
        }
        if (extension !== 'all') {
          targetItems = targetItems.filter((i) => i.extension === extension.toLowerCase());
        }
        if (search) {
          const sq = search.toLowerCase();
          targetItems = targetItems.filter((i) => i.name.toLowerCase().includes(sq) || i.path.toLowerCase().includes(sq));
        }
      }

      // Validação do Limite Rígido de 500 itens
      if (targetItems.length === 0) {
        return NextResponse.json({ error: 'Nenhum arquivo encontrado para a seleção solicitada.' }, { status: 400 });
      }

      if (targetItems.length > 500) {
        return NextResponse.json(
          {
            error: `O limite máximo por operação é de 500 arquivos. Sua seleção contém ${targetItems.length} arquivos. Refine os filtros ou opera em lotes menores.`,
          },
          { status: 400 }
        );
      }

      // Gera token criptográfico único
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutos

      const totalBytes = targetItems.reduce((sum, item) => sum + item.size_bytes, 0);

      // Agrupamento por extensão para o resumo
      const extensionsBreakdown: Record<string, number> = {};
      const affectedPrefixesSet = new Set<string>();

      targetItems.forEach((item) => {
        extensionsBreakdown[item.extension] = (extensionsBreakdown[item.extension] || 0) + 1;
        const prefix = item.path.includes('/') ? item.path.split('/')[0] : 'root';
        affectedPrefixesSet.add(prefix);
      });

      // Salva a operação no PostgreSQL
      const { data: opData, error: opErr } = await serviceSupabase
        .from('storage_cleanup_operations')
        .insert({
          user_id: user.id,
          operation_type: 'move_to_trash',
          filter_snapshot: { status, extension, search, paths_count: targetItems.length },
          total_items: targetItems.length,
          total_bytes: totalBytes,
          status: 'pending',
          token_hash: tokenHash,
          expires_at: expiresAt,
        })
        .select('id')
        .single();

      if (opErr || !opData) {
        console.error('Erro ao salvar storage_cleanup_operations:', opErr);
        return NextResponse.json({ error: 'Erro ao registrar operação no banco de dados' }, { status: 500 });
      }

      const operationId = opData.id;

      // Inserção da SELEÇÃO EXATA dos itens em storage_cleanup_items
      const itemsToInsert = targetItems.map((item) => ({
        operation_id: operationId,
        bucket: 'product-images',
        original_path: item.path,
        trash_path: `trash/${operationId}/${item.path}`,
        size_bytes: item.size_bytes,
        moved_by: user.id,
        status: 'pending',
      }));

      const { error: itemsErr } = await serviceSupabase.from('storage_cleanup_items').insert(itemsToInsert);

      if (itemsErr) {
        console.error('Erro ao salvar storage_cleanup_items:', itemsErr);
        return NextResponse.json({ error: 'Erro ao gravar itens da operação no banco de dados' }, { status: 500 });
      }

      // Retorna o token em texto puro UMA ÚNICA VEZ ao frontend
      return NextResponse.json({
        success: true,
        operation_id: operationId,
        token: rawToken,
        total_items: targetItems.length,
        total_bytes: totalBytes,
        total_mb: (totalBytes / (1024 * 1024)).toFixed(2),
        extensions_breakdown: extensionsBreakdown,
        affected_prefixes: Array.from(affectedPrefixesSet),
        expires_at: expiresAt,
      });
    }

    // ------------------------------------------------------------------------
    // 2. AÇÃO: TRASH (Mover para lixeira com validação de token, consumo único e máquina de estados)
    // ------------------------------------------------------------------------
    if (action === 'trash') {
      const { operation_id, token } = body;

      if (!operation_id || !token) {
        return NextResponse.json({ error: 'operation_id e token são obrigatórios.' }, { status: 400 });
      }

      // Validação do token_hash
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const { data: opRow, error: fetchOpErr } = await serviceSupabase
        .from('storage_cleanup_operations')
        .select('*')
        .eq('id', operation_id)
        .eq('token_hash', tokenHash)
        .maybeSingle();

      if (fetchOpErr || !opRow) {
        return NextResponse.json({ error: 'Operação inválida ou token não encontrado.' }, { status: 400 });
      }

      if (opRow.user_id !== user.id) {
        return NextResponse.json({ error: 'Operação pertence a outro usuário.' }, { status: 403 });
      }

      if (new Date(opRow.expires_at).getTime() < Date.now()) {
        return NextResponse.json({ error: 'Token de operação expirado. Solicite nova confirmação.' }, { status: 400 });
      }

      if (opRow.status !== 'pending') {
        return NextResponse.json({ error: 'Token já utilizado ou operação em andamento/concluída.' }, { status: 400 });
      }

      // Consome o token alterando status para 'processing' (previne reutilização / replay attacks)
      await serviceSupabase
        .from('storage_cleanup_operations')
        .update({ status: 'processing' })
        .eq('id', operation_id);

      // Busca os itens exatamente gravados no sumário
      const { data: dbItems, error: itemsFetchErr } = await serviceSupabase
        .from('storage_cleanup_items')
        .select('*')
        .eq('operation_id', operation_id);

      if (itemsFetchErr || !dbItems || dbItems.length === 0) {
        return NextResponse.json({ error: 'Nenhum item encontrado para esta operação.' }, { status: 404 });
      }

      // Coleta urls em uso para o Double-Lock Check imediato
      const urlsInUse = await buildUrlsInUseSet(serviceSupabase);

      let movedCount = 0;
      let protectedCount = 0;
      let failedCount = 0;

      for (const item of dbItems) {
        try {
          const canonical = normalizeToCanonicalPath(item.original_path);

          // Double-Lock Check imediato antes de mover
          const isLinked = urlsInUse.has(canonical) || urlsInUse.has(`public/${canonical}`);
          if (isLinked) {
            protectedCount++;
            await serviceSupabase
              .from('storage_cleanup_items')
              .update({ status: 'protected', error_message: 'Vínculo detectado durante o Double-Lock Check' })
              .eq('id', item.id);
            continue;
          }

          // Atualiza estado para copying
          await serviceSupabase
            .from('storage_cleanup_items')
            .update({ status: 'copying' })
            .eq('id', item.id);

          // Copia arquivo para o caminho da lixeira: trash/{operationId}/{originalPath}
          const { error: copyErr } = await serviceSupabase.storage
            .from('product-images')
            .copy(item.original_path, item.trash_path);

          if (copyErr) {
            // Se falhou por já existir no trash e origem ainda existir, tenta continuar
            if (!copyErr.message?.includes('already exists')) {
              failedCount++;
              await serviceSupabase
                .from('storage_cleanup_items')
                .update({ status: 'failed', failed_step: 'copying', error_message: copyErr.message })
                .eq('id', item.id);
              continue;
            }
          }

          // Cópia bem-sucedida ou já existente -> Atualiza estado para source_delete_pending
          await serviceSupabase
            .from('storage_cleanup_items')
            .update({ status: 'source_delete_pending' })
            .eq('id', item.id);

          // Remove o arquivo de origem
          const { error: removeErr } = await serviceSupabase.storage
            .from('product-images')
            .remove([item.original_path]);

          if (removeErr) {
            failedCount++;
            await serviceSupabase
              .from('storage_cleanup_items')
              .update({
                status: 'failed',
                failed_step: 'source_delete_pending',
                error_message: `Cópia criada no trash, mas remoção da origem falhou: ${removeErr.message}`,
              })
              .eq('id', item.id);
          } else {
            movedCount++;
            await serviceSupabase
              .from('storage_cleanup_items')
              .update({ status: 'in_trash', moved_at: new Date().toISOString() })
              .eq('id', item.id);
          }
        } catch (itemErr: any) {
          failedCount++;
          await serviceSupabase
            .from('storage_cleanup_items')
            .update({ status: 'failed', failed_step: 'unknown', error_message: String(itemErr) })
            .eq('id', item.id);
        }
      }

      const finalStatus = failedCount > 0 ? 'partially_failed' : 'completed';
      await serviceSupabase
        .from('storage_cleanup_operations')
        .update({ status: finalStatus })
        .eq('id', operation_id);

      // Invalida cache de inventário em memória
      inventoryCache = null;

      return NextResponse.json({
        success: true,
        operation_id,
        moved: movedCount,
        protected: protectedCount,
        failed: failedCount,
        status: finalStatus,
      });
    }

    // ------------------------------------------------------------------------
    // 3. AÇÃO: RESTORE (Restaurar arquivos da lixeira)
    // ------------------------------------------------------------------------
    if (action === 'restore') {
      const { operation_id, item_ids } = body;

      let query = serviceSupabase.from('storage_cleanup_items').select('*').eq('status', 'in_trash');

      if (operation_id) {
        query = query.eq('operation_id', operation_id);
      } else if (Array.isArray(item_ids) && item_ids.length > 0) {
        query = query.in('id', item_ids);
      } else {
        return NextResponse.json({ error: 'operation_id ou item_ids são necessários.' }, { status: 400 });
      }

      const { data: itemsToRestore, error: fetchErr } = await query;

      if (fetchErr || !itemsToRestore || itemsToRestore.length === 0) {
        return NextResponse.json({ error: 'Nenhum item na lixeira para restaurar.' }, { status: 404 });
      }

      let restoredCount = 0;
      let conflictCount = 0;
      let failedCount = 0;

      for (const item of itemsToRestore) {
        try {
          // Checa se o original_path já existe no Storage para impedir colisão/sobrescrita
          const dirPath = item.original_path.includes('/')
            ? item.original_path.substring(0, item.original_path.lastIndexOf('/'))
            : '';
          const fileName = item.original_path.split('/').pop() || '';

          const { data: existingFiles } = await serviceSupabase.storage
            .from('product-images')
            .list(dirPath, { search: fileName });

          const exists = (existingFiles || []).some((f) => f.name === fileName);

          if (exists) {
            conflictCount++;
            await serviceSupabase
              .from('storage_cleanup_items')
              .update({
                status: 'conflict',
                error_message: 'Restauracao bloqueada: o caminho de destino original ja esta ocupado',
              })
              .eq('id', item.id);
            continue;
          }

          // Marca como restoring
          await serviceSupabase
            .from('storage_cleanup_items')
            .update({ status: 'restoring' })
            .eq('id', item.id);

          // Copia da lixeira para o caminho original
          const { error: copyErr } = await serviceSupabase.storage
            .from('product-images')
            .copy(item.trash_path, item.original_path);

          if (copyErr) {
            failedCount++;
            await serviceSupabase
              .from('storage_cleanup_items')
              .update({ status: 'failed', failed_step: 'restoring', error_message: copyErr.message })
              .eq('id', item.id);
            continue;
          }

          // Remove o item da lixeira
          await serviceSupabase.storage.from('product-images').remove([item.trash_path]);

          restoredCount++;
          await serviceSupabase
            .from('storage_cleanup_items')
            .update({ status: 'restored', restored_at: new Date().toISOString() })
            .eq('id', item.id);
        } catch (restErr: any) {
          failedCount++;
          await serviceSupabase
            .from('storage_cleanup_items')
            .update({ status: 'failed', failed_step: 'restore', error_message: String(restErr) })
            .eq('id', item.id);
        }
      }

      inventoryCache = null;

      return NextResponse.json({
        success: true,
        restored: restoredCount,
        conflict: conflictCount,
        failed: failedCount,
      });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (err: any) {
    console.error('Storage Cleanup POST Error:', err);
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}

/**
 * DELETE: Retorna 405 Method Not Allowed (Exclusão permanente desabilitada na versão 1)
 */
export async function DELETE() {
  return NextResponse.json(
    {
      error:
        'Exclusão permanente desabilitada na versão 1. Utilize a movimentação para lixeira e restauração.',
    },
    { status: 405 }
  );
}
