import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import HeaderDistribuidora from '@/components/catalogo/HeaderDistribuidora';
import { StoreProvider } from '@/components/catalogo/store-context';
import { StoreFooter } from '@/components/catalogo/store-layout';
import { parseCompanyPageContent } from '@/lib/company-page-content';
import { resolveCompanyPageDynamicData } from '@/lib/company-page-dynamic-data';
import { CompanyPageRenderer } from '@/components/catalogo/CompanyPageRenderer';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

function buildSupabaseAdmin() {
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!adminKey || !supabaseUrl) return null;
  return createSupabaseAdmin(String(supabaseUrl), String(adminKey), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getCompanyOwnerSettings(companyId: string) {
  try {
    const admin = buildSupabaseAdmin();
    if (!admin) return null;

    const { data: admins } = await admin
      .from('profiles')
      .select('id,role')
      .eq('company_id', companyId)
      .in('role', ['admin_company', 'master'])
      .limit(5);

    if (!Array.isArray(admins) || admins.length === 0) return null;
    const preferred = admins.find((p: any) => p.role === 'admin_company') || admins[0];
    if (!preferred?.id) return null;

    const { data: settings } = await admin
      .from('settings')
      .select('*')
      .eq('user_id', preferred.id)
      .maybeSingle();

    return settings || null;
  } catch {
    return null;
  }
}

export const dynamic = 'force-dynamic';

type ParamsType = {
  slug: string;
  pageSlug: string;
};

export default async function CompanyCustomPage({ params }: { params: Promise<ParamsType> }) {
  const { slug, pageSlug } = await params;
  const supabase = await createClient();

  const { data: company } = await supabase
    .from('companies')
    .select('id,name,slug,primary_color,secondary_color,logo_url,phone,whatsapp,email,instagram,address')
    .ilike('slug', String(slug || '').toLowerCase())
    .maybeSingle();

  if (!company?.id) notFound();

  const normalize = (s: string) =>
    String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9-\s]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

  const { data: page } = await supabase
    .from('company_pages')
    .select('id,title,slug,content,is_active')
    .eq('company_id', company.id)
    .eq('slug', normalize(String(pageSlug || '')))
    .eq('is_active', true)
    .maybeSingle();

  if (!page?.id) notFound();

  const { data: companyPages } = await supabase
    .from('company_pages')
    .select('id,title,slug')
    .eq('company_id', company.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  const { data: publicCatalog } = await supabase
    .from('public_catalogs')
    .select(
      'user_id,show_top_benefit_bar,top_benefit_text,top_benefit_mode,top_benefit_speed,top_benefit_animation,top_benefit_bg_color,top_benefit_text_color,top_benefit_height,top_benefit_text_size'
    )
    .eq('catalog_slug', (company as any).slug)
    .maybeSingle();

  const primary = (company as any)?.primary_color || '#2563eb';
  const secondary = (company as any)?.secondary_color || '#0f172a';
  const parsedContent = parseCompanyPageContent((page as any).content, (page as any).title || '');

  // Resolução de Dados Dinâmicos Server-Side (Produtos e Marcas)
  const resolvedDynamicData = await resolveCompanyPageDynamicData(parsedContent.content, String(company.id), supabase);

  const toBool = (v: any) => v === true || v === 'true' || v === 1 || v === '1';
  const ownerSettings = await getCompanyOwnerSettings(String(company.id));

  const companyContext = {
    name: company.name,
    phone: (company as any).phone,
    whatsapp: (company as any).whatsapp,
    email: (company as any).email,
    instagram: (company as any).instagram,
    address: (company as any).address,
  };

  return (
    <StoreProvider
      store={{
        id: String(company.id),
        user_id: String((company as any).user_id || company.id),
        name: company.name,
        slug: company.slug,
        logo_url: company.logo_url || null,
        primary_color: company.primary_color || '#2563eb',
        secondary_color: company.secondary_color || '#0f172a',
        footer_background_color: secondary,
        footer_message: 'Sua loja de confiança.',
        show_top_benefit_bar: toBool(
          ownerSettings?.show_top_benefit_bar ?? publicCatalog?.show_top_benefit_bar
        ),
        top_benefit_text: ownerSettings?.top_benefit_text ?? publicCatalog?.top_benefit_text ?? null,
        top_benefit_mode: ownerSettings?.top_benefit_mode ?? publicCatalog?.top_benefit_mode ?? null,
        top_benefit_speed: ownerSettings?.top_benefit_speed ?? publicCatalog?.top_benefit_speed ?? null,
        top_benefit_animation:
          ownerSettings?.top_benefit_animation ?? publicCatalog?.top_benefit_animation ?? null,
        top_benefit_bg_color:
          ownerSettings?.top_benefit_bg_color ?? publicCatalog?.top_benefit_bg_color ?? null,
        top_benefit_text_color:
          ownerSettings?.top_benefit_text_color ?? publicCatalog?.top_benefit_text_color ?? null,
        top_benefit_height:
          ownerSettings?.top_benefit_height ?? publicCatalog?.top_benefit_height ?? null,
        top_benefit_text_size:
          ownerSettings?.top_benefit_text_size ?? publicCatalog?.top_benefit_text_size ?? null,
      }}
    >
      <main className="flex min-h-screen flex-col bg-gray-50 pt-36 md:pt-44">
        <HeaderDistribuidora
          slug={(company as any).slug}
          repSlug={null}
          companyLogo={(company as any).logo_url}
          companyName={(company as any).name}
          institutional
          companyPages={companyPages || []}
        />
        <section className="w-full flex-1 px-4 py-8 md:px-8 md:py-12">
          <div className="w-full max-w-5xl mx-auto rounded-2xl border border-slate-200 bg-white p-6 md:p-10 shadow-sm">
            <div className="mb-8 border-b border-slate-100 pb-4">
              <p className="text-xs font-black uppercase tracking-widest" style={{ color: primary }}>
                {company.name}
              </p>
              <h1 className="mt-2 text-3xl font-black italic text-slate-900">{page.title}</h1>
            </div>

            <CompanyPageRenderer
              content={parsedContent.content}
              companyContext={companyContext}
              resolvedDynamicData={resolvedDynamicData}
            />
          </div>
        </section>
        <StoreFooter />
      </main>
    </StoreProvider>
  );
}
