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

export async function resolveContext(
  slugParam: string[] | string | undefined,
  supabase: SupabaseClient<any, 'public', any>
): Promise<CatalogContext | null> {
  // Convenção: [empresa, representante] => distribuidora; [representante] => catálogo individual.
  const slugArray = Array.isArray(slugParam)
    ? slugParam.filter(Boolean)
    : slugParam
      ? [slugParam]
      : [];

  if (slugArray.length === 0) return null;

  if (slugArray.length >= 2) {
    const [companySlug, repSlug] = slugArray;

    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('slug', companySlug)
      .maybeSingle();

    if (!company) return null;

    // também tente obter dados públicos do catálogo (logo, cores, banners)
    let catalog: any = null;
    try {
      const { data: pc } = await supabase
        .from('public_catalogs')
        .select('user_id,logo_url,primary_color,secondary_color,header_background_color,header_text_color,header_icon_bg_color,header_icon_color,banners,banners_mobile')
        .eq('catalog_slug', companySlug)
        .maybeSingle();
      if (pc) catalog = pc;
    } catch (e) {
      // ignore
    }

    const { data: representative } = await supabase
      .from('profiles')
      .select('*')
      .eq('slug', repSlug)
      .eq('company_id', company.id)
      .maybeSingle();

    if (!representative) return null;

    return {
      type: 'distributor',
      companySlug,
      repSlug,
      catalogSlug: companySlug,
      company,
      representative,
      catalog,
      pathPrefix: `/catalogo/${companySlug}/${repSlug}`,
    };
  }

  const [repSlug] = slugArray;
  const { data: representative } = await supabase
    .from('profiles')
    .select('*')
    .eq('slug', repSlug)
    .maybeSingle();

  if (representative) {
    return {
      type: 'individual',
      repSlug,
      catalogSlug: repSlug,
      representative,
      pathPrefix: `/catalogo/${repSlug}`,
    };
  }

  // First try settings.catalog_slug (saved from dashboard)
  let catalog: any = null;
  let foundSettings: any = null;
  try {
    const { data: settingsRow } = await supabase
      .from('settings')
      .select('*')
      .eq('catalog_slug', repSlug)
      .maybeSingle();
    if (settingsRow) {
      foundSettings = settingsRow;
      // if settingsRow.user_id exists, try to load profile for representative
      if (settingsRow.user_id) {
        try {
          const { data: repProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', settingsRow.user_id)
            .maybeSingle();
          if (repProfile) {
            return {
              type: 'individual',
              repSlug,
              catalogSlug: repSlug,
              representative: repProfile,
              catalog: null,
              settings: settingsRow,
              pathPrefix: `/catalogo/${repSlug}`,
            };
          }
        } catch (e) {
          // ignore profile lookup errors and continue to public_catalogs fallback
        }
      }
      // do not assign settingsRow to `catalog` — store it in foundSettings and continue fallback
    }
  } catch (e) {
    // ignore settings lookup errors and continue to public_catalogs fallback
  }

  // Fallback: public_catalogs by catalog_slug
  const { data: publicCatalog } = await supabase
    .from('public_catalogs')
    .select('*')
    .eq('catalog_slug', repSlug)
    .maybeSingle();

  if (!catalog && !publicCatalog) return null;

  // prefer settings result when available
  if (!catalog && publicCatalog) catalog = publicCatalog;

  // Prefer explicit settings found by catalog_slug; otherwise, try loading settings by catalog.user_id
  let settings: any = foundSettings ?? null;
  if (!settings && catalog?.user_id) {
    const { data } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', catalog.user_id)
      .maybeSingle();
    settings = data;
  }

  return {
    type: 'individual',
    repSlug,
    catalogSlug: repSlug,
    representative: null,
    catalog,
    settings,
    pathPrefix: `/catalogo/${repSlug}`,
  };
}
