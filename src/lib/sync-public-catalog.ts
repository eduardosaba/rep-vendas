/**
 * Sincroniza dados de public_catalogs quando settings é atualizado
 * Mantém a tabela pública sempre atualizada com os dados de branding
 */

import { createClient as createAnonClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export interface SyncCatalogData {
  slug: string;
  store_name: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  phone?: string;
  email?: string;
  footer_background_color?: string;
  footer_message?: string;
  show_sale_price?: boolean;
  show_cost_price?: boolean;
  header_background_color?: string | null;
  enable_stock_management?: boolean;
  show_installments?: boolean;
  max_installments?: number;
  show_cash_discount?: boolean;
  cash_price_discount_percent?: number;
  // Top benefit visual metadata
  top_benefit_image_url?: string;
  top_benefit_image_fit?: 'cover' | 'contain';
  top_benefit_image_scale?: number;
  top_benefit_height?: number;
  top_benefit_text_size?: number;
  top_benefit_bg_color?: string;
  top_benefit_text_color?: string;
  // Top benefit content + visibility
  top_benefit_text?: string;
  show_top_benefit_bar?: boolean;
  show_top_info_bar?: boolean;
}

/**
 * Sincroniza ou cria entrada em public_catalogs baseado em settings
 * Chamado quando o usuário atualiza configurações no dashboard
 */
export async function syncPublicCatalog(userId: string, data: SyncCatalogData) {
  // Usar service role para garantir permissões de escrita em todas as tabelas
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let supabase: any;
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createServiceClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY as string
    );
  } else {
    // fallback para client anônimo (apenas para ambientes de desenvolvimento)
    supabase = await createAnonClient();
  }

  // Valida slug: somente a-z0-9- e tamanho entre 3 e 50
  const slug = (data.slug || '').toLowerCase();
  if (!/^[a-z0-9-]{3,50}$/.test(slug)) {
    throw new Error('Invalid slug format: use a-z, 0-9 and dashes, 3-50 chars');
  }

  // Normalizar flags e garantir exclusividade (um ou outro)
  let showSale = data.show_sale_price ?? true;
  let showCost = data.show_cost_price ?? false;
  if (showSale && showCost) {
    // Padrão: preferir mostrar preço de venda e ocultar preço de custo
    showCost = false;
  }
  // Normalizar outras flags e valores numéricos
  const enableStock = data.enable_stock_management ?? false;
  let showInstallments = data.show_installments ?? false;
  let maxInstallments = Number(data.max_installments ?? 1);
  const showCashDiscount = data.show_cash_discount ?? false;
  const cashDiscountPercent = Number(data.cash_price_discount_percent ?? 0);

  // Verifica se já existe um catálogo para este usuário
  const { data: existing } = await supabase
    .from('public_catalogs')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    // Atualiza catálogo existente
    const { error } = await supabase
      .from('public_catalogs')
      .update({
        slug: data.slug,
        store_name: data.store_name,
        logo_url: data.logo_url,
        phone: data.phone,
        email: data.email,
        primary_color: data.primary_color || '#2563eb',
        header_background_color: data.header_background_color || '#ffffff',
        show_sale_price: showSale,
        show_cost_price: showCost,
        secondary_color: data.secondary_color || '#3b82f6',
        footer_message: data.footer_message,
        footer_background_color: data.footer_background_color,
        enable_stock_management: enableStock,
        show_installments: showInstallments,
        max_installments: maxInstallments,
        show_cash_discount: showCashDiscount,
        cash_price_discount_percent: cashDiscountPercent,
        // Top benefit fields
        top_benefit_image_url: data.top_benefit_image_url,
        top_benefit_image_fit: data.top_benefit_image_fit,
        top_benefit_image_scale: data.top_benefit_image_scale,
        top_benefit_height: data.top_benefit_height,
        top_benefit_text_size: data.top_benefit_text_size,
        top_benefit_bg_color: data.top_benefit_bg_color,
        top_benefit_text_color: data.top_benefit_text_color,
        top_benefit_text: data.top_benefit_text,
        show_top_benefit_bar: data.show_top_benefit_bar,
        show_top_info_bar: data.show_top_info_bar,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Erro ao atualizar public_catalog:', error);
      throw error;
    }
  } else {
    // Cria novo catálogo
    try {
      const { error } = await supabase.from('public_catalogs').insert({
        user_id: userId,
        slug,
        store_name: data.store_name,
        phone: data.phone,
        email: data.email,
        logo_url: data.logo_url,
        primary_color: data.primary_color || '#2563eb',
        header_background_color: data.header_background_color || '#ffffff',
        show_sale_price: showSale,
        show_cost_price: showCost,
        secondary_color: data.secondary_color || '#3b82f6',
        footer_message: data.footer_message,
        footer_background_color: data.footer_background_color,
        enable_stock_management: enableStock,
        show_installments: showInstallments,
        max_installments: maxInstallments,
        // Top benefit fields
        top_benefit_image_url: data.top_benefit_image_url,
        top_benefit_image_fit: data.top_benefit_image_fit,
        top_benefit_image_scale: data.top_benefit_image_scale,
        top_benefit_height: data.top_benefit_height,
        top_benefit_text_size: data.top_benefit_text_size,
        top_benefit_bg_color: data.top_benefit_bg_color,
        top_benefit_text_color: data.top_benefit_text_color,
        top_benefit_text: data.top_benefit_text,
        show_top_benefit_bar: data.show_top_benefit_bar,
        show_top_info_bar: data.show_top_info_bar,
        show_cash_discount: showCashDiscount,
        cash_price_discount_percent: cashDiscountPercent,
        is_active: true,
      });
      if (error) {
        console.error('Erro ao criar public_catalog:', error);
        // Erro de slug duplicado -> retorna mensagem legível
        if ((error?.code || '').toString().includes('23505')) {
          throw new Error('Slug já em uso por outro usuário');
        }
        throw error;
      }
    } catch (err) {
      throw err;
    }
  }

  return { success: true };
}

/**
 * Desativa o catálogo público do usuário
 * Útil para "ocultar" temporariamente a loja sem deletar dados
 */
export async function deactivatePublicCatalog(userId: string) {
  const supabase = await createAnonClient();

  const { error } = await supabase
    .from('public_catalogs')
    .update({ is_active: false })
    .eq('user_id', userId);

  if (error) {
    console.error('Erro ao desativar catálogo:', error);
    throw error;
  }

  return { success: true };
}

/**
 * Reativa o catálogo público do usuário
 */
export async function activatePublicCatalog(userId: string) {
  const supabase = await createAnonClient();

  const { error } = await supabase
    .from('public_catalogs')
    .update({ is_active: true })
    .eq('user_id', userId);

  if (error) {
    console.error('Erro ao ativar catálogo:', error);
    throw error;
  }

  return { success: true };
}
