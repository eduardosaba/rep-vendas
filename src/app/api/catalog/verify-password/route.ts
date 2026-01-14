import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, password } = body || {};

    if (!userId || typeof password !== 'string')
      return NextResponse.json(
        { ok: false, error: 'invalid_payload' },
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

    // Prefer settings (private) where plain price_password might be stored
    const { data: settings } = await admin
      .from('settings')
      .select('price_password, price_password_hash')
      .eq('user_id', userId)
      .maybeSingle();

    // also check public_catalogs if exists (some installs store the hash there)
    const { data: publicCatalog } = await admin
      .from('public_catalogs')
      .select('price_password_hash')
      .eq('user_id', userId)
      .maybeSingle();

    const plain = String(password).trim();

    // 1) check plain password (settings)
    if (settings && (settings as any).price_password) {
      if (plain === (settings as any).price_password)
        return NextResponse.json({ ok: true });
    }

    // 2) check hash (settings or public_catalogs)
    const hashToCheck =
      (settings as any)?.price_password_hash ||
      (publicCatalog as any)?.price_password_hash;
    if (hashToCheck) {
      const hash = crypto.createHash('sha256').update(plain).digest('hex');
      if (hash === hashToCheck) return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false });
  } catch (err) {
    console.error('verify-password error', err);
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 });
  }
}
