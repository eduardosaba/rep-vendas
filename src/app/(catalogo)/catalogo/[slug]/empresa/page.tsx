import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import CatalogRichLayout from '@/components/catalogo/CatalogRichLayout';
import { getPublicCatalog } from '@/lib/catalog';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

async function getCompanyCatalogPublicSettings(companySlug: string) {
  try {
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!adminKey || !supabaseUrl) return null;

    const admin = createSupabaseAdmin(String(supabaseUrl), String(adminKey), {
      auth: { autoRefreshToken: false, persistSession: false },
    });

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
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!adminKey || !supabaseUrl) return null;

    const admin = createSupabaseAdmin(String(supabaseUrl), String(adminKey), {
      auth: { autoRefreshToken: false, persistSession: false },
    });

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
        name,headline,welcome_text,about_text,cover_image,logo_url,primary_color,secondary_color,header_background_color,header_text_color,header_icon_bg_color,header_icon_color,
        show_cost_price,show_sale_price,price_unlock_mode,price_password_hash,show_top_benefit_bar,show_top_info_bar,
        top_benefit_text,top_benefit_mode,top_benefit_speed,top_benefit_animation,top_benefit_bg_color,top_benefit_text_color,top_benefit_height,top_benefit_text_size,top_benefit_image_url,
        top_benefit_image_fit,top_benefit_image_scale,top_benefit_image_align,top_benefit_text_align,show_installments,max_installments,
        cash_price_discount_percent,enable_stock_management,global_allow_backorder,banners,banners_mobile,share_banner_url,store_banner_meta,gallery_urls,gallery_title,gallery_subtitle,gallery_title_color,gallery_subtitle_color,show_headline_overlay,cover_headline_position,headline_text_color,cover_headline_font_size,cover_headline_offset_x,cover_headline_offset_y,cover_headline_z_index,cover_headline_wrap,cover_headline_force_two_lines
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
  }>;
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const normalizedCompanySlug = String(slug || '').trim().toLowerCase();
  const supabase = await createClient();

  let company: any = null;

  // Tenta leitura pública primeiro.
  const { data: companyBySlug } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', normalizedCompanySlug)
    .maybeSingle();

  if (companyBySlug) {
    company = companyBySlug;
  }

  // Fallback rápido sem service-role: tente resolver company via public_catalogs -> profiles -> companies
  if (!company) {
    try {
      const { data: pc } = await supabase
        .from('public_catalogs')
        .select('user_id')
        .eq('catalog_slug', normalizedCompanySlug)
        .maybeSingle();
      if (pc && pc.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', pc.user_id)
          .maybeSingle();
        const companyId = profile?.company_id || null;
        if (companyId) {
          const { data: companyFromId } = await supabase
            .from('companies')
            .select('*')
            .eq('id', companyId)
            .maybeSingle();
          if (companyFromId) company = companyFromId;
        }
      }
    } catch (e) {
      // ignore fallback errors
    }
  }

  // Fallback com service role para ambientes com RLS restritiva em companies.
  if (!company) {
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (adminKey && supabaseUrl) {
      const admin = createSupabaseAdmin(String(supabaseUrl), String(adminKey), {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: companyBySlugAdmin } = await admin
        .from('companies')
        .select('*')
        .eq('slug', normalizedCompanySlug)
        .maybeSingle();

      if (companyBySlugAdmin) {
        company = companyBySlugAdmin;
      }
    }
  }

  if (!company) {
    return notFound();
  }

  const { data: companyPages } = await supabase
    .from('company_pages')
    .select('id,title,slug')
    .eq('company_id', company.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  const ownerSettingsData = await getCompanyOwnerSettings(String(company.id));
  const ownerSettings = ownerSettingsData?.settings || null;
  const ownerUserId = ownerSettingsData?.ownerUserId || null;
  const publicCatalogSettings = await getCompanyCatalogPublicSettings(normalizedCompanySlug);
  // Merge refinado: ownerSettings como base, publicCatalogSettings como camada pública,
  // e company (Aba Institucional) aplicados por cima apenas quando não são null/undefined.
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
  // start with ownerSettings as base
  if (ownerSettings) applyNonNull(companyEffective, ownerSettings);
  // overlay public (only non-null values)
  if (publicCatalogSettings) applyNonNull(companyEffective, publicCatalogSettings);
  // finally overlay company institutional values (only non-null values)
  applyNonNull(companyEffective, companyBase);

  // Ensure critical computed fields with sensible fallbacks
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
  companyEffective.price_unlock_mode = companyEffective.price_unlock_mode || ownerSettings?.price_unlock_mode || 'modal';

  companyEffective.user_id = companyEffective.user_id || (companyBase as any).user_id || ownerUserId || (publicCatalogSettings as any)?.user_id || String(companyBase.id);

  const catalogData = await getPublicCatalog(String(company.id));
  const products = catalogData.success && Array.isArray(catalogData.products) ? catalogData.products : [];

  return (
    <CatalogRichLayout
      company={{ ...companyEffective, company_pages: companyPages || [] }}
      representative={null}
      products={products}
    />
  );
}
