import { NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, slug, company_id, email, phone } = body;
    if (!name || !slug || !company_id) return NextResponse.json({ success: false, error: 'name, slug and company_id required' }, { status: 400 });

    const { data, error } = await supabaseAdmin.from('profiles').insert({ full_name: name, slug, company_id, role: 'rep_company', email: email || null, phone: phone || null }).select().maybeSingle();
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || String(e) }, { status: 500 });
  }
}
