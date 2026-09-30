import { NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function resolveCompanyId(supabase: any, userId: string) {
  const { data: profile } = await supabase.from('profiles').select('company_id,organization_id').eq('id', userId).maybeSingle();
  let companyId = (profile as any)?.company_id || (profile as any)?.organization_id;
  if (!companyId) {
    const { data: comp } = await supabaseAdmin
      .from('companies')
      .select('id')
      .or(`owner_user_id.eq.${userId},user_id.eq.${userId}`)
      .maybeSingle();
    companyId = comp?.id;
  }
  return companyId;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });

    const companyId = await resolveCompanyId(supabase, userId);
    if (!companyId) return NextResponse.json({ success: false, error: 'Usuário não vinculado a uma empresa' }, { status: 403 });

    const { data, error } = await supabaseAdmin.from('company_settings').select('*').eq('company_id', companyId).maybeSingle();
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });

    const body = await req.json();

    const companyId = await resolveCompanyId(supabase, userId);
    if (!companyId) return NextResponse.json({ success: false, error: 'Usuário não vinculado a uma empresa' }, { status: 403 });

    const payload = {
      company_id: companyId,
      welcome_text: body.welcome_text || null,
      hero_banner_url: body.hero_banner_url || null,
      about_us_content: body.about_us_content || null,
      shipping_policy_content: body.shipping_policy_content || null,
      advantages_title: body.advantages_title || null,
      advantages_content: body.advantages_content || null,
      brands_content: body.brands_content || null,
      private_label_content: body.private_label_content || null,
      onboarding_steps: body.onboarding_steps || null,
      contact_info: body.contact_info || null,
      gallery_urls: body.gallery_urls || null,
      primary_color: body.primary_color || null,
      secondary_color: body.secondary_color || null,
      accent_color: body.accent_color || null,
      font_family: body.font_family || null,
      border_radius: body.border_radius || null,
      updated_at: new Date().toISOString(),
    };

    // Upsert using admin client
    const { data, error } = await supabaseAdmin
      .from('company_settings')
      .upsert(payload, { onConflict: 'company_id' })
      .select()
      .maybeSingle();

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}
