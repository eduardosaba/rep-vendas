import { NextResponse } from 'next/server';
import { syncPublicCatalog } from '@/lib/sync-public-catalog';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      user_id,
      slug,
      store_name,
      logo_url,
      primary_color,
      secondary_color,
      footer_message,
      show_sale_price,
      show_cost_price,
      header_background_color,
      enable_stock_management,
      show_installments,
      max_installments,
      show_cash_discount,
      cash_price_discount_percent,
      // Top benefit visual metadata
      top_benefit_image_url,
      top_benefit_height,
      top_benefit_text_size,
      top_benefit_bg_color,
      top_benefit_text_color,
      top_benefit_text,
      show_top_benefit_bar,
      show_top_info_bar,
    } = body;

    if (!user_id || !slug) {
      return NextResponse.json(
        { error: 'user_id and slug are required' },
        { status: 400 }
      );
    }

    await syncPublicCatalog(user_id, {
      slug,
      store_name,
      logo_url,
      primary_color,
      secondary_color,
      footer_message,
      show_sale_price,
      show_cost_price,
      header_background_color,
      enable_stock_management,
      show_installments,
      max_installments,
      show_cash_discount,
      cash_price_discount_percent,
      // Forward top benefit fields so public_catalogs gets updated
      top_benefit_image_url,
      top_benefit_height,
      top_benefit_text_size,
      top_benefit_bg_color,
      top_benefit_text_color,
      top_benefit_text,
      show_top_benefit_bar,
      show_top_info_bar,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('API /api/public_catalogs/sync error:', err);
    return NextResponse.json(
      { error: err?.message || 'unknown' },
      { status: 500 }
    );
  }
}
