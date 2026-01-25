import { NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const supabase = await createRouteSupabase();
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;

    if (!userId)
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

    const { data, error } = await supabase.rpc('get_clicks_last_7_days', {
      p_user_id: userId,
    });
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
