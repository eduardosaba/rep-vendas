import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, full_name } = body || {};

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'missing_fields' },
        { status: 400 }
      );
    }

    const env = (globalThis as any).process?.env ?? {};
    const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY =
      env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { success: false, error: 'missing_service_key' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        global: { fetch: (globalThis as any).fetch ?? fetch },
      }
    );

    // Cria o usuário via Admin
    // supabase-js v2: auth.admin.createUser
    // inclui senha e metadata
    const { data, error } = await (supabaseAdmin.auth as any).admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message || error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, user: data.user ?? data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || String(err) },
      { status: 500 }
    );
  }
}
