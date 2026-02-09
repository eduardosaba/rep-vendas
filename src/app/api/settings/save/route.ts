import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncPublicCatalog } from '@/lib/sync-public-catalog';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = await createClient();

    const {
      // allow caller to provide explicit slug, colors, media urls and catalog settings
      slug,
      name,
      phone,
      email,
      primary_color,
      secondary_color,
      header_background_color,
      footer_background_color,
      footer_message,
      banners,
      banners_mobile,
      logo_url,
      og_image_url,
      share_banner_url,
      top_benefit_image_url,
      top_benefit_image_fit,
      top_benefit_image_scale,
      top_benefit_height,
      top_benefit_text_size,
      top_benefit_bg_color,
      top_benefit_text_color,
      top_benefit_text,
      show_top_benefit_bar,
      show_top_info_bar,
      show_installments,
      max_installments,
      show_sale_price,
      show_cost_price,
      manage_stock,
      global_allow_backorder,
      cash_price_discount_percent,
      is_active,
      font_family,
      font_url,
      price_password_hash,
    } = body || {};

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id || null;
    if (!userId)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const settingsPayload: any = {
      user_id: userId,
      name: name || null,
      phone: phone || null,
      email: email || null,
      catalog_slug: slug || null,
      primary_color: primary_color || null,
      secondary_color: secondary_color || null,
      header_background_color: header_background_color || null,
      footer_background_color: footer_background_color || null,
      footer_message: footer_message || null,
      banners: Array.isArray(banners) ? banners : banners ? [banners] : null,
      banners_mobile: Array.isArray(banners_mobile)
        ? banners_mobile
        : banners_mobile
          ? [banners_mobile]
          : null,
      logo_url: logo_url || null,
      og_image_url: og_image_url || null,
      share_banner_url: share_banner_url || null,
      top_benefit_image_url: top_benefit_image_url || null,
      top_benefit_image_fit: top_benefit_image_fit || null,
      top_benefit_image_scale: top_benefit_image_scale || null,
      top_benefit_height: top_benefit_height || null,
      top_benefit_text_size: top_benefit_text_size || null,
      top_benefit_bg_color: top_benefit_bg_color || null,
      top_benefit_text_color: top_benefit_text_color || null,
      top_benefit_text: top_benefit_text || null,
      show_top_benefit_bar: !!show_top_benefit_bar,
      show_top_info_bar: !!show_top_info_bar,
      show_installments: !!show_installments,
      max_installments: max_installments ? Number(max_installments) : null,
      show_sale_price:
        typeof show_sale_price === 'boolean' ? show_sale_price : null,
      show_cost_price:
        typeof show_cost_price === 'boolean' ? show_cost_price : null,
      manage_stock: !!manage_stock,
      global_allow_backorder: !!global_allow_backorder,
      cash_price_discount_percent: cash_price_discount_percent
        ? Number(cash_price_discount_percent)
        : null,
      is_active: typeof is_active === 'boolean' ? is_active : true,
      font_family: font_family || null,
      font_url: font_url || null,
      price_password_hash: price_password_hash ?? null,
      updated_at: new Date().toISOString(),
    };

    // Upsert settings
    const { error: settingsError } = await supabase
      .from('settings')
      .upsert(settingsPayload);
    if (settingsError) throw settingsError;

    // Upsert profile whatsapp fallback
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        whatsapp: phone || null,
        updated_at: new Date().toISOString(),
      });
    if (profileError) throw profileError;

    // Call syncPublicCatalog to guarantee public_catalogs is updated server-side
    try {
      if (slug) {
        await syncPublicCatalog(userId, {
          slug,
          store_name: name || null,
          logo_url: logo_url || null,
          primary_color: primary_color || null,
          secondary_color: secondary_color || null,
          header_background_color: header_background_color || null,
          footer_background_color: footer_background_color || null,
          footer_message: footer_message || null,
          phone: phone || null,
          email: email || null,
          font_family: font_family || null,
          font_url: font_url || null,
          share_banner_url: share_banner_url || null,
          og_image_url: og_image_url || null,
          banners: settingsPayload.banners,
          banners_mobile: settingsPayload.banners_mobile,
          top_benefit_image_url: top_benefit_image_url || null,
          top_benefit_image_fit: top_benefit_image_fit || null,
          top_benefit_image_scale: top_benefit_image_scale || null,
          top_benefit_height: top_benefit_height || null,
          top_benefit_text_size: top_benefit_text_size || null,
          top_benefit_bg_color: top_benefit_bg_color || null,
          top_benefit_text_color: top_benefit_text_color || null,
          top_benefit_text: top_benefit_text || null,
          show_top_benefit_bar: !!show_top_benefit_bar,
          show_top_info_bar: !!show_top_info_bar,
          show_installments: !!show_installments,
          max_installments: max_installments ? Number(max_installments) : null,
          show_sale_price:
            typeof show_sale_price === 'boolean' ? show_sale_price : null,
          show_cost_price:
            typeof show_cost_price === 'boolean' ? show_cost_price : null,
          manage_stock: !!manage_stock,
          cash_price_discount_percent: cash_price_discount_percent
            ? Number(cash_price_discount_percent)
            : null,
          is_active: typeof is_active === 'boolean' ? is_active : true,
        });
      }
    } catch (e) {
      // Log but don't fail the entire request if sync fails
      console.error('settings/save: syncPublicCatalog failed', e);
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
