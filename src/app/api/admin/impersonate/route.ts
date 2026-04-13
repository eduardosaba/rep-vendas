import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteSupabase } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const targetUserId = body?.targetUserId ?? null;

    // Use server-side supabase client that reads cookies so auth works
    // when browser sends the session cookie (no Authorization header).
    const cookieStore = await cookies();
    const supabase = await createRouteSupabase(() => cookieStore);

    const { data: userResp } = await supabase.auth.getUser();
    const user = userResp?.user;
    if (!user) return NextResponse.json({ error: 'Missing auth' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    const role = profile?.role || null;
    const allowedRoles = [
      'master',
      'admin',
      'template',
      'rep',
      'representative',
    ];
    if (!role || !allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const impersonateCookieName =
      process.env.IMPERSONATE_COOKIE_NAME || 'impersonate_user_id';

    if (!targetUserId) {
      // clear impersonation
      try {
        cookieStore.delete(impersonateCookieName);
      } catch (e) {
        // ignore
      }
      return NextResponse.json({ success: true });
    }

    // set cookie for 2 hours
    try {
      cookieStore.set(impersonateCookieName, targetUserId, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 2,
      });
    } catch (e) {
      // some runtimes may not support cookie.set directly
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('impersonate error', err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
