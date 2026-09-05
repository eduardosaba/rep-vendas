import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const supabase = await createClient();

  // Verifica autenticação do usuário
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Não autorizado', { status: 401 });
  }

  // Verificar papel do usuário (admin/master têm visão global)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin = Boolean(
    profile && (profile.role === 'admin' || profile.role === 'master')
  );

  try {
    // 0. Destrava produtos estagnados em 'processing' há mais de 5 minutos
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    await supabase
      .from('products')
      .update({ sync_status: 'pending' })
      .eq('sync_status', 'processing')
      .lt('updated_at', fiveMinAgo);

    // 1. Busca produtos que necessitam de sincronização
    // (pendentes, com falha, sem image_path ou com URLs externas brutas não internalizadas)
    let query = supabase
      .from('products')
      .select('id, brand, sync_status, image_path, external_image_url, image_url, images, gallery_images');
    if (!isAdmin) query = query.eq('user_id', user.id);

    const { data: allProducts, error: fetchErr } = await query;

    if (fetchErr) {
      console.error('[sync-stats] Erro ao buscar produtos:', fetchErr);
    }

    const brandCounts: Record<string, number> = {};
    let pendingCount = 0;
    let failedCount = 0;
    let syncedCount = 0;
    let processingCount = 0;

    (allProducts || []).forEach((p: any) => {
      const st = p.sync_status || 'pending';

      const allUrls: string[] = [];
      if (p.external_image_url) allUrls.push(...String(p.external_image_url).split(/[;,]/));
      if (p.image_url) allUrls.push(...String(p.image_url).split(/[;,]/));
      if (Array.isArray(p.images)) allUrls.push(...p.images.map(String));
      else if (typeof p.images === 'string') allUrls.push(...p.images.split(/[;,]/));

      if (Array.isArray(p.gallery_images)) {
        for (const item of p.gallery_images) {
          if (typeof item === 'string') allUrls.push(item);
          else if (item?.url) allUrls.push(item.url);
        }
      }

      // Apenas produtos que possuem URLs externas HTTP (fora do Supabase Storage) entram na fila de sincronização
      const hasExternalUnsynced = allUrls.some(
        (u) => typeof u === 'string' && u.trim().startsWith('http') && !u.includes('.supabase.co')
      );

      if (hasExternalUnsynced) {
        if (st === 'processing') {
          processingCount++;
        } else if (st === 'failed') {
          failedCount++;
          pendingCount++;
          const brandName = typeof p.brand === 'string' ? p.brand : p.brand?.name || 'Sem marca';
          if (brandName) brandCounts[brandName] = (brandCounts[brandName] || 0) + 1;
        } else {
          pendingCount++;
          const brandName = typeof p.brand === 'string' ? p.brand : p.brand?.name || 'Sem marca';
          if (brandName) brandCounts[brandName] = (brandCounts[brandName] || 0) + 1;
        }
      } else {
        if (p.image_path || allUrls.length > 0) {
          syncedCount++;
        }
      }
    });

    const stats = {
      pending: pendingCount,
      processing: processingCount,
      synced: syncedCount,
      failed: failedCount,
      total: allProducts?.length || 0,
    };

    // 2. Produtos com erro recente (últimos 20)
    let recentErrorsQuery = supabase
      .from('products')
      .select('id, name, reference_code, sync_error, sync_status, updated_at, brand')
      .eq('sync_status', 'failed')
      .order('updated_at', { ascending: false })
      .limit(20);
    if (!isAdmin) recentErrorsQuery = recentErrorsQuery.eq('user_id', user.id);
    const { data: recentErrors } = await recentErrorsQuery;

    // 3. Produtos recém-importados (últimas 24h) ainda pendentes
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    let recentPendingQuery = supabase
      .from('products')
      .select('id, name, reference_code, created_at, brand')
      .or('sync_status.eq.pending,sync_status.eq.failed,image_path.is.null')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })
      .limit(50);
    if (!isAdmin) recentPendingQuery = recentPendingQuery.eq('user_id', user.id);
    const { data: recentPending } = await recentPendingQuery;

    // 4. Estatísticas de storage (amostra)
    let storageQuery = supabase
      .from('products')
      .select('image_path, image_variants')
      .eq('sync_status', 'synced')
      .not('image_path', 'is', null)
      .limit(1000);
    if (!isAdmin) storageQuery = storageQuery.eq('user_id', user.id);
    const { data: storageStats } = await storageQuery;

    let totalVariants = 0;
    storageStats?.forEach((p: any) => {
      if (p.image_variants && Array.isArray(p.image_variants)) {
        totalVariants += p.image_variants.length;
      }
    });

    return NextResponse.json({
      success: true,
      stats,
      recentErrors: recentErrors || [],
      pendingByBrand: Object.entries(brandCounts)
        .map(([brand, count]) => ({ brand, count }))
        .sort((a, b) => b.count - a.count),
      recentPending: recentPending || [],
      storage: {
        syncedProducts: storageStats?.length || 0,
        totalVariants,
        avgVariantsPerProduct: storageStats?.length
          ? (totalVariants / storageStats.length).toFixed(1)
          : 0,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    );
  }
}
