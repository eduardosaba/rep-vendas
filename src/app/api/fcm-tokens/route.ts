import { NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const nextCookies = await cookies();
    const supabase = await createRouteSupabase(() => nextCookies);

    const body = await req.json();
    const { token, device_type } = body || {};

    if (!token) return NextResponse.json({ error: 'token is required' }, { status: 400 });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    // Upsert token for this user
    const { error } = await supabase
      .from('user_fcm_tokens')
      .upsert({ user_id: user.id, token, device_type }, { onConflict: 'token' });

    if (error) {
      console.error('Failed to upsert token', error);
      return NextResponse.json({ error: error.message || error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('fcm-tokens route error', err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
