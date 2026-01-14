import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId } = body || {};
    if (!userId)
      return NextResponse.json(
        { ok: false, error: 'missing_userId' },
        { status: 400 }
      );

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { ok: false, error: 'server_misconfigured' },
        { status: 500 }
      );
    }

    const admin = createSupabaseClient(
      String(SUPABASE_URL),
      String(SUPABASE_SERVICE_ROLE_KEY)
    );

    // Prefer settings.phone (private) then public_catalogs.phone
    const { data: settings } = await admin
      .from('settings')
      .select('phone')
      .eq('user_id', userId)
      .maybeSingle();

    if (settings && (settings as any).phone) {
      return NextResponse.json({ ok: true, phone: (settings as any).phone });
    }

    const { data: pub } = await admin
      .from('public_catalogs')
      .select('phone')
      .eq('user_id', userId)
      .maybeSingle();

    if (pub && (pub as any).phone)
      return NextResponse.json({ ok: true, phone: (pub as any).phone });

    return NextResponse.json({ ok: true, phone: null });
  } catch (err) {
    console.error('representative-contact error', err);
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 });
  }
}
