import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, password, checkOnly } = body || {};

    if (!userId)
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

    // Determine whether a password is configured on the server for this user
    const configured = !!(
      (settings &&
        ((settings as any).price_password ||
          (settings as any).price_password_hash)) ||
      ((publicCatalog as any) && (publicCatalog as any).price_password_hash)
    );

    // If the caller only wants to know whether a password is configured,
    // return early with that information (no password required).
    if (checkOnly) {
      return NextResponse.json({ ok: true, configured });
    }

    // At this point, a real password string is required to perform verification
    if (typeof password !== 'string')
      return NextResponse.json(
        { ok: false, error: 'invalid_payload' },
        { status: 400 }
      );

    // ✅ CRÍTICO: Senha vazia NÃO valida
    const plain = String(password).trim();
    if (!plain || plain.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'empty_password' },
        { status: 400 }
      );
    }

    // 1) check plain password (settings)
    if (settings && (settings as any).price_password) {
      if (plain === (settings as any).price_password)
        return NextResponse.json({ ok: true, configured: true });
    }

    // 2) check hash (settings or public_catalogs)
    const hashToCheck =
      (settings as any)?.price_password_hash ||
      (publicCatalog as any)?.price_password_hash;
    if (hashToCheck) {
      // Support both bcrypt (recommended) and legacy SHA256.
      try {
        const isBcrypt = String(hashToCheck).startsWith('$2');
        let match = false;
        if (isBcrypt) {
          match = await bcrypt.compare(plain, String(hashToCheck));
        } else {
          const legacyHash = crypto.createHash('sha256').update(plain).digest('hex');
          match = legacyHash === String(hashToCheck);
        }

        if (match) {
          // If legacy SHA256 matched, migrate to bcrypt lazily.
          if (!String(hashToCheck).startsWith('$2')) {
            try {
              const newHash = await bcrypt.hash(plain, 10);
              // Prefer updating `settings` when available, otherwise `public_catalogs`.
              if ((settings as any)?.price_password_hash) {
                await admin
                  .from('settings')
                  .update({ price_password_hash: newHash })
                  .eq('user_id', userId);
              } else if ((publicCatalog as any)?.price_password_hash) {
                await admin
                  .from('public_catalogs')
                  .update({ price_password_hash: newHash })
                  .eq('user_id', userId);
              }
            } catch (mErr) {
              console.warn('Failed to migrate legacy password to bcrypt:', mErr);
            }
          }

          return NextResponse.json({ ok: true, configured: true });
        }
      } catch (e) {
        console.error('Error while verifying password hash:', e);
      }
    }

    // If we reach here, password is incorrect. Inform caller whether a
    // password is configured on the server so the client can avoid trial
    // bypasses when a password actually exists remotely.
    return NextResponse.json({ ok: false, configured });
  } catch (err) {
    console.error('verify-password error', err);
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 });
  }
}
