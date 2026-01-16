import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const targetUserId = body?.targetUserId ?? null;

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)
      return NextResponse.json(
        { error: 'Server not configured' },
        { status: 500 }
      );

    const supabase = createServiceClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token)
      return NextResponse.json({ error: 'Missing auth' }, { status: 401 });

    const { data: userResp } = await supabase.auth.getUser(token as any);
    const user = userResp?.user;
    if (!user)
      return NextResponse.json({ error: 'Invalid auth' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    const role = profile?.role || null;
    if (role !== 'master' && role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const cookieStore = await cookies();

    if (!targetUserId) {
      // clear impersonation
      try {
        cookieStore.delete('impersonate_user_id');
      } catch (e) {
        // ignore
      }
      return NextResponse.json({ success: true });
    }

    // set cookie for 2 hours
    try {
      cookieStore.set('impersonate_user_id', targetUserId, {
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
