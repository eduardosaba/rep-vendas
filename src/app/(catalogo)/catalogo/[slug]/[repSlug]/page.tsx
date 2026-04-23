import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import CatalogRichLayout from '@/components/catalogo/CatalogRichLayout';
import CatalogStandardLayout from '@/components/catalogo/CatalogStandardLayout';
import { getPublicCatalog } from '@/lib/catalog';
import { resolveContext } from '@/lib/resolve-context';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

function buildSupabaseAdmin() {
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!adminKey || !supabaseUrl) return null;
  return createSupabaseAdmin(String(supabaseUrl), String(adminKey), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getCompanyCatalogPublicSettings(companySlug: string) {
  try {
    const admin = buildSupabaseAdmin();
    if (!admin) return null;

    const { data } = await admin
      .from('public_catalogs')
      .select('user_id,logo_url,show_cost_price,show_sale_price,price_unlock_mode,price_password_hash,top_benefit_mode,top_benefit_bg_color,top_benefit_text_color,top_benefit_speed,top_benefit_animation,header_background_color,header_text_color,header_icon_bg_color,header_icon_color,banners,banners_mobile,share_banner_url,gallery_urls,gallery_title,gallery_subtitle,gallery_title_color,gallery_subtitle_color,show_headline_overlay,cover_headline_position,headline_text_color,cover_headline_font_size,cover_headline_offset_x,cover_headline_offset_y,cover_headline_z_index,cover_headline_wrap,cover_headline_force_two_lines')
      .eq('catalog_slug', companySlug)
      .maybeSingle();

    return data || null;
  } catch {
    return null;
  }
}

async function getCompanyOwnerSettings(companyId: string) {
  try {
    const admin = buildSupabaseAdmin();
    if (!admin) return null;

    const { data: admins } = await admin
      .from('profiles')
      .select('id,role')
      .eq('company_id', companyId)
      .in('role', ['admin_company', 'master', 'admin'])
      .limit(5);

    if (!Array.isArray(admins) || admins.length === 0) return null;
    const preferred = admins.find((p: any) => p.role === 'admin_company') || admins[0];
    if (!preferred?.id) return null;

    const { data: settings } = await admin
      .from('settings')
      .select(`
        name,headline,welcome_text,about_text,cover_image,
        primary_color,secondary_color,header_background_color,header_text_color,header_icon_bg_color,header_icon_color,footer_background_color,
        footer_message,logo_url,og_image_url,share_banner_url,banners,banners_mobile,
        font_family,font_url,show_cost_price,show_sale_price,price_unlock_mode,
        price_password_hash,show_top_benefit_bar,show_top_info_bar,top_benefit_text,
        top_benefit_mode,top_benefit_speed,top_benefit_animation,
        top_benefit_bg_color,top_benefit_text_color,top_benefit_height,top_benefit_text_size,
        top_benefit_image_url,top_benefit_image_fit,top_benefit_image_scale,
        top_benefit_image_align,top_benefit_text_align,show_installments,max_installments,
        cash_price_discount_percent,enable_stock_management,global_allow_backorder,
        store_banner_meta,gallery_urls,gallery_title,gallery_subtitle,gallery_title_color,gallery_subtitle_color,show_headline_overlay,cover_headline_position,headline_text_color,cover_headline_font_size,cover_headline_offset_x,cover_headline_offset_y,cover_headline_z_index,cover_headline_wrap,cover_headline_force_two_lines
      `)
      .eq('user_id', preferred.id)
      .maybeSingle();

    return {
      ownerUserId: String(preferred.id),
      settings: settings || null,
    };
  } catch {
    return null;
  }
}

function mergeCompanyWithSettings(company: any, settings: any) {
  if (!settings) return company;
  const merged = { ...company };
  for (const [key, value] of Object.entries(settings)) {
    if (value !== null && typeof value !== 'undefined') {
      (merged as any)[key] = value;
    }
  }
  return merged;
}

interface PageProps {
  params: Promise<{
    slug: string;
    repSlug: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { slug, repSlug } = await params;
  const normalizedCompanySlug = String(slug || '').trim().toLowerCase();
  const normalizedRepSlug = String(repSlug || '').trim().toLowerCase();
  const supabase = await createClient();
  let context = await resolveContext([normalizedCompanySlug, normalizedRepSlug], supabase as any);

  // Fallback para rotas públicas: se RLS bloquear leitura de profiles/companies no client público,
  // usa service role apenas para resolver o contexto de URL.
  if (!context?.company || !context?.representative) {
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (adminKey && supabaseUrl) {
      const admin = createSupabaseAdmin(String(supabaseUrl), String(adminKey), {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const adminContext = await resolveContext([normalizedCompanySlug, normalizedRepSlug], admin as any);
      if (adminContext) context = adminContext;
    }
  }

  const company = context?.company || null;
  const representative = context?.representative || null;

  if (!company) {
    console.error('Empresa não encontrada:', normalizedCompanySlug);
    return notFound();
  }

  if (!representative) {
    console.error('Representante não encontrado ou não vinculado a esta empresa', {
      slug: normalizedCompanySlug,
      repSlug: normalizedRepSlug,
      companyId: company.id,
    });
    return notFound();
  }

  const ownerSettingsData = await getCompanyOwnerSettings(String(company.id));
  const ownerSettings = ownerSettingsData?.settings || null;
  const ownerUserId = ownerSettingsData?.ownerUserId || null;
  const publicCatalogSettings = await getCompanyCatalogPublicSettings(normalizedCompanySlug);
  const { data: companyPages } = await supabase
    .from('company_pages')
    .select('id,title,slug')
    .eq('company_id', company.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true });
  // Merge refinado: ownerSettings como fallback, publicCatalogSettings como camada pública,
  // e company (aba Institucional) como âncora final que prevalece quando definido.
  const companyBase = company || {};
  const applyNonNull = (target: any, src: any) => {
    if (!src) return target;
    Object.keys(src).forEach((k) => {
      const v = (src as any)[k];
      if (typeof v !== 'undefined' && v !== null) target[k] = v;
    });
    return target;
  };

  const companyEffective: any = {};
  if (ownerSettings) applyNonNull(companyEffective, ownerSettings);
  if (publicCatalogSettings) applyNonNull(companyEffective, publicCatalogSettings);
  applyNonNull(companyEffective, companyBase);

  companyEffective.name = companyEffective.name || ownerSettings?.name || companyBase.name;
  companyEffective.headline = companyEffective.headline || ownerSettings?.headline || companyBase.headline;
  companyEffective.welcome_text = companyEffective.welcome_text || ownerSettings?.welcome_text || companyBase.welcome_text;
  companyEffective.about_text = companyEffective.about_text || ownerSettings?.about_text || companyBase.about_text;
  companyEffective.cover_image = companyEffective.cover_image || ownerSettings?.cover_image || companyBase.cover_image;
  companyEffective.gallery_urls = companyEffective.gallery_urls || ownerSettings?.gallery_urls || publicCatalogSettings?.gallery_urls || companyBase.gallery_urls || [];

  companyEffective.primary_color = companyEffective.primary_color || ownerSettings?.primary_color || '#2563eb';
  companyEffective.header_background_color = companyEffective.header_background_color || ownerSettings?.header_background_color || '#ffffff';
  companyEffective.header_text_color = companyEffective.header_text_color || ownerSettings?.header_text_color || '#1b1b1b';
  companyEffective.header_icon_bg_color = companyEffective.header_icon_bg_color || ownerSettings?.header_icon_bg_color || 'transparent';
  companyEffective.header_icon_color = companyEffective.header_icon_color || ownerSettings?.header_icon_color || '#1b1b1b';

  companyEffective.show_cost_price = typeof companyEffective.show_cost_price !== 'undefined' ? companyEffective.show_cost_price : (ownerSettings?.show_cost_price ?? false);
  companyEffective.show_sale_price = typeof companyEffective.show_sale_price !== 'undefined' ? companyEffective.show_sale_price : (ownerSettings?.show_sale_price ?? true);
  companyEffective.enable_stock_management = typeof companyEffective.enable_stock_management !== 'undefined' ? companyEffective.enable_stock_management : (ownerSettings?.enable_stock_management ?? false);
  companyEffective.price_unlock_mode = companyEffective.price_unlock_mode || (publicCatalogSettings as any)?.price_unlock_mode || ownerSettings?.price_unlock_mode || 'modal';

  companyEffective.company_pages = companyPages || [];
  companyEffective.user_id = companyEffective.user_id || (companyBase as any).user_id || ownerUserId || (publicCatalogSettings as any)?.user_id || String((representative as any)?.id || companyBase.id);

  const isRichCatalog = companyEffective.type === 'distribuidora' || !!companyEffective.headline;
  const catalogData = await getPublicCatalog(String(company.id), String(representative.id));
  const products = catalogData.success && Array.isArray(catalogData.products) ? catalogData.products : [];

  if (isRichCatalog) {
    return <CatalogRichLayout company={companyEffective} representative={representative} products={products} />;
  }

  return (
    <CatalogStandardLayout
      catalog={{
        id: String(company.id),
        user_id: String(
          (company as any).user_id ||
            ownerUserId ||
            (publicCatalogSettings as any)?.user_id ||
            representative.id ||
            company.id
        ),
        store_name: companyEffective.name,
        catalog_slug: companyEffective.slug,
        logo_url: companyEffective.logo_url || null,
        primary_color: companyEffective.primary_color || '#2563eb',
        secondary_color: companyEffective.secondary_color || '#0f172a',
        show_cost_price: Boolean((companyEffective as any).show_cost_price),
        show_sale_price:
          typeof (companyEffective as any).show_sale_price === 'boolean'
            ? (companyEffective as any).show_sale_price
            : true,
        price_unlock_mode: (companyEffective as any).price_unlock_mode || 'modal',
        price_password_hash: (companyEffective as any).price_password_hash || null,
        show_top_benefit_bar: Boolean((companyEffective as any).show_top_benefit_bar),
        show_top_info_bar: (companyEffective as any).show_top_info_bar ?? true,
        top_benefit_text: (companyEffective as any).top_benefit_text || null,
        top_benefit_mode:
          (companyEffective as any).top_benefit_mode === 'marquee'
            ? 'marquee'
            : 'static',
        top_benefit_speed:
          (companyEffective as any).top_benefit_speed === 'slow'
            ? 'slow'
            : (companyEffective as any).top_benefit_speed === 'fast'
              ? 'fast'
              : 'medium',
        top_benefit_animation:
          (companyEffective as any).top_benefit_animation === 'scroll_right'
            ? 'scroll_right'
            : (companyEffective as any).top_benefit_animation === 'alternate'
              ? 'alternate'
              : 'scroll_left',
        top_benefit_bg_color: (companyEffective as any).top_benefit_bg_color || null,
        top_benefit_text_color: (companyEffective as any).top_benefit_text_color || null,
        top_benefit_height: (companyEffective as any).top_benefit_height || null,
        top_benefit_text_size: (companyEffective as any).top_benefit_text_size || null,
        top_benefit_image_url: (companyEffective as any).top_benefit_image_url || null,
        top_benefit_image_fit: (companyEffective as any).top_benefit_image_fit || null,
        top_benefit_image_scale: (companyEffective as any).top_benefit_image_scale || null,
        top_benefit_image_align: (companyEffective as any).top_benefit_image_align || null,
        top_benefit_text_align: (companyEffective as any).top_benefit_text_align || null,
        show_installments: Boolean((companyEffective as any).show_installments),
        max_installments: (companyEffective as any).max_installments || null,
        cash_price_discount_percent:
          (companyEffective as any).cash_price_discount_percent || null,
        banners: (companyEffective as any).banners || null,
        banners_mobile: (companyEffective as any).banners_mobile || null,
        og_image_url: (companyEffective as any).og_image_url || null,
        share_banner_url: (companyEffective as any).share_banner_url || null,
        font_family: (companyEffective as any).font_family || null,
        font_url: (companyEffective as any).font_url || null,
        store_banner_meta: (companyEffective as any).store_banner_meta || null,
        enable_stock_management: Boolean((companyEffective as any).enable_stock_management),
        global_allow_backorder: Boolean((companyEffective as any).global_allow_backorder),
        owner_is_company: true,
        representative_id: representative.id || null,
        representative_name: representative.full_name || representative.slug || null,
        representative_whatsapp: representative.whatsapp || null,
      }}
      initialProducts={products}
    />
  );
}
