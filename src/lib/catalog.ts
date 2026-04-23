'use server';

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { resolveCatalogBranding } from '@/lib/resolve-catalog-branding';

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function getPublicCatalog(companyId: string, repId?: string, brand?: string) {
  try {
    // company settings (branding, welcome text, banners)
    const { data: companyRaw } = await supabaseAdmin
      .from('companies')
      .select('id,name,slug,primary_color,secondary_color,logo_url,welcome_text')
      .eq('id', companyId)
      .maybeSingle();

    // Resolve o branding final usando herança: company → admin settings
    let company: any = companyRaw || null;
    if (company) {
      try {
        // Encontrar o admin/dono da distribuidora para usar seus settings como override
        const { data: admins } = await supabaseAdmin
          .from('profiles')
          .select('id,role')
          .eq('company_id', companyId)
          .in('role', ['admin_company', 'master'])
          .limit(5);

        const preferred = Array.isArray(admins) && admins.length > 0
          ? ((admins as any[]).find((p: any) => p.role === 'admin_company') || admins[0])
          : null;

        if (preferred?.id) {
          const branding = await resolveCatalogBranding(preferred.id, companyId);
          company = { ...company, ...branding };
        }
      } catch (_) {
        // swallow merge errors and continue with base company data
      }
    }

    // products visible to public: those matching either company_id OR user_id
    // (some rows use user_id as owner, others use company_id). Fetch both and prefer seller-specific products when applicable.
    let productsQuery = supabaseAdmin.from('products').select('*').or(`company_id.eq.${companyId},user_id.eq.${companyId}`).order('created_at', { ascending: false });

    // apply brand filter if provided (product.brand is a string column)
    if (brand) {
      productsQuery = productsQuery.eq('brand', brand);
    }

    // We'll attempt to resolve rep first so we can filter products by seller_id when applicable

    // If repId provided, accept both profile.id and profile.slug
    let rep: any = null;
    if (repId) {
      const { data: byId } = await supabaseAdmin
        .from('profiles')
        .select('id,full_name,email,phone,slug,company_id')
        .eq('id', repId)
        .maybeSingle();

      if (byId) {
        rep = byId;
      } else {
        const { data: bySlug } = await supabaseAdmin
          .from('profiles')
          .select('id,full_name,email,phone,slug,company_id')
          .eq('slug', repId)
          .eq('company_id', companyId)
          .maybeSingle();
        rep = bySlug || null;
      }

      // If we found a rep and products table contains seller_id, prefer products for that seller
      if (rep && rep.id) {
        try {
          // fetch the combined products (company_id OR user_id) and then prefer seller-specific ones
          const { data: allProducts } = await productsQuery;
          const list = Array.isArray(allProducts) ? allProducts : [];
          // prefer products where seller_id === rep.id; if none, include products with seller_id null
          const sellerProducts = list.filter((p: any) => p.seller_id === rep.id);
          const fallbackProducts = list.filter((p: any) => p.seller_id == null);
          const productsForSeller = sellerProducts.length > 0 ? sellerProducts : fallbackProducts;
          return { success: true, company, products: productsForSeller || [], rep };
        } catch (e) {
          // fallback to default products query below
        }
      }

      // normalize: if DB has `full_name` but callers expect `display_name`, set it
      if (rep && !rep.display_name && rep.full_name) {
        (rep as any).display_name = (rep as any).full_name;
      }

    }

    // default product list
    const { data: products } = await productsQuery;

    return { success: true, company, products, rep };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}
