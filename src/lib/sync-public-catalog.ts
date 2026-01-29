/**
 * Sincroniza dados de public_catalogs quando settings é atualizado
 * Mantém a tabela pública sempre atualizada com os dados de branding
 */

import { createClient as createAnonClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export interface SyncCatalogData {
  slug: string;
  is_active?: boolean; // ADICIONADO: Para resolver o erro de compilação
  store_name: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  phone?: string;
  email?: string;
  price_password_hash?: string | null;
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
  banners?: string[] | null;
  banners_mobile?: string[] | null;
  top_benefit_bg_color?: string;
  top_benefit_text_color?: string;
  // Top benefit content + visibility
  top_benefit_text?: string;
  show_top_benefit_bar?: boolean;
  show_top_info_bar?: boolean;
  // Fonte customizada (nome conforme SYSTEM_FONTS.name) - opcional
  font_family?: string | null;
  // URL de fonte customizada (ex: woff2 público)
  font_url?: string | null;
  // Banner específico para compartilhamento/Open Graph (WhatsApp, Social)
  share_banner_url?: string | null;
  // Imagem de compartilhamento (Open Graph) customizada
  og_image_url?: string | null;
  // Logo da marca única (calculado se não fornecido)
  single_brand_logo_url?: string | null;
}

/**
 * Sincroniza ou cria entrada em public_catalogs baseado em settings
 */
export async function syncPublicCatalog(userId: string, data: SyncCatalogData) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let supabase: any;
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createServiceClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  } else {
    supabase = await createAnonClient();
  }

  // Valida slug
  const slug = (data.slug || '').toLowerCase();
  if (!/^[a-z0-9-]{3,50}$/.test(slug)) {
    throw new Error('Invalid slug format');
  }

  // Normalização de flags
  let showSale = data.show_sale_price ?? true;
  let showCost = data.show_cost_price ?? false;
  if (showSale && showCost) showCost = false;

  const isActive = data.is_active ?? true; // Captura o valor vindo do dashboard

  // Verifica existência
  const { data: existing } = await supabase
    .from('public_catalogs')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  // helper: tentar registrar auditoria (se tabela existir), não bloquear fluxo
  const recordAudit = async (payload: Record<string, any>) => {
    try {
      await supabase.from('audit_logs').insert(payload);
    } catch (e) {
      // se não existir a tabela ou falhar, apenas logamos no servidor
      console.info(
        'audit log skipped or failed',
        payload,
        e instanceof Error ? e.message : e
      );
    }
  };

  // Merge data with settings as best-effort so fields like phone/email/hash
  // are present when not provided by the caller.
  let mergedData: SyncCatalogData = { ...data };
  try {
    const { data: settings } = await supabase
      .from('settings')
      .select('phone, email, price_password_hash')
      .eq('user_id', userId)
      .maybeSingle();
    if (settings) {
      if (!mergedData.phone && settings.phone)
        mergedData.phone = settings.phone;
      if (!mergedData.email && settings.email)
        mergedData.email = settings.email;
      if (!mergedData.price_password_hash && settings.price_password_hash)
        mergedData.price_password_hash = settings.price_password_hash;
    }
  } catch (e) {
    // ignore - best effort
  }

  if (existing) {
    // UPDATE existing public_catalogs entry
    let finalFont: string | null = null;
    let auditReason = 'unknown';
    try {
      const { data: gc } = await supabase
        .from('global_configs')
        .select('allow_custom_fonts, font_family')
        .maybeSingle();
      const allowGlobal =
        typeof gc?.allow_custom_fonts === 'boolean'
          ? gc.allow_custom_fonts
          : true;

      if (!allowGlobal) {
        finalFont = gc?.font_family ?? null;
        auditReason = 'global_disabled';
      } else if (allowGlobal && data.font_family) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .maybeSingle();
        const { data: settings } = await supabase
          .from('settings')
          .select('plan_type')
          .eq('user_id', userId)
          .maybeSingle();
        const role = profile?.role || null;
        const plan = settings?.plan_type || null;
        const allowed =
          role === 'master' || plan === 'pro' || plan === 'premium';
        finalFont = allowed ? data.font_family : null;
        auditReason = allowed
          ? 'allowed_by_role_or_plan'
          : 'blocked_by_role_or_plan';
      } else {
        finalFont = gc?.font_family ?? null;
        auditReason = 'no_store_font_use_global';
      }
    } catch (e) {
      finalFont = data.font_family ?? null;
      auditReason = 'error_fallback';
    }

    try {
      await recordAudit({
        user_id: userId,
        action: 'sync_font_update',
        attempted_font: data.font_family ?? null,
        final_font: finalFont,
        allowed: !!finalFont,
        reason: auditReason,
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      /* ignore */
    }

    const { normalizePhone } = await import('./phone');
    const finalPhone = normalizePhone(mergedData.phone ?? null);

    const updatePayload: Record<string, any> = {
      slug: slug,
      store_name: mergedData.store_name || data.store_name,
      logo_url: mergedData.logo_url ?? data.logo_url ?? null,
      phone: finalPhone,
      email: mergedData.email ?? null,
      primary_color:
        mergedData.primary_color || data.primary_color || '#2563eb',
      header_background_color:
        mergedData.header_background_color ||
        data.header_background_color ||
        '#ffffff',
      secondary_color:
        mergedData.secondary_color || data.secondary_color || '#3b82f6',
      footer_message: mergedData.footer_message ?? data.footer_message ?? null,
      footer_background_color:
        mergedData.footer_background_color ??
        data.footer_background_color ??
        null,
      enable_stock_management:
        mergedData.enable_stock_management ??
        data.enable_stock_management ??
        false,
      show_installments:
        mergedData.show_installments ?? data.show_installments ?? false,
      max_installments: Number(
        mergedData.max_installments ?? data.max_installments ?? 1
      ),
      show_cash_discount:
        mergedData.show_cash_discount ?? data.show_cash_discount ?? false,
      cash_price_discount_percent: Number(
        mergedData.cash_price_discount_percent ??
          data.cash_price_discount_percent ??
          0
      ),
      top_benefit_image_url:
        mergedData.top_benefit_image_url ?? data.top_benefit_image_url ?? null,
      top_benefit_image_fit:
        mergedData.top_benefit_image_fit ??
        data.top_benefit_image_fit ??
        'cover',
      top_benefit_image_scale:
        mergedData.top_benefit_image_scale ??
        data.top_benefit_image_scale ??
        100,
      top_benefit_height:
        mergedData.top_benefit_height ?? data.top_benefit_height ?? 36,
      top_benefit_text_size:
        mergedData.top_benefit_text_size ?? data.top_benefit_text_size ?? 11,
      top_benefit_bg_color:
        mergedData.top_benefit_bg_color ??
        data.top_benefit_bg_color ??
        '#f3f4f6',
      top_benefit_text_color:
        mergedData.top_benefit_text_color ??
        data.top_benefit_text_color ??
        '#b9722e',
      top_benefit_text:
        mergedData.top_benefit_text ?? data.top_benefit_text ?? null,
      show_top_benefit_bar:
        mergedData.show_top_benefit_bar ?? data.show_top_benefit_bar ?? false,
      show_top_info_bar:
        mergedData.show_top_info_bar ?? data.show_top_info_bar ?? false,
      font_family: finalFont,
      font_url: mergedData.font_url ?? data.font_url ?? null,
      og_image_url: mergedData.og_image_url ?? data.og_image_url ?? null,
      // sanitize banners arrays: remove falsy values and empty arrays -> store null
      banners: (() => {
        const arr = mergedData.banners ?? data.banners ?? null;
        if (!Array.isArray(arr)) return null;
        const clean = arr
          .map((s: any) => (typeof s === 'string' ? s.trim() : ''))
          .filter(Boolean);
        return clean.length > 0 ? clean : null;
      })(),
      banners_mobile: (() => {
        const arr = mergedData.banners_mobile ?? data.banners_mobile ?? null;
        if (!Array.isArray(arr)) return null;
        const clean = arr
          .map((s: any) => (typeof s === 'string' ? s.trim() : ''))
          .filter(Boolean);
        return clean.length > 0 ? clean : null;
      })(),
      is_active: isActive,
      show_sale_price:
        mergedData.show_sale_price ?? data.show_sale_price ?? showSale,
      show_cost_price:
        mergedData.show_cost_price ?? data.show_cost_price ?? showCost,
      price_password_hash: mergedData.price_password_hash ?? null,
      updated_at: new Date().toISOString(),
    };

    // Reconstruir lista de marcas com produtos do usuário (best-effort)
    try {
      const { data: col } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'public_catalogs')
        .eq('column_name', 'brands')
        .maybeSingle();
      if (col) {
        const { data: prodBrands } = await supabase
          .from('products')
          .select('brand')
          .eq('user_id', userId)
          .not('brand', 'is', null);
        const uniqueBrands = Array.from(
          new Set(
            (prodBrands || [])
              .map((p: any) => (p.brand || '').toString().trim())
              .filter(Boolean)
          )
        ).sort();
        if (uniqueBrands.length > 0) updatePayload.brands = uniqueBrands;

        // Lógica de Single Brand Logo para metadados (banner fallback)
        if (uniqueBrands.length === 1) {
          const bName = uniqueBrands[0];
          const { data: bData } = await supabase
            .from('brands')
            .select('logo_url')
            .eq('user_id', userId)
            .eq('name', bName)
            .maybeSingle();
          if (bData?.logo_url) {
            updatePayload.single_brand_logo_url = bData.logo_url;
          } else {
            updatePayload.single_brand_logo_url = null;
          }
        } else {
          updatePayload.single_brand_logo_url = null;
        }
      }
    } catch (e) {
      // ignore failures here (best-effort)
    }

    const { error } = await supabase
      .from('public_catalogs')
      .update(updatePayload)
      .eq('user_id', userId);
    if (error) throw error;
  } else {
    // INSERT new public_catalogs entry
    let finalFontInsert: string | null = null;
    let auditReasonInsert = 'unknown';
    try {
      const { data: gc } = await supabase
        .from('global_configs')
        .select('allow_custom_fonts, font_family')
        .maybeSingle();
      const allowGlobal =
        typeof gc?.allow_custom_fonts === 'boolean'
          ? gc.allow_custom_fonts
          : true;
      if (!allowGlobal) {
        finalFontInsert = gc?.font_family ?? null;
        auditReasonInsert = 'global_disabled';
      } else if (allowGlobal && data.font_family) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .maybeSingle();
        const { data: settings } = await supabase
          .from('settings')
          .select('plan_type')
          .eq('user_id', userId)
          .maybeSingle();
        const role = profile?.role || null;
        const plan = settings?.plan_type || null;
        const allowed =
          role === 'master' || plan === 'pro' || plan === 'premium';
        finalFontInsert = allowed ? data.font_family : null;
        auditReasonInsert = allowed
          ? 'allowed_by_role_or_plan'
          : 'blocked_by_role_or_plan';
      } else {
        finalFontInsert = gc?.font_family ?? null;
        auditReasonInsert = 'no_store_font_use_global';
      }
    } catch (e) {
      finalFontInsert = data.font_family ?? null;
      auditReasonInsert = 'error_fallback';
    }

    try {
      await recordAudit({
        user_id: userId,
        action: 'sync_font_insert',
        attempted_font: data.font_family ?? null,
        final_font: finalFontInsert,
        allowed: !!finalFontInsert,
        reason: auditReasonInsert,
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      /* ignore */
    }

    const { normalizePhone: normalizePhoneInsert } = await import('./phone');
    const finalPhoneInsert = normalizePhoneInsert(mergedData.phone ?? null);

    const insertPayload: Record<string, any> = {
      user_id: userId,
      slug: slug,
      store_name: mergedData.store_name || data.store_name,
      phone: finalPhoneInsert,
      email: mergedData.email ?? null,
      logo_url: mergedData.logo_url ?? data.logo_url ?? null,
      primary_color:
        mergedData.primary_color || data.primary_color || '#2563eb',
      header_background_color:
        mergedData.header_background_color ||
        data.header_background_color ||
        '#ffffff',
      show_sale_price:
        mergedData.show_sale_price ?? data.show_sale_price ?? showSale,
      show_cost_price:
        mergedData.show_cost_price ?? data.show_cost_price ?? showCost,
      secondary_color:
        mergedData.secondary_color || data.secondary_color || '#3b82f6',
      footer_message: mergedData.footer_message ?? data.footer_message ?? null,
      footer_background_color:
        mergedData.footer_background_color ??
        data.footer_background_color ??
        null,
      enable_stock_management:
        mergedData.enable_stock_management ??
        data.enable_stock_management ??
        false,
      show_installments:
        mergedData.show_installments ?? data.show_installments ?? false,
      max_installments: Number(
        mergedData.max_installments ?? data.max_installments ?? 1
      ),
      show_cash_discount:
        mergedData.show_cash_discount ?? data.show_cash_discount ?? false,
      cash_price_discount_percent: Number(
        mergedData.cash_price_discount_percent ??
          data.cash_price_discount_percent ??
          0
      ),
      top_benefit_image_url:
        mergedData.top_benefit_image_url ?? data.top_benefit_image_url ?? null,
      top_benefit_image_fit:
        mergedData.top_benefit_image_fit ?? data.top_benefit_image_fit ?? null,
      top_benefit_image_scale:
        mergedData.top_benefit_image_scale ??
        data.top_benefit_image_scale ??
        null,
      top_benefit_height:
        mergedData.top_benefit_height ?? data.top_benefit_height ?? null,
      top_benefit_text_size:
        mergedData.top_benefit_text_size ?? data.top_benefit_text_size ?? null,
      top_benefit_bg_color:
        mergedData.top_benefit_bg_color ?? data.top_benefit_bg_color ?? null,
      top_benefit_text_color:
        mergedData.top_benefit_text_color ??
        data.top_benefit_text_color ??
        null,
      top_benefit_text:
        mergedData.top_benefit_text ?? data.top_benefit_text ?? null,
      show_top_benefit_bar:
        mergedData.show_top_benefit_bar ?? data.show_top_benefit_bar ?? false,
      share_banner_url:
        mergedData.share_banner_url ?? data.share_banner_url ?? null,
      show_top_info_bar:
        mergedData.show_top_info_bar ?? data.show_top_info_bar ?? false,
      font_family: finalFontInsert,
      font_url: mergedData.font_url ?? data.font_url ?? null,
      og_image_url: mergedData.og_image_url ?? data.og_image_url ?? null,
      // sanitize banners arrays: remove falsy values and empty arrays -> store null
      banners: (() => {
        const arr = mergedData.banners ?? data.banners ?? null;
        if (!Array.isArray(arr)) return null;
        const clean = arr
          .map((s: any) => (typeof s === 'string' ? s.trim() : ''))
          .filter(Boolean);
        return clean.length > 0 ? clean : null;
      })(),
      banners_mobile: (() => {
        const arr = mergedData.banners_mobile ?? data.banners_mobile ?? null;
        if (!Array.isArray(arr)) return null;
        const clean = arr
          .map((s: any) => (typeof s === 'string' ? s.trim() : ''))
          .filter(Boolean);
        return clean.length > 0 ? clean : null;
      })(),
      is_active: isActive,
      price_password_hash: mergedData.price_password_hash ?? null,
      created_at: new Date().toISOString(),
    };

    // Reconstruir lista de marcas com produtos do usuário (best-effort)
    try {
      const { data: col } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'public_catalogs')
        .eq('column_name', 'brands')
        .maybeSingle();
      if (col) {
        const { data: prodBrands } = await supabase
          .from('products')
          .select('brand')
          .eq('user_id', userId)
          .not('brand', 'is', null);
        const uniqueBrands = Array.from(
          new Set(
            (prodBrands || [])
              .map((p: any) => (p.brand || '').toString().trim())
              .filter(Boolean)
          )
        ).sort();
        if (uniqueBrands.length > 0) insertPayload.brands = uniqueBrands;

        // Lógica de Single Brand Logo para metadados (banner fallback)
        if (uniqueBrands.length === 1) {
          const bName = uniqueBrands[0];
          const { data: bData } = await supabase
            .from('brands')
            .select('logo_url')
            .eq('user_id', userId)
            .eq('name', bName)
            .maybeSingle();
          if (bData?.logo_url) {
            insertPayload.single_brand_logo_url = bData.logo_url;
          } else {
            insertPayload.single_brand_logo_url = null;
          }
        } else {
          insertPayload.single_brand_logo_url = null;
        }
      }
    } catch (e) {
      // ignore failures here (best-effort)
    }

    const { error } = await supabase
      .from('public_catalogs')
      .insert(insertPayload);
    if (error) {
      if ((error?.code || '').toString().includes('23505'))
        throw new Error('Slug já em uso');
      throw error;
    }
  }

  return { success: true };
}

// Funções de desativar/ativar simplificadas
export async function deactivatePublicCatalog(userId: string) {
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  return await supabase
    .from('public_catalogs')
    .update({ is_active: false })
    .eq('user_id', userId);
}

export async function activatePublicCatalog(userId: string) {
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  return await supabase
    .from('public_catalogs')
    .update({ is_active: true })
    .eq('user_id', userId);
}
