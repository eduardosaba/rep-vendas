'use server';

/**
 * resolveCatalogBranding
 * ----------------------
 * Centraliza a lógica de herança de identidade visual do catálogo:
 *
 *   companies (Marca da Distribuidora)
 *       ↓ sobrescrito por
 *   settings do dono do catálogo (representante ou admin)
 *       ↓ filtros técnicos
 *   public_catalogs (apenas slug + is_active)
 *
 * Se o usuário é representante vinculado a uma distribuidora, as cores/banners
 * da distribuidora são usados como padrão, e os campos em `settings` do
 * representante sobrescrevem apenas o que ele personalizou individualmente.
 */

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

function buildAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseAdmin(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export interface CatalogBranding {
  // Identidade
  store_name: string;
  primary_color: string;
  secondary_color: string | null;
  logo_url: string | null;
  font_family: string | null;
  font_url: string | null;
  // Visual
  cover_image: string | null;
  headline: string | null;
  welcome_text: string | null;
  about_text: string | null;
  footer_message: string | null;
  footer_background_color: string | null;
  footer_text_color: string | null;
  // Banners
  banners: string[];
  banners_mobile: string[];
  // Galeria
  gallery_urls: string[];
  gallery_title: string | null;
  gallery_subtitle: string | null;
  gallery_title_color: string | null;
  gallery_subtitle_color: string | null;
  // Topo de benefícios
  show_top_benefit_bar: boolean;
  top_benefit_text: string | null;
  top_benefit_bg_color: string | null;
  top_benefit_text_color: string | null;
  top_benefit_height: number | null;
  top_benefit_text_size: number | null;
  top_benefit_mode: string;
  top_benefit_speed: string;
  top_benefit_animation: string;
  top_benefit_image_url: string | null;
  top_benefit_image_fit: string | null;
  top_benefit_image_scale: number | null;
  top_benefit_image_align: string | null;
  top_benefit_text_align: string | null;
  // Preços
  show_installments: boolean;
  max_installments: number | null;
  show_sale_price: boolean;
  show_cost_price: boolean;
  price_unlock_mode: string;
  // Estoque
  enable_stock_management: boolean;
  global_allow_backorder: boolean;
  // Misc
  is_active: boolean;
  catalog_slug: string | null;
  phone: string | null;
  whatsapp_url: string | null;
  email: string | null;
  og_image_url: string | null;
  share_banner_url: string | null;
  price_password_hash: string | null;
  [key: string]: any;
}

const DEFAULTS: CatalogBranding = {
  store_name: 'Catálogo Virtual',
  primary_color: '#b9722e',
  secondary_color: null,
  logo_url: null,
  font_family: null,
  font_url: null,
  cover_image: null,
  headline: null,
  welcome_text: null,
  about_text: null,
  footer_message: null,
  footer_background_color: null,
  footer_text_color: null,
  banners: [],
  banners_mobile: [],
  gallery_urls: [],
  gallery_title: null,
  gallery_subtitle: null,
  gallery_title_color: null,
  gallery_subtitle_color: null,
  show_top_benefit_bar: false,
  top_benefit_text: null,
  top_benefit_bg_color: null,
  top_benefit_text_color: null,
  top_benefit_height: null,
  top_benefit_text_size: null,
  top_benefit_mode: 'static',
  top_benefit_speed: 'medium',
  top_benefit_animation: 'scroll_left',
  top_benefit_image_url: null,
  top_benefit_image_fit: 'cover',
  top_benefit_image_scale: 100,
  top_benefit_image_align: 'center',
  top_benefit_text_align: 'center',
  show_installments: false,
  max_installments: null,
  show_sale_price: false,
  show_cost_price: false,
  price_unlock_mode: 'none',
  enable_stock_management: false,
  global_allow_backorder: false,
  is_active: true,
  catalog_slug: null,
  phone: null,
  whatsapp_url: null,
  email: null,
  og_image_url: null,
  share_banner_url: null,
  price_password_hash: null,
};

/** Merge: valores não-nulos de `override` sobrescrevem `base`. */
function merge(base: any, override: any): any {
  if (!override) return base;
  const result = { ...base };
  for (const [k, v] of Object.entries(override)) {
    if (v !== null && typeof v !== 'undefined') {
      result[k] = v;
    }
  }
  return result;
}

/**
 * Resolve o branding final de um catálogo público.
 *
 * @param ownerUserId  - user_id do dono do catálogo (rep ou admin_company)
 * @param companyId    - company_id vinculado ao dono (pode ser null)
 */
export async function resolveCatalogBranding(
  ownerUserId: string,
  companyId?: string | null
): Promise<CatalogBranding> {
  const admin = buildAdmin();
  if (!admin) return { ...DEFAULTS };

  // Passo 1 — Base: dados da distribuidora (company)
  let companyData: any = null;
  if (companyId) {
    try {
      const { data } = await admin
        .from('companies')
        .select(`
          id,name,primary_color,secondary_color,logo_url,cover_image,
          headline,welcome_text,about_text,footer_message,footer_background_color,footer_text_color,
          font_family,font_url,banners,banners_mobile,gallery_urls,gallery_title,gallery_subtitle,
          gallery_title_color,gallery_subtitle_color,
          show_top_benefit_bar,top_benefit_text,top_benefit_bg_color,top_benefit_text_color,
          top_benefit_height,top_benefit_text_size,top_benefit_mode,top_benefit_speed,
          top_benefit_animation,top_benefit_image_url,top_benefit_image_fit,top_benefit_image_scale,
          top_benefit_image_align,top_benefit_text_align,
          show_installments,max_installments,show_sale_price,show_cost_price,price_unlock_mode,
          enable_stock_management,global_allow_backorder,
          phone,email,og_image_url,share_banner_url
        `)
        .eq('id', companyId)
        .maybeSingle();
      companyData = data || null;
    } catch (_) {}
  }

  // Passo 2 — Override: settings do dono do catálogo
  let ownerSettings: any = null;
  try {
    const { data } = await admin
      .from('settings')
      .select(`
        name,primary_color,secondary_color,logo_url,cover_image,
        headline,welcome_text,about_text,footer_message,footer_background_color,footer_text_color,
        font_family,font_url,catalog_slug,is_active,phone,whatsapp_url,email,
        banners,banners_mobile,gallery_urls,gallery_title,gallery_subtitle,
        gallery_title_color,gallery_subtitle_color,
        show_top_benefit_bar,top_benefit_text,top_benefit_bg_color,top_benefit_text_color,
        top_benefit_height,top_benefit_text_size,top_benefit_mode,top_benefit_speed,
        top_benefit_animation,top_benefit_image_url,top_benefit_image_fit,top_benefit_image_scale,
        top_benefit_image_align,top_benefit_text_align,
        show_installments,max_installments,show_sale_price,show_cost_price,price_unlock_mode,
        enable_stock_management,global_allow_backorder,
        og_image_url,share_banner_url,price_password_hash,
        representative_name,store_banner_meta
      `)
      .eq('user_id', ownerUserId)
      .maybeSingle();
    ownerSettings = data || null;
  } catch (_) {}

  // Passo 3 — Índice: public_catalogs (apenas slug + is_active)
  let publicIndex: any = null;
  try {
    const { data } = await admin
      .from('public_catalogs')
      .select('catalog_slug,is_active,price_password_hash')
      .eq('user_id', ownerUserId)
      .maybeSingle();
    publicIndex = data || null;
  } catch (_) {}

  // Montagem com herança
  let result: CatalogBranding = { ...DEFAULTS };
  result = merge(result, companyData);    // distribuidora como base
  result = merge(result, ownerSettings); // rep/dono sobrescreve o que personalizou

  // store_name: prioridade para representative_name, depois name da settings, depois company
  result.store_name =
    ownerSettings?.representative_name ||
    ownerSettings?.name ||
    companyData?.name ||
    DEFAULTS.store_name;

  // Garante arrays
  if (!Array.isArray(result.banners)) result.banners = [];
  if (!Array.isArray(result.banners_mobile)) result.banners_mobile = [];
  if (!Array.isArray(result.gallery_urls)) result.gallery_urls = [];

  // slug e is_active vêm do índice público (authoritative)
  if (publicIndex?.catalog_slug) result.catalog_slug = publicIndex.catalog_slug;
  if (typeof publicIndex?.is_active === 'boolean') result.is_active = publicIndex.is_active;
  if (publicIndex?.price_password_hash) result.price_password_hash = publicIndex.price_password_hash;

  return result;
}
