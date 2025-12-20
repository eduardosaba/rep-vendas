import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  return createClient(url, key);
}

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

    const supabaseAdmin = getSupabaseAdmin();

    // Cria o usuário via Admin
    // supabase-js v2: auth.admin.createUser
    // inclui senha e metadata
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (error) {
      console.error('[API /admin/create-user] Auth error:', error);
      return NextResponse.json(
        { success: false, error: error.message || String(error) },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, user: data.user ?? data });
  } catch (err: any) {
    console.error('[API /admin/create-user] Exception:', err);
    return NextResponse.json(
      { success: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
