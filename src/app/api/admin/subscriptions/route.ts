import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn('[API /admin/subscriptions] service role not present');
    return null;
  }
  return createClient(url, key);
}

export async function GET() {
  try {
    let supabase = getSupabaseAdmin();

    // if service role not available, attempt anon fallback for safe reads
    if (!supabase) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !anon) {
        console.warn(
          '[API /admin/subscriptions GET] Supabase envs missing, returning empty list'
        );
        return NextResponse.json([]);
      }
      supabase = createClient(url, anon);
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .select('user_id, current_period_end, status');
    if (error) {
      console.error('[API /admin/subscriptions GET] Supabase error:', error);
      // Return empty list to avoid breaking admin UI when reading subscriptions fails
      return NextResponse.json([]);
    }
    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error('[API /admin/subscriptions GET] Exception:', err);
    return NextResponse.json([], { status: 200 });
  }
}
