import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import HeaderDistribuidora from '@/components/catalogo/HeaderDistribuidora';
import { StoreProvider } from '@/components/catalogo/store-context';
import { StoreFooter } from '@/components/catalogo/store-layout';
import { parseCompanyPageContent } from '@/lib/company-page-content';
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
  repSlug: string;
  pageSlug: string;
};

export default async function RepresentativeCompanyPage({ params }: { params: Promise<ParamsType> }) {
  const { slug, repSlug, pageSlug } = await params;
  const supabase = await createClient();

  const { data: company } = await supabase
    .from('companies')
    .select('id,name,slug,primary_color,secondary_color,logo_url')
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
  // Buscar possíveis overrides públicos (sincronizados) para a barra de benefícios
  const { data: publicCatalog } = await supabase
    .from('public_catalogs')
    .select('show_top_benefit_bar,top_benefit_text,top_benefit_mode,top_benefit_speed,top_benefit_animation,top_benefit_bg_color,top_benefit_text_color,top_benefit_height,top_benefit_text_size')
    .eq('catalog_slug', (company as any).slug)
    .maybeSingle();

  const primary = (company as any)?.primary_color || '#2563eb';
  const secondary = (company as any)?.secondary_color || '#0f172a';
  const parsedContent = parseCompanyPageContent((page as any).content, (page as any).title || '');
  const toBool = (v: any) => v === true || v === 'true' || v === 1 || v === '1';
  const ownerSettings = await getCompanyOwnerSettings(String(company.id));

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
        show_top_benefit_bar: toBool(ownerSettings?.show_top_benefit_bar ?? publicCatalog?.show_top_benefit_bar),
        top_benefit_text: ownerSettings?.top_benefit_text ?? publicCatalog?.top_benefit_text ?? null,
        top_benefit_mode: ownerSettings?.top_benefit_mode ?? publicCatalog?.top_benefit_mode ?? null,
        top_benefit_speed: ownerSettings?.top_benefit_speed ?? publicCatalog?.top_benefit_speed ?? null,
        top_benefit_animation: ownerSettings?.top_benefit_animation ?? publicCatalog?.top_benefit_animation ?? null,
        top_benefit_bg_color: ownerSettings?.top_benefit_bg_color ?? publicCatalog?.top_benefit_bg_color ?? null,
        top_benefit_text_color: ownerSettings?.top_benefit_text_color ?? publicCatalog?.top_benefit_text_color ?? null,
        top_benefit_height: ownerSettings?.top_benefit_height ?? publicCatalog?.top_benefit_height ?? null,
        top_benefit_text_size: ownerSettings?.top_benefit_text_size ?? publicCatalog?.top_benefit_text_size ?? null,
      }}
    >
      <main className="min-h-screen bg-gray-50 flex flex-col">
        <HeaderDistribuidora
          slug={(company as any).slug}
          repSlug={String(repSlug || '')}
          companyLogo={(company as any).logo_url}
          companyName={(company as any).name}
          institutional={false}
          companyPages={companyPages || []}
        />
        <section className="mx-auto max-w-5xl px-4 py-8 md:py-12 flex-1 w-full">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
          <div className="mb-6 border-b border-slate-100 pb-4">
            <p className="text-xs font-black uppercase tracking-widest" style={{ color: primary }}>
              {company.name}
            </p>
            <h1 className="mt-2 text-3xl font-black italic text-slate-900">{page.title}</h1>
          </div>

          {parsedContent.content.heroImage ? (
            <div className="mb-6 overflow-hidden rounded-2xl border border-slate-100">
              <img
                src={parsedContent.content.heroImage}
                alt={`Capa de ${page.title}`}
                className="w-full object-cover"
                style={{ height: Math.max(180, Math.min(900, Number(parsedContent.content.heroHeight || 360))) }}
              />
            </div>
          ) : null}

          {parsedContent.isStructured ? (
            <article className="space-y-8">
              {parsedContent.content.blocks.length === 0 ? (
                <p className="text-slate-500">Conteúdo não disponível.</p>
              ) : null}

              {parsedContent.content.blocks.map((block) => {
                if (block.type === 'text') {
                  const textAlign = (block.data.textAlign as any) || 'left';
                  const fontSize = Number(block.data.fontSize || 16);
                  return (
                    <p
                      key={block.id}
                      className="whitespace-pre-wrap text-lg leading-relaxed text-slate-700"
                      style={{ textAlign: textAlign as any, fontSize: `${fontSize}px` }}
                    >
                      {block.data.text}
                    </p>
                  );
                }

                if (block.type === 'image') {
                  if (!block.data.url) return null;
                  const widthPercent = Math.max(10, Math.min(100, Number(block.data.widthPercent || 100)));
                  const maxHeight = Math.max(80, Math.min(1200, Number(block.data.maxHeight || 480)));
                  const objectFit = block.data.objectFit === 'contain' ? 'contain' : 'cover';
                  return (
                    <div key={block.id} style={{ textAlign: (block.data.align as any) || 'center' }} className="space-y-2">
                      <img
                        src={block.data.url}
                        alt={block.data.alt || page.title}
                        className="rounded-2xl border border-slate-100"
                        style={{
                          width: `${widthPercent}%`,
                          maxWidth: '100%',
                          maxHeight,
                          objectFit,
                        }}
                      />
                      {block.data.alt ? <figcaption className="text-sm text-slate-500">{block.data.alt}</figcaption> : null}
                    </div>
                  );
                }

                if (block.type === 'columns') {
                  return (
                    <section key={block.id} className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 whitespace-pre-wrap text-slate-700">
                        {block.data.leftText || 'Coluna esquerda sem conteúdo.'}
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 whitespace-pre-wrap text-slate-700">
                        {block.data.rightText || 'Coluna direita sem conteúdo.'}
                      </div>
                    </section>
                  );
                }

                if (block.type === 'image_text') {
                  const imageOnRight = block.data.imagePosition === 'right';
                  const widthPercent = Math.max(10, Math.min(100, Number(block.data.widthPercent || 100)));
                  const maxHeight = Math.max(80, Math.min(1200, Number(block.data.maxHeight || 480)));
                  const objectFit = block.data.objectFit === 'contain' ? 'contain' : 'cover';
                  return (
                    <section key={block.id} className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-center">
                      <div className={`${imageOnRight ? 'md:order-2' : 'md:order-1'}`}>
                        {block.data.imageUrl ? (
                          <div style={{ textAlign: (block.data.align as any) || 'center' }}>
                            <img
                              src={block.data.imageUrl}
                              alt={block.data.imageAlt || page.title}
                              className="rounded-2xl border border-slate-100"
                              style={{
                                width: `${widthPercent}%`,
                                maxWidth: '100%',
                                maxHeight,
                                objectFit,
                              }}
                            />
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
                            Imagem não definida.
                          </div>
                        )}
                      </div>
                      <div className={`${imageOnRight ? 'md:order-1' : 'md:order-2'} whitespace-pre-wrap text-slate-700`}>
                        {block.data.text || 'Texto não definido.'}
                      </div>
                    </section>
                  );
                }

                if (block.type === 'spacer') {
                  const height = Math.max(8, Math.min(160, Number(block.data.height || 32)));
                  return block.data.lineStyle === 'line' ? (
                    <div key={block.id} style={{ height }} className="flex items-center">
                      <hr className="w-full border-slate-200" />
                    </div>
                  ) : (
                    <div key={block.id} style={{ height }} aria-hidden="true" />
                  );
                }

                if (block.type === 'banner') {
                  const bannerHeight = Math.max(160, Math.min(900, Number(block.data.maxHeight || 320)));
                  return (
                    <section
                      key={block.id}
                      className="relative overflow-hidden rounded-2xl border border-slate-100 bg-slate-900 text-white"
                      style={{ minHeight: bannerHeight }}
                    >
                      {block.data.imageUrl ? (
                        <img
                          src={block.data.imageUrl}
                          alt={block.data.title || page.title}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : null}
                      <div className="absolute inset-0 bg-slate-900/55" />
                      <div className="relative z-10 p-6 md:p-8 max-w-2xl">
                        {block.data.title ? <h3 className="text-2xl font-black">{block.data.title}</h3> : null}
                        {block.data.subtitle ? <p className="mt-2 text-white/90 whitespace-pre-wrap">{block.data.subtitle}</p> : null}
                        {block.data.ctaText ? (
                          <a
                            href={block.data.ctaUrl || '#'}
                            className="inline-flex mt-4 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-900"
                          >
                            {block.data.ctaText}
                          </a>
                        ) : null}
                      </div>
                    </section>
                  );
                }

                if (block.type === 'gallery') {
                  const galleryImages = Array.isArray(block.data.galleryImages) ? block.data.galleryImages : [];
                  if (!galleryImages.length) return null;
                  const galleryColumns = Math.max(2, Math.min(4, Number(block.data.galleryColumns || 3)));
                  const maxHeight = Math.max(100, Math.min(900, Number(block.data.maxHeight || 320)));
                  const objectFit = block.data.objectFit === 'contain' ? 'contain' : 'cover';
                  return (
                    <section
                      key={block.id}
                      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                      style={{ gridTemplateColumns: `repeat(${galleryColumns}, minmax(0,1fr))` }}
                    >
                      {galleryImages.map((img, index) => (
                        <img
                          key={`${block.id}-gallery-${index}`}
                          src={img.url}
                          alt={img.alt || `${page.title} ${index + 1}`}
                          className="w-full rounded-xl border border-slate-100"
                          style={{ height: maxHeight, objectFit }}
                        />
                      ))}
                    </section>
                  );
                }

                const items = Array.isArray(block.data.items) ? block.data.items : [];
                return (
                  <ul key={block.id} className="space-y-3">
                    {items.map((item, index) => (
                      <li key={`${block.id}-${index}`} className="flex items-start gap-3 text-slate-700">
                        <span className="mt-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: primary }} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                );
              })}
            </article>
          ) : (
            <article
              className="prose prose-slate max-w-none"
              style={{ ['--tw-prose-links' as any]: primary, ['--tw-prose-bold' as any]: secondary }}
              dangerouslySetInnerHTML={{ __html: typeof page.content === 'string' ? page.content : '<p>Conteúdo não disponível.</p>' }}
            />
          )}
          </div>
        </section>
        <StoreFooter />
      </main>
    </StoreProvider>
  );
}
