import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  // Autenticação básica (pode melhorar com verificação de role)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || '';

  if (authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Não autorizado', { status: 401 });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  try {
    // 1. Estatísticas gerais por sync_status
    const { data: statusCounts } = await supabase
      .from('products')
      .select('sync_status', { count: 'exact' });

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
    const { data: recentErrors } = await supabase
      .from('products')
      .select(
        'id, name, reference_code, sync_error, sync_status, updated_at, brand:brands(name)'
      )
      .eq('sync_status', 'failed')
      .order('updated_at', { ascending: false })
      .limit(20);

    // 3. Produtos pendentes por marca
    const { data: pendingByBrand } = await supabase
      .from('products')
      .select('brand:brands(name)', { count: 'exact' })
      .eq('sync_status', 'pending');

    const brandCounts: Record<string, number> = {};
    pendingByBrand?.forEach((p: any) => {
      const brandName = p.brand?.name || 'Sem marca';
      brandCounts[brandName] = (brandCounts[brandName] || 0) + 1;
    });

    // 4. Produtos recém-importados (últimas 24h) ainda pendentes
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const { data: recentPending } = await supabase
      .from('products')
      .select('id, name, reference_code, created_at, brand:brands(name)')
      .eq('sync_status', 'pending')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    // 5. Estatísticas de storage (opcional - pode ser pesado)
    const { data: storageStats } = await supabase
      .from('products')
      .select('image_path, image_variants')
      .eq('sync_status', 'synced')
      .not('image_path', 'is', null)
      .limit(1000); // Sample para cálculo

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
