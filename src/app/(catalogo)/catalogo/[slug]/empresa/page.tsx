import { notFound } from 'next/navigation';
import { Metadata, ResolvingMetadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import CatalogRichLayout from '@/components/catalogo/CatalogRichLayout';
import { escapeIlikePattern, normalizeCatalogSlug } from '@/lib/resolve-context';
import { makeWhatsAppUrl } from '@/lib/format-whatsapp';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://repvendas.com.br';

function buildAdminClient() {
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!adminKey || !supabaseUrl) return null;
  return createSupabaseAdmin(String(supabaseUrl), String(adminKey), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

// 1. RESOLUÇÃO ROBUSTA DA EMPRESA (DISTRIBUIDORA)
async function resolveCompanyEntity(clientToUse: any, rawSlug: string) {
  const normalizedSlug = normalizeCatalogSlug(rawSlug);

  // A) Busca direta por slug na tabela companies
  let { data: company } = await clientToUse
    .from('companies')
    .select('*')
    .ilike('slug', escapeIlikePattern(normalizedSlug))
    .maybeSingle();

  // B) Fallback: busca por public_catalogs -> company_id ou user_id -> profiles.company_id
  if (!company) {
    const { data: pc } = await clientToUse
      .from('public_catalogs')
      .select('company_id, user_id')
      .ilike('catalog_slug', escapeIlikePattern(normalizedSlug))
      .maybeSingle();

    let targetCompanyId = pc?.company_id || null;
    if (!targetCompanyId && pc?.user_id) {
      const { data: profile } = await clientToUse
        .from('profiles')
        .select('company_id')
        .eq('id', pc.user_id)
        .maybeSingle();
      targetCompanyId = profile?.company_id || null;
    }

    if (targetCompanyId) {
      const { data: compById } = await clientToUse
        .from('companies')
        .select('*')
        .eq('id', targetCompanyId)
        .maybeSingle();
      company = compById;
    }
  }

  // C) Fallback: busca por profiles.slug -> profiles.company_id
  if (!company) {
    const { data: profile } = await clientToUse
      .from('profiles')
      .select('company_id')
      .ilike('slug', escapeIlikePattern(normalizedSlug))
      .maybeSingle();

    if (profile?.company_id) {
      const { data: compFromProfile } = await clientToUse
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)
        .maybeSingle();
      company = compFromProfile;
    }
  }

  return company;
}

// 2. SEO METADATA DINÂMICO
export async function generateMetadata(
  { params }: PageProps,
  _parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;
  const normalizedSlug = normalizeCatalogSlug(slug);
  const supabase = await createClient();
  const admin = buildAdminClient();
  const clientToUse = admin || supabase;

  const company = await resolveCompanyEntity(clientToUse, normalizedSlug);
  if (!company) {
    return {
      title: 'Empresa não encontrada | RepVendas',
      robots: { index: false, follow: false },
    };
  }

  const title = `${company.name} | Catálogo Oficial Distribuidora`;
  const description =
    company.welcome_text ||
    company.about_text ||
    company.headline ||
    `Confira o catálogo oficial da ${company.name}, consulte produtos e faça pedidos online.`;

  const fallbackImage = `${APP_URL}/repvendas.png`;
  const ogImage = company.cover_image || company.logo_url || fallbackImage;
  const canonicalUrl = `${APP_URL}/catalogo/${normalizedSlug}/empresa`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: company.name,
      type: 'website',
      locale: 'pt_BR',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: company.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

// 3. PÁGINA DA EMPRESA (DISTRIBUIDORA)
export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const normalizedSlug = normalizeCatalogSlug(slug);
  const supabase = await createClient();
  const admin = buildAdminClient();
  const clientToUse = admin || supabase;

  // 1. Resolver a empresa de forma resiliente
  const company = await resolveCompanyEntity(clientToUse, normalizedSlug);
  if (!company) {
    return notFound();
  }

  // 2. Buscar administradores vinculados à distribuidora
  const { data: compAdmins } = await clientToUse
    .from('profiles')
    .select('id, role, full_name, email, phone')
    .eq('company_id', company.id)
    .order('created_at', { ascending: true });

  const adminUsers = Array.isArray(compAdmins) ? compAdmins : [];
  const adminUserIds = adminUsers.map((a: any) => a.id).filter(Boolean);

  const preferredAdmin =
    adminUsers.find((p: any) => p.role === 'admin_company') ||
    adminUsers.find((p: any) => p.role === 'master') ||
    adminUsers[0] ||
    null;
  const ownerUserId = preferredAdmin?.id || null;

  // 3. Buscar configurações (settings) dos administradores
  let ownerSettings: any = null;
  if (ownerUserId) {
    const { data: s } = await clientToUse
      .from('settings')
      .select('*')
      .eq('user_id', ownerUserId)
      .maybeSingle();
    ownerSettings = s || null;
  }

  if (!ownerSettings && adminUserIds.length > 0) {
    const { data: fallbackSettings } = await clientToUse
      .from('settings')
      .select('*')
      .in('user_id', adminUserIds)
      .not('logo_url', 'is', null)
      .limit(1)
      .maybeSingle();
    ownerSettings = fallbackSettings || null;
  }

  // 4. Buscar dados complementares em public_catalogs
  let publicCatalog: any = null;
  const { data: pcBySlug } = await clientToUse
    .from('public_catalogs')
    .select('*')
    .ilike('catalog_slug', escapeIlikePattern(normalizedSlug))
    .maybeSingle();

  if (pcBySlug) {
    publicCatalog = pcBySlug;
  } else if (adminUserIds.length > 0) {
    const { data: pcByUser } = await clientToUse
      .from('public_catalogs')
      .select('*')
      .in('user_id', adminUserIds)
      .limit(1)
      .maybeSingle();
    publicCatalog = pcByUser || null;
  }

  // 5. Buscar páginas institucionais dinâmicas (CMS)
  const { data: companyPages } = await clientToUse
    .from('company_pages')
    .select('id,title,slug')
    .eq('company_id', company.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  // 6. Construir identidade visual, branding, cores e contatos unificados
  const phone =
    company.phone ||
    company.whatsapp_phone ||
    ownerSettings?.phone ||
    publicCatalog?.phone ||
    preferredAdmin?.phone ||
    null;

  const whatsappPhone =
    company.whatsapp_phone ||
    company.phone ||
    ownerSettings?.phone ||
    phone ||
    null;

  const whatsappUrl =
    company.whatsapp_url ||
    ownerSettings?.whatsapp_url ||
    (whatsappPhone ? makeWhatsAppUrl(whatsappPhone) : null);

  const email =
    company.email ||
    company.contact_email ||
    ownerSettings?.email ||
    preferredAdmin?.email ||
    null;

  const companyEffective: any = {
    ...company,
    id: company.id,
    slug: company.slug || normalizedSlug,
    name:
      company.name ||
      ownerSettings?.name ||
      ownerSettings?.representative_name ||
      publicCatalog?.store_name ||
      'Distribuidora',
    logo_url:
      company.logo_url ||
      ownerSettings?.logo_url ||
      publicCatalog?.single_brand_logo_url ||
      publicCatalog?.logo_url ||
      null,

    // Paleta de Cores
    primary_color:
      company.primary_color ||
      ownerSettings?.primary_color ||
      publicCatalog?.primary_color ||
      '#2563eb',
    secondary_color:
      company.secondary_color ||
      ownerSettings?.secondary_color ||
      publicCatalog?.secondary_color ||
      '#0f172a',
    header_background_color:
      company.header_background_color ||
      ownerSettings?.header_background_color ||
      '#ffffff',
    header_text_color:
      company.header_text_color ||
      ownerSettings?.header_text_color ||
      '#1b1b1b',
    header_icon_bg_color:
      company.header_icon_bg_color ||
      ownerSettings?.header_icon_bg_color ||
      'transparent',
    header_icon_color:
      company.header_icon_color ||
      ownerSettings?.header_icon_color ||
      '#1b1b1b',
    footer_background_color:
      company.footer_background_color ||
      ownerSettings?.footer_background_color ||
      company.header_background_color ||
      '#0d1b2c',
    footer_text_color:
      company.footer_text_color ||
      ownerSettings?.footer_text_color ||
      '#ffffff',

    // Capa, Headline e Textos
    cover_image:
      company.cover_image ||
      ownerSettings?.cover_image ||
      publicCatalog?.share_banner_url ||
      null,
    cover_image_fit:
      company.cover_image_fit ||
      ownerSettings?.cover_image_fit ||
      'cover',
    cover_image_height:
      company.cover_image_height ||
      ownerSettings?.cover_image_height ||
      360,
    cover_image_offset_x:
      company.cover_image_offset_x ??
      ownerSettings?.cover_image_offset_x ??
      0,
    cover_image_offset_y:
      company.cover_image_offset_y ??
      ownerSettings?.cover_image_offset_y ??
      0,
    headline:
      company.headline ||
      ownerSettings?.headline ||
      publicCatalog?.headline ||
      null,
    welcome_text:
      company.welcome_text ||
      ownerSettings?.welcome_text ||
      publicCatalog?.footer_message ||
      null,
    about_text:
      company.about_text ||
      ownerSettings?.about_text ||
      company.welcome_text ||
      ownerSettings?.welcome_text ||
      null,
    show_headline_overlay:
      company.show_headline_overlay ??
      ownerSettings?.show_headline_overlay ??
      false,
    cover_headline_position:
      company.cover_headline_position ||
      ownerSettings?.cover_headline_position ||
      'center',
    headline_text_color:
      company.headline_text_color ||
      ownerSettings?.headline_text_color ||
      '#ffffff',
    cover_headline_font_size:
      company.cover_headline_font_size ||
      ownerSettings?.cover_headline_font_size ||
      null,
    cover_headline_offset_x:
      company.cover_headline_offset_x ??
      ownerSettings?.cover_headline_offset_x ??
      0,
    cover_headline_offset_y:
      company.cover_headline_offset_y ??
      ownerSettings?.cover_headline_offset_y ??
      0,
    cover_headline_z_index:
      company.cover_headline_z_index ??
      ownerSettings?.cover_headline_z_index ??
      100,
    cover_headline_wrap:
      company.cover_headline_wrap ??
      ownerSettings?.cover_headline_wrap ??
      false,
    cover_headline_force_two_lines:
      company.cover_headline_force_two_lines ??
      ownerSettings?.cover_headline_force_two_lines ??
      false,

    // Banners e Galeria
    banners:
      Array.isArray(company.banners) && company.banners.length > 0
        ? company.banners
        : Array.isArray(ownerSettings?.banners) && ownerSettings.banners.length > 0
          ? ownerSettings.banners
          : Array.isArray(publicCatalog?.banners)
            ? publicCatalog.banners
            : [],
    banners_mobile:
      Array.isArray(company.banners_mobile) && company.banners_mobile.length > 0
        ? company.banners_mobile
        : Array.isArray(ownerSettings?.banners_mobile) && ownerSettings.banners_mobile.length > 0
          ? ownerSettings.banners_mobile
          : Array.isArray(publicCatalog?.banners_mobile)
            ? publicCatalog.banners_mobile
            : [],
    gallery_urls:
      Array.isArray(company.gallery_urls) && company.gallery_urls.length > 0
        ? company.gallery_urls
        : Array.isArray(ownerSettings?.gallery_urls) && ownerSettings.gallery_urls.length > 0
          ? ownerSettings.gallery_urls
          : Array.isArray(publicCatalog?.gallery_urls)
            ? publicCatalog.gallery_urls
            : [],
    gallery_title:
      company.gallery_title ||
      ownerSettings?.gallery_title ||
      'Coleção em Foco',
    gallery_subtitle:
      company.gallery_subtitle ||
      ownerSettings?.gallery_subtitle ||
      'Inspirado por Design e Estilo',
    gallery_title_color:
      company.gallery_title_color ||
      ownerSettings?.gallery_title_color ||
      null,
    gallery_subtitle_color:
      company.gallery_subtitle_color ||
      ownerSettings?.gallery_subtitle_color ||
      null,
    gallery_image_fit:
      company.gallery_image_fit ||
      ownerSettings?.gallery_image_fit ||
      'cover',

    // Contatos e Redes Sociais
    phone,
    whatsapp_phone: whatsappPhone,
    whatsapp_url: whatsappUrl,
    email,
    contact_email: email,
    address: company.address || ownerSettings?.address || null,
    instagram_url: company.instagram_url || ownerSettings?.instagram_url || null,
    facebook_url: company.facebook_url || ownerSettings?.facebook_url || null,
    linkedin_url: company.linkedin_url || ownerSettings?.linkedin_url || null,
    website_url: company.website_url || ownerSettings?.website_url || null,

    // Barra de Benefícios Topo
    show_top_benefit_bar:
      company.show_top_benefit_bar ??
      ownerSettings?.show_top_benefit_bar ??
      publicCatalog?.show_top_benefit_bar ??
      false,
    top_benefit_text:
      company.top_benefit_text ||
      ownerSettings?.top_benefit_text ||
      publicCatalog?.top_benefit_text ||
      null,
    top_benefit_mode:
      company.top_benefit_mode ||
      ownerSettings?.top_benefit_mode ||
      publicCatalog?.top_benefit_mode ||
      'static',
    top_benefit_speed:
      company.top_benefit_speed ||
      ownerSettings?.top_benefit_speed ||
      publicCatalog?.top_benefit_speed ||
      'medium',
    top_benefit_animation:
      company.top_benefit_animation ||
      ownerSettings?.top_benefit_animation ||
      publicCatalog?.top_benefit_animation ||
      'scroll_left',
    top_benefit_bg_color:
      company.top_benefit_bg_color ||
      ownerSettings?.top_benefit_bg_color ||
      publicCatalog?.top_benefit_bg_color ||
      null,
    top_benefit_text_color:
      company.top_benefit_text_color ||
      ownerSettings?.top_benefit_text_color ||
      publicCatalog?.top_benefit_text_color ||
      null,
    top_benefit_height:
      company.top_benefit_height ||
      ownerSettings?.top_benefit_height ||
      publicCatalog?.top_benefit_height ||
      34,
    top_benefit_text_size:
      company.top_benefit_text_size ||
      ownerSettings?.top_benefit_text_size ||
      publicCatalog?.top_benefit_text_size ||
      11,
    top_benefit_image_url:
      company.top_benefit_image_url ||
      ownerSettings?.top_benefit_image_url ||
      publicCatalog?.top_benefit_image_url ||
      null,
    top_benefit_image_scale:
      company.top_benefit_image_scale ||
      ownerSettings?.top_benefit_image_scale ||
      100,

    // Preços e Acesso
    show_cost_price:
      typeof company.show_cost_price !== 'undefined' && company.show_cost_price !== null
        ? company.show_cost_price
        : (ownerSettings?.show_cost_price ?? publicCatalog?.show_cost_price ?? false),
    show_sale_price:
      typeof company.show_sale_price !== 'undefined' && company.show_sale_price !== null
        ? company.show_sale_price
        : (ownerSettings?.show_sale_price ?? publicCatalog?.show_sale_price ?? true),
    price_unlock_mode:
      company.price_unlock_mode ||
      ownerSettings?.price_unlock_mode ||
      publicCatalog?.price_unlock_mode ||
      'modal',
    price_password_hash:
      company.price_password_hash ||
      ownerSettings?.price_password_hash ||
      publicCatalog?.price_password_hash ||
      null,
    user_id: ownerUserId || company.id,
  };

  // 7. Buscar produtos com cobertura exaustiva (company_id, organization_id e user_ids dos administradores)
  const allAssociatedIds = Array.from(
    new Set([
      company.id,
      ownerUserId,
      ...adminUserIds,
      publicCatalog?.user_id,
    ].filter(Boolean))
  );

  const userOrClauses = allAssociatedIds.map((id) => `user_id.eq.${id}`).join(',');
  const orFilter = [
    `company_id.eq.${company.id}`,
    `organization_id.eq.${company.id}`,
    userOrClauses,
  ].filter(Boolean).join(',');

  const { data: rawProducts } = await clientToUse
    .from('products')
    .select('*, linked_images, product_images(url, is_primary, position)')
    .not('is_active', 'eq', false)
    .or(orFilter)
    .order('created_at', { ascending: false });

  // Calcular variantes agrupadas por referência
  const counts = new Map<string, number>();
  rawProducts?.forEach((p: any) => {
    const key = p.reference_id || p.reference_code || p.id;
    const current = counts.get(key) || 0;
    counts.set(key, current + 1);
  });

  // Mapear imagem primária resolvida para displayUrl
  const productsWithImages = (rawProducts || []).map((p: any) => {
    const gallery = p.product_images || [];
    const primary = gallery.find((i: any) => i.is_primary);
    const displayUrl =
      primary?.url ||
      gallery[0]?.url ||
      p.image_url ||
      p.external_image_url ||
      null;
    const variantCount = counts.get(p.reference_id || p.reference_code || p.id) || 1;

    return {
      ...p,
      image_url: displayUrl || p.image_url,
      variant_count: variantCount,
    };
  });

  // 8. JSON-LD Dados Estruturados
  const canonicalUrl = `${APP_URL}/catalogo/${normalizedSlug}/empresa`;
  const richCatalogJsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Store',
      name: companyEffective.name,
      url: canonicalUrl,
      image: companyEffective.logo_url || companyEffective.cover_image || undefined,
      description: companyEffective.welcome_text || companyEffective.about_text || 'Catálogo Oficial Distribuidora',
      telephone: companyEffective.phone || undefined,
      email: companyEffective.email || undefined,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Início',
          item: APP_URL,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: companyEffective.name,
          item: canonicalUrl,
        },
      ],
    },
    ...(productsWithImages && productsWithImages.length > 0
      ? [
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: `Produtos - ${companyEffective.name}`,
            numberOfItems: productsWithImages.length,
            itemListElement: productsWithImages.slice(0, 30).map((prod: any, idx: number) => ({
              '@type': 'ListItem',
              position: idx + 1,
              item: {
                '@type': 'Product',
                name: prod.name,
                url: `${APP_URL}/catalogo/${normalizedSlug}/product/${prod.id}`,
                image: prod.image_url || undefined,
                description: prod.description || undefined,
                offers: {
                  '@type': 'Offer',
                  price: typeof prod.price === 'number' ? prod.price : 0,
                  priceCurrency: 'BRL',
                  availability: 'https://schema.org/InStock',
                },
              },
            })),
          },
        ]
      : []),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(richCatalogJsonLd) }}
      />
      <CatalogRichLayout
        company={{ ...companyEffective, company_pages: companyPages || [] }}
        representative={null}
        products={productsWithImages}
      />
    </>
  );
}
