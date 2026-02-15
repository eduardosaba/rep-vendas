import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncPublicCatalog } from '@/lib/sync-public-catalog';
import { inngest } from '@/inngest/client';

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
      catalog_slug: slug || catalog_slug || payload.catalogSlug || null,
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

    // Enfileira processamento de imagens de branding via Inngest (se houver uma marca)
    try {
      const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const { createClient: createSvcClient } =
          await import('@supabase/supabase-js');
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
          const collectAssets = async () => {
            const out: Array<{ url: string; asset: 'logo' | 'banner' }> = [];
            if (logo_url) out.push({ url: logo_url, asset: 'logo' });
            if (share_banner_url)
              out.push({ url: share_banner_url, asset: 'banner' });
            if (top_benefit_image_url)
              out.push({ url: top_benefit_image_url, asset: 'banner' });
            // banners arrays
            try {
              if (Array.isArray(banners)) {
                for (const b of banners)
                  if (b) out.push({ url: b, asset: 'banner' });
              }
            } catch (e) {
              // ignore
            }
            try {
              if (Array.isArray(banners_mobile)) {
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
    let finalSlugToUse = publicCatalogPayload.catalog_slug;
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
            .select('catalog_slug')
            .eq('user_id', userId)
            .maybeSingle();
          if (existing && existing.catalog_slug) finalSlugToUse = existing.catalog_slug;
        }
      } catch (e) {
        console.warn('/api/settings/save: failed to lookup slug by user_id', e);
      }
    }

    if (!finalSlugToUse) {
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
          .update({ catalog_slug: finalSlugToUse, updated_at: new Date().toISOString() })
          .eq('user_id', userId);
        if (settingsSlugError) {
          console.warn('[settings/save] failed to update settings.catalog_slug', settingsSlugError);
        } else {
          console.log('[settings/save] updated settings.catalog_slug for user', userId);
        }
      } catch (e) {
        console.warn('[settings/save] exception updating settings.catalog_slug', e);
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
          const { createClient: createSvcClient } =
            await import('@supabase/supabase-js');
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

          // Decide insert vs update based on existing row for this user
          const { data: existingRow } = await svc
            .from('public_catalogs')
            .select('id, catalog_slug')
            .eq('user_id', userId)
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

          if (existingRow) {
            // update existing by user_id
            const { data: updated, error: updateErr } = await svc
              .from('public_catalogs')
              .update(upsertBody)
              .eq('user_id', userId)
              .select('id, catalog_slug');
            if (updateErr) {
              console.error(
                '[settings/save] public_catalogs update failed',
                updateErr
              );
            } else {
              console.log(
                '[settings/save] public_catalogs update concluído',
                updated
              );
            }
          } else {
            // insert new row
            const { data: inserted, error: insertErr } = await svc
              .from('public_catalogs')
              .insert({ user_id: userId, ...upsertBody })
              .select('id, catalog_slug');
            if (insertErr) {
              console.error(
                '[settings/save] public_catalogs insert failed',
                insertErr
              );
              // If insert failed due to slug conflict, return 409
              const ierr = (insertErr?.message || '').toString();
              if (
                /slug/i.test(ierr) ||
                (insertErr?.code || '').toString().includes('23505')
              ) {
                return NextResponse.json(
                  { error: 'Slug já em uso por outra loja' },
                  { status: 409 }
                );
              }
            } else {
              console.log(
                '[settings/save] public_catalogs insert concluído',
                inserted
              );
            }
          }
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
