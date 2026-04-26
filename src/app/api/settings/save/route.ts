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

    // Debug: payload received (removed verbose logging to avoid leaking PII)

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

    // NOTE: remova a lógica de espelhamento manual para `public_catalogs` e
    // mirror para `companies` — essa sincronização agora deve ser feita pelo
    // trigger/função no banco (sync_settings_to_catalogs) para garantir
    // atomicidade e evitar upserts duplicados. Mantemos apenas o upsert em
    // `settings` + `profiles` acima.

    // Return a concise response — public_catalogs synchronization is handled
    // by the DB trigger, so we don't perform upserts here.
    return NextResponse.json({
      success: true,
      settings: settingsUpsertResult || null,
      profile: profileUpsertData || null,
    });
  } catch (err: any) {
    console.error('settings/save error', err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
