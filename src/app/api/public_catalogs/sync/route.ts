import { NextResponse } from 'next/server';
import { syncPublicCatalog } from '@/lib/sync-public-catalog';

/**
 * API Route para sincronizar dados entre a tabela privada 'settings'
 * e a tabela pública 'public_catalogs'.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      user_id,
      slug,
      is_active, // NOVO: Campo de ativação/desativação
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
      // Metadados visuais da Barra de Benefícios
      top_benefit_image_url,
      top_benefit_height,
      top_benefit_text_size,
      top_benefit_bg_color,
      top_benefit_text_color,
      top_benefit_text,
      show_top_benefit_bar,
      show_top_info_bar,
    } = body;

    // Validação básica: precisamos do ID e do Link para saber quem atualizar
    if (!user_id || !slug) {
      return NextResponse.json(
        { error: 'user_id and slug are required' },
        { status: 400 }
      );
    }

    // Chama a função auxiliar que executa o UPSERT no banco
    await syncPublicCatalog(user_id, {
      slug,
      is_active: is_active ?? true, // Garante que se vier vazio, a loja continue online por padrão
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
      // Repassa os campos da Top Bar para que o catálogo reflita o branding
      top_benefit_image_url,
      top_benefit_height,
      top_benefit_text_size,
      top_benefit_bg_color,
      top_benefit_text_color,
      top_benefit_text,
      show_top_benefit_bar,
      show_top_info_bar,
    });

    return NextResponse.json({
      success: true,
      message: `Catálogo '${slug}' sincronizado com status: ${is_active ? 'Online' : 'Offline'}`,
    });
  } catch (err: any) {
    console.error('ERRO CRÍTICO em API /api/public_catalogs/sync:', err);
    return NextResponse.json(
      { error: err?.message || 'Erro interno de sincronização' },
      { status: 500 }
    );
  }
}
