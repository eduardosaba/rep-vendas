import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSvcClient } from '@supabase/supabase-js';
import { inngest } from '@/inngest/client';

function isMissingColumnError(error: any) {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return (
    code === '42703' ||
    (message.includes('column') && (message.includes('does not exist') || message.includes('could not find')))
  );
}

function extractMissingColumnName(error: any): string | null {
  const msg = String(error?.message || '');
  const quoted = msg.match(/column\s+"([^\"]+)"\s+(?:of\s+relation\s+"[^\"]+"\s+)?does\s+not\s+exist/i);
  if (quoted?.[1]) return quoted[1];
  const apiShape = msg.match(/could not find the '([^']+)' column/i);
  if (apiShape?.[1]) return apiShape[1];
  return null;
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const isTabScopedSave = payload?.save_scope === 'tab';
    const hasOwnPayloadKey = (key: string) =>
      Object.prototype.hasOwnProperty.call(payload || {}, key);

    // Debug: log full payload to help identify missing frontend fields
    console.log('📦 DADOS RECEBIDOS DO FRONTEND:', payload);

    const supabase = await createClient();

    // Resolve actor user (authenticated user making the request)
    let actorUserId: string | null = null;
    // quando o usuário é admin de uma distribuidora, armazena o company_id
    let actorCompanyIdResolved: string | null = null;
    try {
      // supabase.auth.getUser may exist in this server client
      // NOTE: supabase.auth.getUser may not be available in all client versions
      const userRes = await supabase.auth.getUser?.();
      // newer versions return { data: { user } }
      if (userRes && (userRes as any).data && (userRes as any).data.user) {
        actorUserId = (userRes as any).data.user.id;
      }
    } catch (e) {
      console.warn('settings/save: failed to resolve session user', e);
    }

    const context = payload?.context === 'company' ? 'company' : 'representative';
    const requestedTargetId = payload?.targetId || payload?.user_id || payload?.userId || null;

    let userId: string | null = actorUserId || requestedTargetId;

    if (context === 'company') {
      if (!actorUserId) {
        return NextResponse.json(
          { error: 'Sessão inválida para editar configurações da distribuidora' },
          { status: 401 }
        );
      }

      const { data: actorProfile } = await supabase
        .from('profiles')
        .select('id,role,company_id')
        .eq('id', actorUserId)
        .maybeSingle();

      const actorRole = String((actorProfile as any)?.role || '');
      const actorCompanyId = String((actorProfile as any)?.company_id || '');
      // guarda para espelhamento posterior em companies
      actorCompanyIdResolved = actorCompanyId || null;
      const canManageCompany = ['admin_company', 'master', 'admin'].includes(actorRole);

      if (!canManageCompany) {
        return NextResponse.json(
          { error: 'Sem permissão para editar configurações da distribuidora' },
          { status: 403 }
        );
      }

      if (requestedTargetId && requestedTargetId !== actorUserId) {
        const { data: targetProfile } = await supabase
          .from('profiles')
          .select('id,company_id')
          .eq('id', String(requestedTargetId))
          .maybeSingle();

        const targetCompanyId = String((targetProfile as any)?.company_id || '');
        if (!targetProfile?.id || !actorCompanyId || !targetCompanyId || actorCompanyId !== targetCompanyId) {
          return NextResponse.json(
            { error: 'targetId inválido para esta distribuidora' },
            { status: 403 }
          );
        }

        userId = String(requestedTargetId);
      } else {
        userId = actorUserId;
      }
    }

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

      // social/contact handles
      instagram_handle,
      instagram_url,
      facebook_handle,
      facebook_url,
      linkedin_handle,
      linkedin_url,
      whatsapp_phone,
      whatsapp_url,

      // PDF visibility
      show_pdf_catalog,
      show_pdf_link,

      // branding
      primary_color,
      secondary_color,
      header_background_color,
      header_text_color,
      footer_text_color,
      header_icon_bg_color,
      header_icon_color,
      footer_background_color,
      footer_message,
      catalog_pdf_url,
      logo_url,
      cover_image,
      cover_image_fit,
      cover_image_height,
      cover_image_position,
      cover_image_offset_x,
      cover_image_offset_y,
      og_image_url,
      share_banner_url,
      gallery_urls,
      // gallery display
      gallery_title,
      gallery_subtitle,
      gallery_title_color,
      gallery_subtitle_color,
      cover_headline_font_size,
      cover_headline_offset_x,
      cover_headline_offset_y,
      cover_headline_z_index,
      cover_headline_wrap,
      cover_headline_force_two_lines,
      show_headline_overlay,
      cover_headline_position,
      headline_text_color,
      headline,
      welcome_text,
      about_text,

      // banners
      banners,
      banners_mobile,

      // top benefit
      top_benefit_bg_color,
      top_benefit_text_color,
      top_benefit_text,
      top_benefit_mode,
      top_benefit_speed,
      top_benefit_animation,
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
      price_unlock_mode,
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
      store_banner_meta,
      ...rest
    } = payload;

    const settingsPayload: any = {
      user_id: userId,
      catalog_slug: slug || catalog_slug || payload.catalogSlug || null,
          cover_image_fit: cover_image_fit ?? 'cover',
          cover_image_height: cover_image_height ? Number(cover_image_height) : null,
          cover_image_position: cover_image_position || null,
          cover_image_offset_x: typeof cover_image_offset_x !== 'undefined' ? Number(cover_image_offset_x) : null,
          cover_image_offset_y: typeof cover_image_offset_y !== 'undefined' ? Number(cover_image_offset_y) : null,
      name: name || null,
      phone: phone || null,
      email: email || null,
      primary_color: primary_color || null,
      secondary_color: secondary_color || null,
      // header_background_color and header_text_color intentionally omitted
      header_icon_bg_color: header_icon_bg_color || null,
      header_icon_color: header_icon_color || null,
      footer_background_color: footer_background_color || null,
      footer_text_color: footer_text_color || null,
      footer_message: footer_message || null,
      // social urls/handles
      instagram_url: instagram_url || null,
      instagram_handle: instagram_handle || null,
      facebook_url: facebook_url || null,
      facebook_handle: facebook_handle || null,
      linkedin_url: linkedin_url || null,
      linkedin_handle: linkedin_handle || null,
      whatsapp_url: whatsapp_url || null,
      whatsapp_phone: whatsapp_phone || null,
      catalog_pdf_url: catalog_pdf_url || null,
      show_pdf_catalog: typeof show_pdf_catalog !== 'undefined' ? !!show_pdf_catalog : null,
      show_pdf_link: typeof show_pdf_link !== 'undefined' ? !!show_pdf_link : null,
      banners: banners || null,
      banners_mobile: banners_mobile || null,
      logo_url: logo_url || null,
      cover_image: cover_image || null,
      og_image_url: og_image_url || null,
      share_banner_url: share_banner_url || null,
      gallery_urls: Array.isArray(gallery_urls) ? gallery_urls : null,
      // gallery display
      gallery_title: gallery_title || null,
      gallery_subtitle: gallery_subtitle || null,
      gallery_title_color: gallery_title_color || null,
      gallery_subtitle_color: gallery_subtitle_color || null,
      headline: headline || null,
      cover_headline_font_size: typeof cover_headline_font_size !== 'undefined' ? (Number(cover_headline_font_size) || null) : null,
      cover_headline_offset_x: typeof cover_headline_offset_x !== 'undefined' ? Number(cover_headline_offset_x) : null,
      cover_headline_offset_y: typeof cover_headline_offset_y !== 'undefined' ? Number(cover_headline_offset_y) : null,
      cover_headline_z_index: typeof cover_headline_z_index !== 'undefined' ? Number(cover_headline_z_index) : null,
      cover_headline_wrap: typeof cover_headline_wrap !== 'undefined' ? !!cover_headline_wrap : null,
      cover_headline_force_two_lines: typeof cover_headline_force_two_lines !== 'undefined' ? !!cover_headline_force_two_lines : null,
      welcome_text: welcome_text || null,
      about_text: about_text || null,
      // shipping_policy intentionally removed from settings payload
      top_benefit_bg_color: top_benefit_bg_color || null,
      top_benefit_text_color: top_benefit_text_color || null,
      top_benefit_text: top_benefit_text || null,
      top_benefit_mode:
        top_benefit_mode === 'marquee' ? 'marquee' : 'static',
      top_benefit_speed:
        top_benefit_speed === 'slow'
          ? 'slow'
          : top_benefit_speed === 'fast'
            ? 'fast'
            : 'medium',
      top_benefit_animation:
        top_benefit_animation === 'scroll_right'
          ? 'scroll_right'
          : top_benefit_animation === 'alternate'
            ? 'alternate'
            : 'scroll_left',
      show_top_benefit_bar: !!show_top_benefit_bar,
      show_top_info_bar: !!show_top_info_bar,
      top_benefit_image_url: top_benefit_image_url || null,
      top_benefit_image_fit: top_benefit_image_fit ?? 'cover',
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
      price_unlock_mode:
        price_unlock_mode === 'modal' || price_unlock_mode === 'fab'
          ? price_unlock_mode
          : 'none',
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
      // price_password_hash: only update when a non-empty value was explicitly provided.
      // Avoid overwriting existing hash with null when payload omitted other fields.
      // We'll set the final hash further below conditionally.
      updated_at: new Date().toISOString(),
    };

    if (isTabScopedSave) {
      const alwaysKeep = new Set(['user_id', 'updated_at']);
      const keepCatalogSlug =
        hasOwnPayloadKey('slug') ||
        hasOwnPayloadKey('catalog_slug') ||
        hasOwnPayloadKey('catalogSlug');

      for (const key of Object.keys(settingsPayload)) {
        if (alwaysKeep.has(key)) continue;
        if (key === 'catalog_slug' && keepCatalogSlug) continue;
        if (!hasOwnPayloadKey(key)) {
          delete settingsPayload[key];
        }
      }
    }

    // include store_banner_meta if provided (defensive upsert below)
    if (typeof store_banner_meta !== 'undefined') {
      settingsPayload.store_banner_meta = store_banner_meta || null;
    }

    // Determine final price password hash only if provided explicitly
    let finalPricePasswordHash: string | undefined;
    if (typeof price_password_hash === 'string' && price_password_hash.trim()) {
      finalPricePasswordHash = price_password_hash.trim();
    } else if (typeof price_password === 'string' && price_password.trim()) {
      // server-side hash using sha256 to match client behaviour
      finalPricePasswordHash = crypto.createHash('sha256').update(price_password).digest('hex');
    }

    if (typeof finalPricePasswordHash !== 'undefined') {
      settingsPayload.price_password_hash = finalPricePasswordHash;
    }

    // Upsert settings (defensive): if the DB schema is missing columns,
    // iteratively remove the offending keys and retry the upsert.
    let settingsUpsertResult: any = null;
    try {
      const payloadForUpsert: any = { ...settingsPayload };
      for (let attempts = 0; attempts < 8; attempts++) {
        const { data: sdata, error: settingsError } = await supabase
          .from('settings')
          .upsert(payloadForUpsert, { onConflict: 'user_id' })
          .select()
          .maybeSingle();

        if (!settingsError) {
          settingsUpsertResult = sdata ?? null;
          break;
        }

        if (!isMissingColumnError(settingsError)) throw settingsError;

        const missing = extractMissingColumnName(settingsError);
        if (!missing || !(missing in payloadForUpsert)) throw settingsError;

        // remove the missing column and retry
        delete payloadForUpsert[missing];
        console.warn(`[settings/save] removed missing column from payload: ${missing}`);
      }
    } catch (e: any) {
      // surface settings upsert failures as a server error
      console.error('[settings/save] settings upsert failed', e);
      return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
    }

    // Upsert profile whatsapp fallback
    const { data: profileUpsertData, error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      whatsapp: phone || null,
      updated_at: new Date().toISOString(),
    }).select().maybeSingle();
    if (profileError) {
      console.error('[settings/save] profiles upsert failed', profileError);
      return NextResponse.json({ error: profileError?.message || String(profileError) }, { status: 500 });
    }

    // Enfileira processamento de imagens de branding via Inngest (se houver uma marca)
    try {
      const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const svc = createSvcClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // tenta descobrir uma brand associada ao usuário (usa a primeira encontrada)
        const { data: brands } = await svc
          .from('brands')
          .select('id')
          .eq('user_id', userId)
          .limit(1);
        const brandId =
          brands && brands.length > 0 ? (brands[0] as any).id : null;

        if (brandId) {
          const hasOwn = (key: string) =>
            Object.prototype.hasOwnProperty.call(payload || {}, key);

          const collectAssets = async () => {
            const out: Array<{ url: string; asset: 'logo' | 'banner' }> = [];
            if (hasOwn('logo_url') && logo_url)
              out.push({ url: logo_url, asset: 'logo' });
            if (hasOwn('share_banner_url') && share_banner_url)
              out.push({ url: share_banner_url, asset: 'banner' });
            if (hasOwn('top_benefit_image_url') && top_benefit_image_url)
              out.push({ url: top_benefit_image_url, asset: 'banner' });
            // banners arrays
            try {
              if (hasOwn('banners') && Array.isArray(banners)) {
                for (const b of banners)
                  if (b) out.push({ url: b, asset: 'banner' });
              }
            } catch (e) {
              // ignore
            }
            try {
              if (hasOwn('banners_mobile') && Array.isArray(banners_mobile)) {
                for (const b of banners_mobile)
                  if (b) out.push({ url: b, asset: 'banner' });
              }
            } catch (e) {
              // ignore
            }
            return out;
          };

          const assets = await collectAssets();
          for (const a of assets) {
            try {
              // derive storage path from public URL if possible
              let sourcePath = a.url;
              try {
                const u = new URL(a.url);
                const seg = u.pathname.split('/');
                const idx = seg.indexOf('public');
                if (idx >= 0) sourcePath = seg.slice(idx + 1).join('/');
              } catch (e) {
                // leave as-is
              }

              await inngest.send({
                name: 'image/copy_brand.requested',
                data: {
                  sourcePath,
                  targetUserId: userId,
                  brandId,
                  asset: a.asset,
                },
              });
            } catch (e) {
              console.warn('Failed to enqueue brand image copy', e);
            }
          }
        }
      }
    } catch (e) {
      console.warn('settings/save: brand image enqueue failed', e);
    }

    // Build publicCatalogPayload mapping to mirror settings -> public_catalogs
    const finalSlug = slug || catalog_slug || payload.catalogSlug || null;

    const publicCatalogPayload: any = {
      user_id: userId,
      catalog_slug: finalSlug,
      // Garantir `store_name` no payload para evitar constraint NOT NULL
      store_name: name || payload.name || payload.store_name || 'Minha Loja',
      logo_url: logo_url || null,
      cover_image: cover_image || null,
      primary_color: primary_color || null,
      secondary_color: secondary_color || null,
      headline: headline || null,
      welcome_text: welcome_text || null,
      about_text: about_text || null,
      // header_background_color and header_text_color intentionally omitted
      header_icon_bg_color: header_icon_bg_color || null,
      header_icon_color: header_icon_color || null,
      footer_background_color: footer_background_color || null,
      footer_message: footer_message || null,
      footer_text_color: footer_text_color || null,
      phone: phone || null,
      email: email || null,
      // social fields copied to public catalog
      instagram_url: instagram_url || null,
      facebook_url: facebook_url || null,
      linkedin_url: linkedin_url || null,
      whatsapp_url: whatsapp_url || null,
      show_pdf_catalog: typeof show_pdf_catalog !== 'undefined' ? !!show_pdf_catalog : null,
      show_pdf_link: typeof show_pdf_link !== 'undefined' ? !!show_pdf_link : null,
      catalog_pdf_url: catalog_pdf_url || null,
      representative_name: representative_name || null,
      whatsapp_message_template: whatsapp_message_template || null,
      banners: banners || [],
      banners_mobile: banners_mobile || [],
      share_banner_url: share_banner_url || null,
      cover_image_fit: cover_image_fit || null,
      cover_image_height: cover_image_height ? Number(cover_image_height) : null,
      cover_image_position: cover_image_position || null,
      cover_image_offset_x: typeof cover_image_offset_x !== 'undefined' ? Number(cover_image_offset_x) : null,
      cover_image_offset_y: typeof cover_image_offset_y !== 'undefined' ? Number(cover_image_offset_y) : null,
      og_image_url: og_image_url || null,
      font_family: font_family || null,
      font_url: font_url || null,
      gallery_urls: Array.isArray(gallery_urls) ? gallery_urls : null,
      // gallery display
      gallery_title: gallery_title || null,
      gallery_subtitle: gallery_subtitle || null,
      gallery_title_color: gallery_title_color || null,
      gallery_subtitle_color: gallery_subtitle_color || null,
      show_headline_overlay: typeof show_headline_overlay !== 'undefined' ? !!show_headline_overlay : null,
      cover_headline_position: cover_headline_position || null,
      headline_text_color: headline_text_color || null,
      cover_headline_font_size: typeof cover_headline_font_size !== 'undefined' ? (Number(cover_headline_font_size) || null) : null,
      cover_headline_offset_x: typeof cover_headline_offset_x !== 'undefined' ? Number(cover_headline_offset_x) : null,
      cover_headline_offset_y: typeof cover_headline_offset_y !== 'undefined' ? Number(cover_headline_offset_y) : null,
      cover_headline_z_index: typeof cover_headline_z_index !== 'undefined' ? Number(cover_headline_z_index) : null,
      cover_headline_wrap: typeof cover_headline_wrap !== 'undefined' ? !!cover_headline_wrap : null,
      cover_headline_force_two_lines: typeof cover_headline_force_two_lines !== 'undefined' ? !!cover_headline_force_two_lines : null,
      show_cost_price: show_cost_price ?? null,
      show_sale_price: show_sale_price ?? null,
      price_unlock_mode:
        price_unlock_mode === 'modal' || price_unlock_mode === 'fab'
          ? price_unlock_mode
          : 'none',
      show_installments: show_installments ?? null,
      max_installments: max_installments ? Number(max_installments) : null,
      cash_price_discount_percent: cash_price_discount_percent ?? null,
      enable_stock_management:
        typeof enable_stock_management === 'boolean'
          ? enable_stock_management
          : !!manage_stock,
      // same as settings above: do not force null overwrite; final value assigned below if provided
      // grid_cols removed from public_catalogs payload
      show_top_benefit_bar: !!show_top_benefit_bar,
      show_top_info_bar: !!show_top_info_bar,
      top_benefit_text: top_benefit_text || null,
      top_benefit_mode:
        top_benefit_mode === 'marquee' ? 'marquee' : 'static',
      top_benefit_speed:
        top_benefit_speed === 'slow'
          ? 'slow'
          : top_benefit_speed === 'fast'
            ? 'fast'
            : 'medium',
      top_benefit_animation:
        top_benefit_animation === 'scroll_right'
          ? 'scroll_right'
          : top_benefit_animation === 'alternate'
            ? 'alternate'
            : 'scroll_left',
      top_benefit_bg_color: top_benefit_bg_color || null,
      top_benefit_text_color: top_benefit_text_color || null,
      top_benefit_height: top_benefit_height
        ? Number(top_benefit_height)
        : null,
      top_benefit_text_size: top_benefit_text_size
        ? Number(top_benefit_text_size)
        : null,
      top_benefit_image_url: top_benefit_image_url || null,
      top_benefit_image_fit: top_benefit_image_fit ?? 'cover',
      top_benefit_image_scale: top_benefit_image_scale
        ? Number(top_benefit_image_scale)
        : null,
      top_benefit_image_align: top_benefit_image_align || null,
      top_benefit_text_align: top_benefit_text_align || null,
      is_active: typeof is_active === 'boolean' ? is_active : true,
      updated_at: new Date().toISOString(),
    };

    if (isTabScopedSave) {
      const alwaysKeepPublic = new Set([
        'user_id',
        'updated_at',
        'catalog_slug',
        'store_name',
      ]);
      for (const key of Object.keys(publicCatalogPayload)) {
        if (alwaysKeepPublic.has(key)) continue;
        if (!hasOwnPayloadKey(key)) {
          delete publicCatalogPayload[key];
        }
      }
    }

    // Set public catalog password hash only if provided explicitly
    if (typeof finalPricePasswordHash !== 'undefined') {
      publicCatalogPayload.price_password_hash = finalPricePasswordHash;
    }

    // If no slug provided, try to discover existing slug for this user
    let finalSlugToUse = publicCatalogPayload.catalog_slug;
    if (!finalSlugToUse) {
      try {
        // First try to read `settings.catalog_slug` for this user using the
        // current Supabase client (works in dev without service-role env).
        try {
          const { data: sRow } = await supabase
            .from('settings')
            .select('catalog_slug')
            .eq('user_id', userId)
            .maybeSingle();
          if (sRow && sRow.catalog_slug) finalSlugToUse = sRow.catalog_slug;
        } catch (e) {
          // ignore errors here and fall back to service-role lookup below
        }

      } catch (e) {
        // ignore settings lookup errors and continue with service-role lookup
      }

      try {
        const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
          const svc = createSvcClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          const { data: existing } = await svc
            .from('public_catalogs')
            .select('catalog_slug')
            .eq('user_id', userId)
            .maybeSingle();
          if (existing && existing.catalog_slug)
            finalSlugToUse = existing.catalog_slug;
        }
      } catch (e) {
        console.warn('/api/settings/save: failed to lookup slug by user_id', e);
      }
    }

    if (!finalSlugToUse) {
      if (isTabScopedSave) {
        // Save parcial por aba: não força geração de slug para evitar trabalho extra.
        // Quando o slug existir (ou for enviado pela aba Geral), o sync público ocorrerá.
        return NextResponse.json({ success: true, partial: true, skippedPublicCatalogSync: true });
      }

      // If still no slug, try to derive one from name or userId so public_catalogs can be created
      const makeSlug = (s: any) => {
        if (!s) return null;
        try {
          const raw = String(s)
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
          const truncated = raw.slice(0, 50);
          if (/^[a-z0-9-]{3,50}$/.test(truncated)) return truncated;
          if (truncated.length >= 3) return truncated;
          return null;
        } catch (e) {
          return null;
        }
      };

      const candidateFromName = makeSlug(
        name || payload.name || payload.store_name || payload.catalog_title
      );
      if (candidateFromName) finalSlugToUse = candidateFromName;
      else {
        // fallback to user id derived slug
        const uidPart = String(userId)
          .slice(0, 8)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
        finalSlugToUse = `u-${uidPart}`;
      }

      console.log('[settings/save] Gerando slug fallback:', finalSlugToUse);
    }

    if (finalSlugToUse) {
      // Ensure slug is set on payload
      // keep public_catalogs using catalog_slug; don't set a separate `slug` field

      // Also persist the catalog_slug into `settings` table so both tables stay in sync
      try {
        const { error: settingsSlugError } = await supabase
          .from('settings')
          .update({
            catalog_slug: finalSlugToUse,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);
        if (settingsSlugError) {
          console.warn(
            '[settings/save] failed to update settings.catalog_slug',
            settingsSlugError
          );
        } else {
          console.log(
            '[settings/save] updated settings.catalog_slug for user',
            userId
          );
        }
      } catch (e) {
        console.warn(
          '[settings/save] exception updating settings.catalog_slug',
          e
        );
      }

      // Persist slug on profiles.id as well so resolveContext can find representatives
      try {
        const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
          try {
            const svc = createSvcClient(String(SUPABASE_URL), String(SUPABASE_SERVICE_ROLE_KEY));
            const { error: svcErr } = await svc
              .from('profiles')
              .update({ slug: finalSlugToUse, updated_at: new Date().toISOString() })
              .eq('id', userId);
            if (svcErr) console.warn('[settings/save] svc failed to update profiles.slug', svcErr);
            else console.log('[settings/save] updated profiles.slug for user via service role', userId);
          } catch (e) {
            console.warn('[settings/save] exception when updating profiles.slug via svc', e);
          }
        } else {
          const { error: profileSlugError } = await supabase
            .from('profiles')
            .update({ slug: finalSlugToUse, updated_at: new Date().toISOString() })
            .eq('id', userId);
          if (profileSlugError) {
            console.warn('[settings/save] failed to update profiles.slug', profileSlugError);
          } else {
            console.log('[settings/save] updated profiles.slug for user', userId);
          }
        }
      } catch (e) {
        console.warn('[settings/save] exception updating profiles.slug', e);
      }

      // Remove user_id/updated_at from payload when upserting by user_id conflict
      const { user_id, updated_at, ...upsertBody } = publicCatalogPayload;

      // Upsert into public_catalogs using service role (server-to-server)
      try {
        const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
        console.log(
          '[settings/save] Tentando upsert direto em public_catalogs para slug',
          finalSlugToUse
        );
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
          console.warn(
            '[settings/save] Service role ausente; não foi possível atualizar public_catalogs diretamente'
          );
          } else {
          const svc = createSvcClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

          // helper: validate slug ownership (catalog_slug column)
          const ensureSlugOwnership = async (desired: string) => {
            const { data: conflict } = await svc
              .from('public_catalogs')
              .select('user_id')
              .eq('catalog_slug', desired)
              .maybeSingle();
            if (!conflict) return true; // slug free
            if (conflict.user_id === userId) return true; // slug belongs to same user
            return false; // slug in use by another user
          };

          // Decide which user_id should own the public_catalogs row.
          // When editing a representative (context === 'representative') who is linked
          // to a company, prefer the company owner (admin_company/master/admin) so
          // all reps share the distributor's public catalog (logo/colors).
          let publicCatalogUserId = userId;
          try {
            if (context !== 'company') {
              const { data: repProfile } = await svc.from('profiles').select('company_id').eq('id', userId).maybeSingle();
              const companyIdForRep = repProfile?.company_id || null;
              if (companyIdForRep) {
                const { data: owners } = await svc
                  .from('profiles')
                  .select('id,role')
                  .eq('company_id', companyIdForRep)
                  .in('role', ['admin_company', 'master', 'admin'])
                  .limit(5);
                if (Array.isArray(owners) && owners.length > 0) {
                  const preferred = owners.find((p: any) => p.role === 'admin_company') || owners[0];
                  if (preferred?.id) publicCatalogUserId = String(preferred.id);
                }
              }
            }
          } catch (e) {
            // non-fatal: keep publicCatalogUserId = userId
            publicCatalogUserId = userId;
          }

          // Decide insert vs update based on existing row for the resolved publicCatalogUserId
          const { data: existingRow } = await svc
            .from('public_catalogs')
            .select('id, catalog_slug')
            .eq('user_id', publicCatalogUserId)
            .maybeSingle();

          // Validate slug: if in use by another user, abort with 409
          const slugOk = await ensureSlugOwnership(finalSlugToUse);
          if (!slugOk) {
            console.error(
              '[settings/save] slug em uso por outro usuário:',
              finalSlugToUse
            );
            return NextResponse.json(
              { error: 'Slug já em uso por outra loja' },
              { status: 409 }
            );
          }
          publicCatalogPayload.catalog_slug = finalSlugToUse;
          upsertBody.catalog_slug = finalSlugToUse;

          let publicCatalogUpsertResult: any = null;
          if (existingRow) {
            // update existing by user_id (resolved owner)
            const { data: updated, error: updateErr } = await svc
              .from('public_catalogs')
              .update(upsertBody)
              .eq('user_id', publicCatalogUserId)
              .select('id, catalog_slug')
              .maybeSingle();
            if (updateErr) {
              console.error('[settings/save] public_catalogs update failed', updateErr);
            } else {
              publicCatalogUpsertResult = updated ?? null;
              console.log('[settings/save] public_catalogs update concluído', updated);
            }
          } else {
            // insert new row
            const { data: inserted, error: insertErr } = await svc
              .from('public_catalogs')
              .insert({ user_id: publicCatalogUserId, ...upsertBody })
              .select('id, catalog_slug')
              .maybeSingle();
            if (insertErr) {
              console.error('[settings/save] public_catalogs insert failed', insertErr);
              const ierr = (insertErr?.message || '').toString();
              if (/slug/i.test(ierr) || (insertErr?.code || '').toString().includes('23505')) {
                return NextResponse.json({ error: 'Slug já em uso por outra loja' }, { status: 409 });
              }
            } else {
              publicCatalogUpsertResult = inserted ?? null;
              console.log('[settings/save] public_catalogs insert concluído', inserted);
            }
          }
          // attach result for later response
          (publicCatalogPayload as any)._lastUpsert = publicCatalogUpsertResult;
        }
      } catch (e: any) {
        console.error(
          'settings/save: upsert direto em public_catalogs falhou',
          e
        );
        return NextResponse.json(
          { error: e?.message || String(e) },
          { status: 500 }
        );
      }

      // Best-effort: when company admin saves settings, mirror the adjusted
      // fields into `companies` so institutional and representative catalogs
      // stay in sync with the distributor source of truth.
      try {
        const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const shouldMirrorToCompanies = context === 'company' && !!actorCompanyIdResolved;
        if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && shouldMirrorToCompanies) {
            const svc = createSvcClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

          const companyUpdate: Record<string, any> = {};
          if (hasOwnPayloadKey('name')) companyUpdate.name = name || null;
          if (hasOwnPayloadKey('phone')) companyUpdate.phone = phone || null;
          if (hasOwnPayloadKey('email')) companyUpdate.email = email || null;

          if (hasOwnPayloadKey('primary_color')) companyUpdate.primary_color = primary_color || null;
          if (hasOwnPayloadKey('secondary_color')) companyUpdate.secondary_color = secondary_color || null;
          if (hasOwnPayloadKey('header_background_color')) companyUpdate.header_background_color = header_background_color || null;
          if (hasOwnPayloadKey('header_text_color')) companyUpdate.header_text_color = header_text_color || null;
          if (hasOwnPayloadKey('header_icon_bg_color')) companyUpdate.header_icon_bg_color = header_icon_bg_color || null;
          if (hasOwnPayloadKey('header_icon_color')) companyUpdate.header_icon_color = header_icon_color || null;
          if (hasOwnPayloadKey('footer_background_color')) companyUpdate.footer_background_color = footer_background_color || null;
          if (hasOwnPayloadKey('footer_text_color')) companyUpdate.footer_text_color = footer_text_color || null;
          if (hasOwnPayloadKey('footer_message')) companyUpdate.footer_message = footer_message || null;

          if (hasOwnPayloadKey('logo_url')) companyUpdate.logo_url = logo_url || null;
          if (hasOwnPayloadKey('cover_image')) companyUpdate.cover_image = cover_image || null;
          if (hasOwnPayloadKey('cover_image_fit')) companyUpdate.cover_image_fit = cover_image_fit || null;
          if (hasOwnPayloadKey('cover_image_height')) companyUpdate.cover_image_height = cover_image_height ? Number(cover_image_height) : null;
          if (hasOwnPayloadKey('cover_image_position')) companyUpdate.cover_image_position = cover_image_position || null;
          if (hasOwnPayloadKey('cover_image_offset_x')) companyUpdate.cover_image_offset_x = typeof cover_image_offset_x !== 'undefined' ? Number(cover_image_offset_x) : null;
          if (hasOwnPayloadKey('cover_image_offset_y')) companyUpdate.cover_image_offset_y = typeof cover_image_offset_y !== 'undefined' ? Number(cover_image_offset_y) : null;
          if (hasOwnPayloadKey('og_image_url')) companyUpdate.og_image_url = og_image_url || null;
          if (hasOwnPayloadKey('share_banner_url')) companyUpdate.share_banner_url = share_banner_url || null;
          if (hasOwnPayloadKey('gallery_urls')) companyUpdate.gallery_urls = Array.isArray(gallery_urls) ? gallery_urls : null;
          if (hasOwnPayloadKey('gallery_title')) companyUpdate.gallery_title = gallery_title || null;
          if (hasOwnPayloadKey('gallery_subtitle')) companyUpdate.gallery_subtitle = gallery_subtitle || null;
          if (hasOwnPayloadKey('gallery_title_color')) companyUpdate.gallery_title_color = gallery_title_color || null;
          if (hasOwnPayloadKey('gallery_subtitle_color')) companyUpdate.gallery_subtitle_color = gallery_subtitle_color || null;

          if (hasOwnPayloadKey('show_headline_overlay')) companyUpdate.show_headline_overlay = !!show_headline_overlay;
          if (hasOwnPayloadKey('cover_headline_position')) companyUpdate.cover_headline_position = cover_headline_position || null;
          if (hasOwnPayloadKey('headline_text_color')) companyUpdate.headline_text_color = headline_text_color || null;
          if (hasOwnPayloadKey('cover_headline_font_size')) companyUpdate.cover_headline_font_size = typeof cover_headline_font_size !== 'undefined' ? Number(cover_headline_font_size) : null;
          if (hasOwnPayloadKey('cover_headline_offset_x')) companyUpdate.cover_headline_offset_x = typeof cover_headline_offset_x !== 'undefined' ? Number(cover_headline_offset_x) : null;
          if (hasOwnPayloadKey('cover_headline_offset_y')) companyUpdate.cover_headline_offset_y = typeof cover_headline_offset_y !== 'undefined' ? Number(cover_headline_offset_y) : null;
          if (hasOwnPayloadKey('cover_headline_z_index')) companyUpdate.cover_headline_z_index = typeof cover_headline_z_index !== 'undefined' ? Number(cover_headline_z_index) : null;
          if (hasOwnPayloadKey('cover_headline_wrap')) companyUpdate.cover_headline_wrap = typeof cover_headline_wrap !== 'undefined' ? !!cover_headline_wrap : null;
          if (hasOwnPayloadKey('cover_headline_force_two_lines')) companyUpdate.cover_headline_force_two_lines = typeof cover_headline_force_two_lines !== 'undefined' ? !!cover_headline_force_two_lines : null;

          if (hasOwnPayloadKey('headline')) companyUpdate.headline = headline || null;
          if (hasOwnPayloadKey('welcome_text')) companyUpdate.welcome_text = welcome_text || null;
          if (hasOwnPayloadKey('about_text')) companyUpdate.about_text = about_text || null;

          if (hasOwnPayloadKey('banners')) companyUpdate.banners = Array.isArray(banners) ? banners : null;
          if (hasOwnPayloadKey('banners_mobile')) companyUpdate.banners_mobile = Array.isArray(banners_mobile) ? banners_mobile : null;
          if (hasOwnPayloadKey('store_banner_meta')) companyUpdate.store_banner_meta = store_banner_meta || null;

          // PDF do catálogo e flags relacionadas
          if (hasOwnPayloadKey('catalog_pdf_url')) companyUpdate.catalog_pdf_url = catalog_pdf_url || null;
          if (hasOwnPayloadKey('show_pdf_catalog')) companyUpdate.show_pdf_catalog = !!(payload as any).show_pdf_catalog;
          if (hasOwnPayloadKey('show_pdf_link')) companyUpdate.show_pdf_link = !!(payload as any).show_pdf_link;

          if (hasOwnPayloadKey('show_top_benefit_bar')) companyUpdate.show_top_benefit_bar = !!show_top_benefit_bar;
          if (hasOwnPayloadKey('show_top_info_bar')) companyUpdate.show_top_info_bar = !!show_top_info_bar;
          if (hasOwnPayloadKey('top_benefit_text')) companyUpdate.top_benefit_text = top_benefit_text || null;
          if (hasOwnPayloadKey('top_benefit_mode')) companyUpdate.top_benefit_mode = top_benefit_mode === 'marquee' ? 'marquee' : 'static';
          if (hasOwnPayloadKey('top_benefit_speed')) {
            companyUpdate.top_benefit_speed =
              top_benefit_speed === 'slow'
                ? 'slow'
                : top_benefit_speed === 'fast'
                  ? 'fast'
                  : 'medium';
          }
          if (hasOwnPayloadKey('top_benefit_animation')) {
            companyUpdate.top_benefit_animation =
              top_benefit_animation === 'scroll_right'
                ? 'scroll_right'
                : top_benefit_animation === 'alternate'
                  ? 'alternate'
                  : 'scroll_left';
          }
          if (hasOwnPayloadKey('top_benefit_bg_color')) companyUpdate.top_benefit_bg_color = top_benefit_bg_color || null;
          if (hasOwnPayloadKey('top_benefit_text_color')) companyUpdate.top_benefit_text_color = top_benefit_text_color || null;
          if (hasOwnPayloadKey('top_benefit_image_url')) companyUpdate.top_benefit_image_url = top_benefit_image_url || null;
          if (hasOwnPayloadKey('top_benefit_image_fit')) companyUpdate.top_benefit_image_fit = top_benefit_image_fit || null;
          if (hasOwnPayloadKey('top_benefit_image_scale')) companyUpdate.top_benefit_image_scale = top_benefit_image_scale ? Number(top_benefit_image_scale) : null;
          if (hasOwnPayloadKey('top_benefit_height')) companyUpdate.top_benefit_height = top_benefit_height ? Number(top_benefit_height) : null;
          if (hasOwnPayloadKey('top_benefit_text_size')) companyUpdate.top_benefit_text_size = top_benefit_text_size ? Number(top_benefit_text_size) : null;
          if (hasOwnPayloadKey('top_benefit_image_align')) companyUpdate.top_benefit_image_align = top_benefit_image_align || null;
          if (hasOwnPayloadKey('top_benefit_text_align')) companyUpdate.top_benefit_text_align = top_benefit_text_align || null;

          if (hasOwnPayloadKey('show_installments')) companyUpdate.show_installments = !!show_installments;
          if (hasOwnPayloadKey('max_installments')) companyUpdate.max_installments = max_installments ? Number(max_installments) : null;
          if (hasOwnPayloadKey('show_sale_price')) companyUpdate.show_sale_price = !!show_sale_price;
          if (hasOwnPayloadKey('show_cost_price')) companyUpdate.show_cost_price = !!show_cost_price;
          if (hasOwnPayloadKey('price_unlock_mode') && price_unlock_mode) companyUpdate.price_unlock_mode = price_unlock_mode;
          if (hasOwnPayloadKey('cash_price_discount_percent')) companyUpdate.cash_price_discount_percent = cash_price_discount_percent ? Number(cash_price_discount_percent) : null;
          if (hasOwnPayloadKey('enable_stock_management')) companyUpdate.enable_stock_management = !!enable_stock_management;
          if (hasOwnPayloadKey('manage_stock')) companyUpdate.enable_stock_management = !!manage_stock;
          if (hasOwnPayloadKey('global_allow_backorder')) companyUpdate.global_allow_backorder = !!global_allow_backorder;

          if (hasOwnPayloadKey('font_family')) companyUpdate.font_family = font_family || null;
          if (hasOwnPayloadKey('font_url')) companyUpdate.font_url = font_url || null;
          companyUpdate.updated_at = new Date().toISOString();

          const updateCompaniesDefensive = async (whereColumn: 'slug' | 'id', whereValue: string) => {
            const payloadForUpdate: Record<string, any> = { ...companyUpdate };
            for (let attempts = 0; attempts < 16; attempts++) {
              const { error } = await svc.from('companies').update(payloadForUpdate).eq(whereColumn, whereValue);
              if (!error) return;
              if (!isMissingColumnError(error)) throw error;
              const missing = extractMissingColumnName(error);
              if (!missing || !(missing in payloadForUpdate)) throw error;
              delete payloadForUpdate[missing];
              console.warn(`[settings/save] removed missing column from companies mirror payload: ${missing}`);
            }
          };

          let companiesMirrorResult: any = null;
          if (Object.keys(companyUpdate).length > 0) {
            // Atualiza por slug (página pública) e, se disponível, também atualiza
            // a linha da distribuidora pelo seu `id` (quando o ator é admin da distribuidora).
            await updateCompaniesDefensive('slug', finalSlugToUse);
            console.log('[settings/save] mirrored settings to companies for slug', finalSlugToUse, companyUpdate);
            companiesMirrorResult = { bySlug: true };

            if (actorCompanyIdResolved) {
              try {
                await updateCompaniesDefensive('id', actorCompanyIdResolved);
                console.log('[settings/save] mirrored settings to companies by company id', actorCompanyIdResolved, companyUpdate);
                companiesMirrorResult.byCompanyId = true;
              } catch (e) {
                console.warn('[settings/save] mirror to companies by id failed (non-fatal)', e);
                companiesMirrorResult.byCompanyId = false;
              }
            }
          }
          // attach to publicCatalogPayload for response
          (publicCatalogPayload as any)._companiesMirror = companiesMirrorResult;
        }
      } catch (e) {
        console.warn('[settings/save] mirror to companies failed (non-fatal)', e);
      }
    }

    // Return a richer response to help frontend confirm what actually persisted
    return NextResponse.json({
      success: true,
      settings: settingsUpsertResult || null,
      profile: profileUpsertData || null,
      public_catalog: (publicCatalogPayload as any)._lastUpsert || null,
      companies_mirror: (publicCatalogPayload as any)._companiesMirror || null,
    });
  } catch (err: any) {
    console.error('settings/save error', err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
