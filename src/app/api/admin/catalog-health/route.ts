import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * API: retorna estatísticas de saúde do catálogo por estado
 * Acesso: master, admin
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user)
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const role = profile?.role || null;
    if (role !== 'master') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas master.' },
        { status: 403 }
      );
    }

    // lê query params: days, state, brand
    const url = new URL(request.url);
    const daysParam = url.searchParams.get('days');
    const stateFilter = url.searchParams.get('state');
    const brandFilter = url.searchParams.get('brand');

    const p_days = daysParam ? parseInt(daysParam, 10) : 90;

    const { data, error } = await supabase.rpc('get_catalog_detailed_stats', {
      p_days,
    });
    if (error) throw error;

    let stats = (data || []) as any[];

    if (stateFilter) {
      stats = stats.filter(
        (s) => (s.state || '').toLowerCase() === stateFilter.toLowerCase()
      );
    }

    if (brandFilter) {
      // brands_out_of_sync is JSONB object mapping brand->count
      stats = stats.filter((s) => {
        try {
          const obj = s.brands_out_of_sync || {};
          return Object.keys(obj).some(
            (b) => b.toLowerCase() === brandFilter.toLowerCase()
          );
        } catch (_) {
          return false;
        }
      });
    }

    return NextResponse.json({ success: true, stats });
  } catch (err: any) {
    console.error('Erro ao obter catalog health stats:', err);
    return NextResponse.json(
      { error: err.message || 'Erro interno' },
      { status: 500 }
    );
  }
}
