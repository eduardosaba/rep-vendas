import { NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase/server';

function formatDate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function extractTotalViews(catalog: any): number {
  const candidates = [
    catalog?.total_views,
    catalog?.views_count,
    catalog?.clicks_count,
    catalog?.access_count,
    catalog?.visits_count,
  ];
  for (const v of candidates) {
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 0;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const range = Math.max(7, Math.min(90, parseInt(url.searchParams.get('range') || '30', 10)));

    const supabase = await createRouteSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
    }

    const { data: rows, error } = await supabase
      .from('public_catalogs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const catalog = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    const totalViews = extractTotalViews(catalog);

    const since = new Date();
    since.setDate(since.getDate() - (range - 1));
    since.setHours(0, 0, 0, 0);

    // Fallback series: sem tabela diária, mostramos acumulado no dia atual.
    const todayKey = formatDate(new Date());
    const series = [] as Array<{ day: string; views: number }>;
    for (let i = 0; i < range; i++) {
      const day = new Date(since);
      day.setDate(since.getDate() + i);
      const key = formatDate(day);
      series.push({ day: key, views: key === todayKey ? totalViews : 0 });
    }

    return NextResponse.json({
      range,
      total_views: totalViews,
      series,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
