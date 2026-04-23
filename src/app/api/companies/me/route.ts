import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: authUser } = await supabase.auth.getUser();
    const userId = authUser?.user?.id;
    if (!userId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', userId)
      .maybeSingle();

    if (pErr) throw pErr;
    const companyId = (profile as any)?.company_id;
    if (!companyId) return NextResponse.json({ success: false, error: 'No company linked' }, { status: 404 });

    // Evita erro 500 quando ambientes ainda não possuem todas as colunas novas.
    const { data: company, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .maybeSingle();

    if (error) throw error;

    const payload = {
      id: (company as any)?.id ?? companyId,
      name: (company as any)?.name ?? '',
      slug: (company as any)?.slug ?? '',
      // tenta resolver o catalog_slug público (caso o usuário use outro slug de catálogo)
      catalog_slug: '',
      cnpj: (company as any)?.cnpj ?? null,
      about_text: (company as any)?.about_text ?? '',
      primary_color: (company as any)?.primary_color ?? '#2563eb',
      secondary_color: (company as any)?.secondary_color ?? '#0ea5e9',
      logo_url: (company as any)?.logo_url ?? '',
      cover_image: (company as any)?.cover_image ?? '',
      headline: (company as any)?.headline ?? '',
      welcome_text: (company as any)?.welcome_text ?? '',
      support_whatsapp: (company as any)?.support_whatsapp ?? '',
      contact_email: (company as any)?.contact_email ?? '',
      hide_prices_globally: Boolean((company as any)?.hide_prices_globally),
      commission_trigger:
        String((company as any)?.commission_trigger || '').toLowerCase() ===
        'faturamento'
          ? 'faturamento'
          : 'liquidez',
      default_commission_rate:
        Number((company as any)?.default_commission_rate || 5) || 5,
      require_customer_approval:
        typeof (company as any)?.require_customer_approval === 'boolean'
          ? Boolean((company as any)?.require_customer_approval)
          : true,
      block_new_orders: Boolean((company as any)?.block_new_orders),
    };

    try {
      const { data: pub } = await supabase
        .from('public_catalogs')
        .select('catalog_slug')
        .eq('user_id', (company as any)?.id ?? companyId)
        .maybeSingle();
      if (pub && (pub as any).catalog_slug) payload.catalog_slug = (pub as any).catalog_slug;
    } catch {
      // ignore
    }

    return NextResponse.json({ success: true, data: payload });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}
