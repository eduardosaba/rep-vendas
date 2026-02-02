import { NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase/server';

// Simple in-memory cache to reduce DB load for frequent requests.
// Note: this is process-local and not suitable as a long-term cache in serverless environments,
// but helps during dev and on single-instance deployments.
const statsCache = new Map<string, { ts: number; data: any }>();
const STATS_CACHE_TTL_MS = 60 * 1000; // 60 seconds

function formatDate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const range = parseInt(url.searchParams.get('range') || '30', 10);
    const supabase = await createRouteSupabase();
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId)
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

    // Try to serve from cache
    const cacheKey = `${userId}:${range}`;
    const cached = statsCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < STATS_CACHE_TTL_MS) {
      return NextResponse.json(cached.data);
    }

    const since = new Date();
    since.setDate(since.getDate() - (range - 1));
    since.setHours(0, 0, 0, 0);

    // Fetch user's short links
    const { data: links } = await supabase
      .from('short_links')
      .select('id, created_at')
      .eq('user_id', userId);

    const linkIds = (links || []).map((l: any) => l.id).filter(Boolean);

    // Fetch clicks for those links in range
    let clicks: any[] = [];
    if (linkIds.length > 0) {
      const { data: clicksData } = await supabase
        .from('short_link_clicks')
        .select('created_at, short_link_id')
        .in('short_link_id', linkIds)
        .gte('created_at', since.toISOString());
      clicks = clicksData || [];
    }

    // Aggregate clicks per day
    const clicksByDay: Record<string, number> = {};
    clicks.forEach((c: any) => {
      const d = formatDate(new Date(c.created_at));
      clicksByDay[d] = (clicksByDay[d] || 0) + 1;
    });

    // Aggregate created links per day
    const createdByDay: Record<string, number> = {};
    (links || []).forEach((l: any) => {
      if (!l.created_at) return;
      const created = new Date(l.created_at);
      if (created < since) return;
      const d = formatDate(created);
      createdByDay[d] = (createdByDay[d] || 0) + 1;
    });

    // Build series for each day in range
    const seriesDays: { day: string; clicks: number; links_created: number }[] =
      [];
    for (let i = 0; i < range; i++) {
      const day = new Date(since);
      day.setDate(since.getDate() + i);
      const key = formatDate(day);
      seriesDays.push({
        day: key,
        clicks: clicksByDay[key] || 0,
        links_created: createdByDay[key] || 0,
      });
    }

    const resp = { range, series: seriesDays };
    try {
      statsCache.set(cacheKey, { ts: Date.now(), data: resp });
    } catch (e) {
      // ignore cache failures
    }
    return NextResponse.json(resp);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
