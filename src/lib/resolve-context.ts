import type { SupabaseClient } from '@supabase/supabase-js';

export type CatalogContext = {
  type: 'distributor' | 'individual';
  companySlug?: string;
  repSlug: string;
  catalogSlug: string;
  company?: any;
  representative?: any;
  catalog?: any;
  settings?: any;
  pathPrefix: string;
};

export function normalizeCatalogSlug(value: string): string {
  if (!value) return '';
  try {
    return decodeURIComponent(value)
      .trim()
      .replace(/^\/+|\/+$/g, '')
      .toLowerCase();
  } catch {
    return value
      .trim()
      .replace(/^\/+|\/+$/g, '')
      .toLowerCase();
  }
}

export function escapeIlikePattern(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&');
}

export type PublicCatalogResolutionResult = {
  context: CatalogContext | null;
  resolvedBy?: 'SSR' | 'ADMIN_FALLBACK';
  error?: { code?: string; message: string };
};

export async function resolvePublicCatalogContext(
  slugParam: string[] | string | undefined,
  supabase: SupabaseClient<any, 'public', any>,
  createAdminClient?: () => SupabaseClient<any, 'public', any> | null,
  options?: { userAgent?: string; pathname?: string }
): Promise<PublicCatalogResolutionResult> {
  const rawSlug = Array.isArray(slugParam) ? slugParam.join('/') : slugParam || '';
  const normalizedSlug = normalizeCatalogSlug(rawSlug);
  const slugParts = normalizedSlug.split('/').filter(Boolean);

  if (slugParts.length === 0) {
    return { context: null };
  }

  // 1. Resolução via cliente SSR normal (público)
  try {
    const context = await resolveContext(slugParts, supabase);
    if (context) {
      return { context, resolvedBy: 'SSR' };
    }
  } catch (err: any) {
    console.error('[resolvePublicCatalogContext] SSR_CLIENT_ERROR', {
      pathname: options?.pathname,
      rawSlug,
      normalizedSlug,
      errorCode: err?.code,
      errorMessage: err?.message || String(err),
      userAgent: options?.userAgent?.substring(0, 100),
    });
  }

  // 2. Fallback via cliente Admin (Service Role) exclusivamente no servidor e sob demanda
  if (createAdminClient) {
    try {
      const adminClient = createAdminClient();
      if (adminClient) {
        const adminContext = await resolveContext(slugParts, adminClient);
        if (adminContext) {
          console.warn('[resolvePublicCatalogContext] RESOLVED_BY_ADMIN_FALLBACK', {
            pathname: options?.pathname,
            rawSlug,
            normalizedSlug,
            userAgent: options?.userAgent?.substring(0, 100),
          });
          return { context: adminContext, resolvedBy: 'ADMIN_FALLBACK' };
        }
      }
    } catch (adminErr: any) {
      console.error('[resolvePublicCatalogContext] ADMIN_FALLBACK_ERROR', {
        pathname: options?.pathname,
        rawSlug,
        normalizedSlug,
        errorCode: adminErr?.code,
        errorMessage: adminErr?.message || String(adminErr),
        userAgent: options?.userAgent?.substring(0, 100),
      });
    }
  }

  console.warn('[resolvePublicCatalogContext] CATALOG_NOT_FOUND', {
    pathname: options?.pathname,
    rawSlug,
    normalizedSlug,
    userAgent: options?.userAgent?.substring(0, 100),
  });

  return { context: null };
}

export async function resolveContext(
  slugParam: string[] | string | undefined,
  supabase: SupabaseClient<any, 'public', any>
): Promise<CatalogContext | null> {
  const slugArray = Array.isArray(slugParam)
    ? slugParam.filter(Boolean)
    : slugParam
      ? [slugParam]
      : [];

  if (slugArray.length === 0) return null;

  if (slugArray.length >= 2) {
    const [companySlug, repSlug] = slugArray;
    const normCompany = normalizeCatalogSlug(companySlug);
    const normRep = normalizeCatalogSlug(repSlug);

    const { data: company } = await supabase
      .from('companies')
      .select('id, name, slug, logo_url, welcome_text, updated_at')
      .ilike('slug', escapeIlikePattern(normCompany))
      .maybeSingle();

    if (!company) return null;

    let catalog: any = null;
    try {
      const { data: pc } = await supabase
        .from('public_catalogs')
        .select('user_id,logo_url,primary_color,secondary_color,header_background_color,header_text_color,header_icon_bg_color,header_icon_color,banners,banners_mobile,store_name,footer_message,is_active')
        .ilike('catalog_slug', escapeIlikePattern(normCompany))
        .maybeSingle();
      if (pc) catalog = pc;
    } catch (e) {
      // ignore
    }

    const { data: representative } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, slug, company_id')
      .ilike('slug', escapeIlikePattern(normRep))
      .eq('company_id', company.id)
      .maybeSingle();

    if (!representative) return null;

    return {
      type: 'distributor',
      companySlug: normCompany,
      repSlug: normRep,
      catalogSlug: normCompany,
      company,
      representative,
      catalog,
      pathPrefix: `/catalogo/${normCompany}/${normRep}`,
    };
  }

  const [repSlug] = slugArray;
  const normRep = normalizeCatalogSlug(repSlug);

  const { data: representative } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, slug, company_id')
    .ilike('slug', escapeIlikePattern(normRep))
    .maybeSingle();

  if (representative) {
    return {
      type: 'individual',
      repSlug: normRep,
      catalogSlug: normRep,
      representative,
      pathPrefix: `/catalogo/${normRep}`,
    };
  }

  let catalog: any = null;
  let foundSettings: any = null;
  
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normRep);
  if (isUuid) {
    const { data: orgData } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('id', normRep)
      .maybeSingle();
      
    if (orgData) {
      return {
        type: 'distributor',
        companySlug: normRep,
        repSlug: normRep,
        catalogSlug: normRep,
        company: orgData,
        pathPrefix: `/catalogo/${normRep}`,
      };
    }
  } else {
    const { data: orgDataBySlug } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .ilike('slug', escapeIlikePattern(normRep))
      .maybeSingle();

    if (orgDataBySlug) {
      return {
        type: 'distributor',
        companySlug: normRep,
        repSlug: normRep,
        catalogSlug: normRep,
        company: orgDataBySlug,
        pathPrefix: `/catalogo/${normRep}`,
      };
    }
  }

  try {
    const { data: settingsRow } = await supabase
      .from('settings')
      .select('user_id, name, representative_name, catalog_slug, logo_url, primary_color, secondary_color, banners, banners_mobile, footer_message, phone, show_top_benefit_bar, show_top_info_bar, top_benefit_text, top_benefit_mode, top_benefit_speed, top_benefit_animation, top_benefit_bg_color, top_benefit_text_color, top_benefit_height, top_benefit_text_size, top_benefit_image_url, show_cost_price, show_sale_price, price_unlock_mode, price_password_hash')
      .ilike('catalog_slug', escapeIlikePattern(normRep))
      .maybeSingle();
    if (settingsRow) {
      foundSettings = settingsRow;
      if (settingsRow.user_id) {
        try {
          const { data: repProfile } = await supabase
            .from('profiles')
            .select('id, full_name, email, phone, slug, company_id')
            .eq('id', settingsRow.user_id)
            .maybeSingle();
          if (repProfile) {
            return {
              type: 'individual',
              repSlug: normRep,
              catalogSlug: normRep,
              representative: repProfile,
              catalog: null,
              settings: settingsRow,
              pathPrefix: `/catalogo/${normRep}`,
            };
          }
        } catch (e) {
          // ignore
        }
      }
    }
  } catch (e) {
    // ignore
  }

  const { data: publicCatalog } = await supabase
    .from('public_catalogs')
    .select('id, user_id, catalog_slug, store_name, logo_url, single_brand_logo_url, primary_color, secondary_color, banners, banners_mobile, footer_message, phone, is_active, show_cost_price, show_sale_price, price_unlock_mode, price_password_hash, updated_at')
    .ilike('catalog_slug', escapeIlikePattern(normRep))
    .maybeSingle();

  if (!catalog && !publicCatalog) return null;

  if (!catalog && publicCatalog) catalog = publicCatalog;

  let settings: any = foundSettings ?? null;
  if (!settings && catalog?.user_id) {
    const { data } = await supabase
      .from('settings')
      .select('user_id, name, representative_name, catalog_slug, logo_url, primary_color, secondary_color, banners, banners_mobile, footer_message, phone, show_top_benefit_bar, show_top_info_bar, top_benefit_text, top_benefit_mode, top_benefit_speed, top_benefit_animation, top_benefit_bg_color, top_benefit_text_color, top_benefit_height, top_benefit_text_size, top_benefit_image_url, show_cost_price, show_sale_price, price_unlock_mode, price_password_hash')
      .eq('user_id', catalog.user_id)
      .maybeSingle();
    settings = data;
  }

  return {
    type: 'individual',
    repSlug: normRep,
    catalogSlug: normRep,
    representative: null,
    catalog,
    settings,
    pathPrefix: `/catalogo/${normRep}`,
  };
}
