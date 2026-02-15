import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncPublicCatalog } from '@/lib/sync-public-catalog';

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // Debug: log full payload to help identify missing frontend fields
    console.log('📦 DADOS RECEBIDOS DO FRONTEND:', payload);

    const supabase = await createClient();

    // Try to resolve user id from session, fallback to payload.user_id
    let userId: string | null = null;
    try {
      // supabase.auth.getUser may exist in this server client
      // @ts-ignore
      const userRes = await supabase.auth.getUser?.();
      // newer versions return { data: { user } }
      if (userRes && (userRes as any).data && (userRes as any).data.user) {
        userId = (userRes as any).data.user.id;
      }
    } catch (e) {
      // ignore
    }
    userId = userId || payload.user_id || payload.userId || null;

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    // Normalize many expected fields from payload
    const {
      // identification / catalog
      slug,
      catalog_slug,
      name,
      catalog_title,

      // contact
      phone,
      email,

      // branding
      primary_color,
      secondary_color,
      header_background_color,
      footer_background_color,
      footer_message,
      logo_url,
      og_image_url,
      share_banner_url,

      // banners
      banners,
      banners_mobile,

      // top benefit
      top_benefit_text_color,
      top_benefit_text,
      show_top_benefit_bar,
      show_top_info_bar,
      top_benefit_image_url,
      top_benefit_image_fit,
      top_benefit_image_scale,
      top_benefit_height,
      top_benefit_text_size,
      top_benefit_image_align,
      top_benefit_text_align,

      // pricing / display
      show_installments,
      max_installments,
      show_sale_price,
      show_cost_price,
      cash_price_discount_percent,
      show_cash_discount,

      // stock / inventory
      manage_stock,
      enable_stock_management,
      global_allow_backorder,

      // fonts
      font_family,
      font_url,

      // grid fields removed from settings

      // misc
      is_active,
      representative_name,
      whatsapp_message_template,
      price_password,
      price_password_hash,
      cash_price_discount_percent: _cash_price_discount_percent,
      ...rest
    } = payload;

    const settingsPayload: any = {
      user_id: userId,
      name: name || null,
      phone: phone || null,
      email: email || null,
      primary_color: primary_color || null,
      secondary_color: secondary_color || null,
      header_background_color: header_background_color || null,
      footer_background_color: footer_background_color || null,
      footer_message: footer_message || null,
      banners: banners || null,
      banners_mobile: banners_mobile || null,
      logo_url: logo_url || null,
      og_image_url: og_image_url || null,
      share_banner_url: share_banner_url || null,
      top_benefit_text_color: top_benefit_text_color || null,
      top_benefit_text: top_benefit_text || null,
      show_top_benefit_bar: !!show_top_benefit_bar,
      show_top_info_bar: !!show_top_info_bar,
      top_benefit_image_url: top_benefit_image_url || null,
      top_benefit_image_fit: top_benefit_image_fit || null,
      top_benefit_image_scale: top_benefit_image_scale
        ? Number(top_benefit_image_scale)
        : null,
      top_benefit_height: top_benefit_height
        ? Number(top_benefit_height)
        : null,
      top_benefit_text_size: top_benefit_text_size
        ? Number(top_benefit_text_size)
        : null,
      top_benefit_image_align: top_benefit_image_align || null,
      top_benefit_text_align: top_benefit_text_align || null,
      show_installments: !!show_installments,
      max_installments: max_installments ? Number(max_installments) : null,
      show_sale_price:
        typeof show_sale_price === 'boolean' ? show_sale_price : null,
      show_cost_price:
        typeof show_cost_price === 'boolean' ? show_cost_price : null,
      cash_price_discount_percent: cash_price_discount_percent
        ? Number(cash_price_discount_percent)
        : null,
      enable_stock_management:
        typeof enable_stock_management === 'boolean'
          ? enable_stock_management
          : !!manage_stock,
      global_allow_backorder: !!global_allow_backorder,
      font_family: font_family || null,
      font_url: font_url || null,
      // grid_cols removed — frontend uses fixed defaults
      is_active: typeof is_active === 'boolean' ? is_active : true,
      representative_name: representative_name || null,
      whatsapp_message_template: whatsapp_message_template || null,
      price_password_hash: price_password_hash || price_password || null,
      updated_at: new Date().toISOString(),
    };

    // Upsert settings
    const { error: settingsError } = await supabase
      .from('settings')
      .upsert(settingsPayload);
    if (settingsError) throw settingsError;

    // Upsert profile whatsapp fallback
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      whatsapp: phone || null,
      updated_at: new Date().toISOString(),
    });
    if (profileError) throw profileError;

    // Build publicCatalogPayload mapping to mirror settings -> public_catalogs
    const finalSlug = slug || catalog_slug || payload.catalogSlug || null;

    const publicCatalogPayload: any = {
      user_id: userId,
      slug: finalSlug,
      store_name: name || null,
      logo_url: logo_url || null,
      primary_color: primary_color || null,
      secondary_color: secondary_color || null,
      header_background_color: header_background_color || null,
      footer_background_color: footer_background_color || null,
      footer_message: footer_message || null,
      phone: phone || null,
      email: email || null,
      representative_name: representative_name || null,
      whatsapp_message_template: whatsapp_message_template || null,
      banners: banners || [],
      banners_mobile: banners_mobile || [],
      share_banner_url: share_banner_url || null,
      og_image_url: og_image_url || null,
      font_family: font_family || null,
      font_url: font_url || null,
      show_cost_price: show_cost_price ?? null,
      show_sale_price: show_sale_price ?? null,
      show_installments: show_installments ?? null,
      max_installments: max_installments ? Number(max_installments) : null,
      cash_price_discount_percent: cash_price_discount_percent ?? null,
      enable_stock_management:
        typeof enable_stock_management === 'boolean'
          ? enable_stock_management
          : !!manage_stock,
      price_password_hash: price_password_hash || price_password || null,
      // grid_cols removed from public_catalogs payload
      show_top_benefit_bar: !!show_top_benefit_bar,
      show_top_info_bar: !!show_top_info_bar,
      top_benefit_text: top_benefit_text || null,
      top_benefit_bg_color: payload.top_benefit_bg_color || null,
      top_benefit_text_color: top_benefit_text_color || null,
      top_benefit_height: top_benefit_height
        ? Number(top_benefit_height)
        : null,
      top_benefit_text_size: top_benefit_text_size
        ? Number(top_benefit_text_size)
        : null,
      top_benefit_image_url: top_benefit_image_url || null,
      top_benefit_image_fit: top_benefit_image_fit || null,
      top_benefit_image_scale: top_benefit_image_scale
        ? Number(top_benefit_image_scale)
        : null,
      top_benefit_image_align: top_benefit_image_align || null,
      top_benefit_text_align: top_benefit_text_align || null,
      is_active: typeof is_active === 'boolean' ? is_active : true,
      updated_at: new Date().toISOString(),
    };

    // If no slug provided, try to discover existing slug for this user
    let finalSlugToUse = publicCatalogPayload.slug;
    if (!finalSlugToUse) {
      try {
        const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
          const { createClient: createSvcClient } =
            await import('@supabase/supabase-js');
          const svc = createSvcClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          const { data: existing } = await svc
            .from('public_catalogs')
            .select('slug')
            .eq('user_id', userId)
            .maybeSingle();
          if (existing && existing.slug) finalSlugToUse = existing.slug;
        }
      } catch (e) {
        console.warn('/api/settings/save: failed to lookup slug by user_id', e);
      }
    }

    if (!finalSlugToUse) {
      // If still no slug, we still upsert settings but skip public_catalogs sync
      console.log(
        '[settings/save] Nenhum slug encontrado; pulando syncPublicCatalog'
      );
    } else {
      // Ensure slug is set on payload
      publicCatalogPayload.slug = finalSlugToUse;

      // Remove user_id/updated_at from payload when upserting by user_id conflict
      const { user_id, updated_at, ...upsertBody } = publicCatalogPayload;

      // Upsert into public_catalogs using service role (server-to-server)
      try {
        const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
          const { createClient: createSvcClient } =
            await import('@supabase/supabase-js');
          const svc = createSvcClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          const { error: syncError } = await svc
            .from('public_catalogs')
            .upsert(upsertBody, { onConflict: 'user_id' });
          if (syncError) {
            console.error('❌ Erro na sincronização atômica:', syncError);
          } else {
            console.log('[settings/save] public_catalogs upsert concluído');
          }
        } else {
          // Fallback: call internal helper if available
          await syncPublicCatalog(userId, publicCatalogPayload);
        }
      } catch (e) {
        console.error('settings/save: syncPublicCatalog failed', e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('settings/save error', err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
