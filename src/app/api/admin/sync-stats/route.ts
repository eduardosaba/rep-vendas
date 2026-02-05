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
    // 1. Estatísticas gerais por sync_status
    const statusQuery = supabase
      .from('products')
      .select('sync_status', { count: 'exact' });
    if (!isAdmin) statusQuery.eq('user_id', user.id);
    const { data: statusCounts } = await statusQuery;

    const stats = {
      pending: 0,
      processing: 0,
      synced: 0,
      failed: 0,
      total: statusCounts?.length || 0,
    };

    statusCounts?.forEach((p: { sync_status: string | null }) => {
      const status = p.sync_status || 'pending';
      if (status in stats) {
        stats[status as keyof typeof stats]++;
      }
    });

    // 2. Produtos com erro recente (últimos 20)
    const recentErrorsQuery = supabase
      .from('products')
      .select(
        'id, name, reference_code, sync_error, sync_status, updated_at, brand:brands(name)'
      )
      .eq('sync_status', 'failed')
      .order('updated_at', { ascending: false })
      .limit(20);
    if (!isAdmin) recentErrorsQuery.eq('user_id', user.id);
    const { data: recentErrors } = await recentErrorsQuery;

    // 3. Produtos pendentes por marca
    const pendingByBrandQuery = supabase
      .from('products')
      .select('brand:brands(name)', { count: 'exact' })
      .eq('sync_status', 'pending');
    if (!isAdmin) pendingByBrandQuery.eq('user_id', user.id);
    const { data: pendingByBrand } = await pendingByBrandQuery;

    const brandCounts: Record<string, number> = {};
    pendingByBrand?.forEach((p: any) => {
      const brandName = p.brand?.name || 'Sem marca';
      brandCounts[brandName] = (brandCounts[brandName] || 0) + 1;
    });

    // 4. Produtos recém-importados (últimas 24h) ainda pendentes
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const recentPendingQuery = supabase
      .from('products')
      .select('id, name, reference_code, created_at, brand:brands(name)')
      .eq('sync_status', 'pending')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })
      .limit(50);
    if (!isAdmin) recentPendingQuery.eq('user_id', user.id);
    const { data: recentPending } = await recentPendingQuery;

    // 5. Estatísticas de storage (opcional - pode ser pesado)
    const storageQuery = supabase
      .from('products')
      .select('image_path, image_variants')
      .eq('sync_status', 'synced')
      .not('image_path', 'is', null)
      .limit(1000); // Sample para cálculo
    if (!isAdmin) storageQuery.eq('user_id', user.id);
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
      pendingByBrand: Object.entries(brandCounts).map(([brand, count]) => ({
        brand,
        count,
      })),
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
