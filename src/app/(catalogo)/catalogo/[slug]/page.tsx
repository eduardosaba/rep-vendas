import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CatalogRichLayout from '@/components/catalogo/CatalogRichLayout';
import CatalogStandardLayout from '@/components/catalogo/CatalogStandardLayout';
import { Storefront } from '@/components/catalogo/Storefront';
import { Metadata, ResolvingMetadata } from 'next';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { getPublicCatalog } from '@/lib/catalog';
import { headers } from 'next/headers';
import { normalizeCatalogSlug, resolvePublicCatalogContext, escapeIlikePattern } from '@/lib/resolve-context';
import { RepositoryFactory } from '@/infrastructure/supabase/RepositoryFactory';
import { ApplicationContextAssembler } from '@/modules/catalog/ApplicationContextAssembler';
import { ApplicationContextService } from '@/modules/catalog/ApplicationContextService';
export const revalidate = 0;
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// 1. GERADOR DE METADADOS (SEO) - Mantido igual, foco no branding
export async function generateMetadata(
  { params, searchParams }: Props,
  _parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;
  const normalizedCompanySlug = normalizeCatalogSlug(slug);
  const { productId } = await searchParams;
  const supabase = await createClient();

  // Usa service role para garantir acesso mesmo com RLS
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const admin = adminKey && supabaseUrl
    ? createSupabaseAdmin(String(supabaseUrl), String(adminKey), {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

  // Tenta buscar por catalog_slug em public_catalogs
  let { data: catalog } = await (admin || supabase)
    .from('public_catalogs')
    .select(
      'store_name, logo_url, single_brand_logo_url, footer_message, user_id, og_image_url, share_banner_url, updated_at'
    )
    .ilike('catalog_slug', escapeIlikePattern(normalizedCompanySlug))
    .eq('is_active', true)
    .maybeSingle();

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://repvendas.com.br';

  // Fallback 1: busca por profiles.slug → settings (caso catalog_slug não esteja populado)
  if (!catalog && admin) {
    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .ilike('slug', escapeIlikePattern(normalizedCompanySlug))
      .maybeSingle();

    if (profile?.id) {
      const { data: settings } = await admin
        .from('settings')
        .select('name, representative_name, logo_url, primary_color, footer_message, og_image_url, share_banner_url, updated_at')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (settings) {
        const storeName = settings.representative_name || settings.name || 'Catálogo Virtual';
        const logoUrl = settings.logo_url;
        const baseV = settings.updated_at ? new Date(settings.updated_at).getTime() : Date.now();
        const ogImageRaw = settings.share_banner_url || settings.og_image_url || logoUrl || `${APP_URL}/repvendas.png`;
        const ogImage = ogImageRaw ? `${ogImageRaw}?v=${baseV}` : ogImageRaw;
        return {
          title: `${storeName} | Catálogo Digital`,
          description: settings.footer_message || 'Confira nossos produtos e faça seu pedido online.',
          alternates: {
            canonical: `${APP_URL}/catalogo/${normalizedCompanySlug}`,
          },
          robots: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
          },
          openGraph: {
            title: storeName,
            description: settings.footer_message || undefined,
            url: `${APP_URL}/catalogo/${normalizedCompanySlug}`,
            siteName: 'RepVendas',
            images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : [],
            locale: 'pt_BR',
            type: 'website',
          },
        };
      }
    }
  }

  if (!catalog) {
    // Fallback 2: tenta empresa (distribuidora)
    if (admin) {
      const { data: company } = await admin
        .from('companies')
        .select('name, logo_url, welcome_text, updated_at')
        .ilike('slug', escapeIlikePattern(normalizedCompanySlug))
        .maybeSingle();

      if (company) {
        const fallbackImage = `${APP_URL}/repvendas.png`;
        const baseV = company?.updated_at ? new Date(company.updated_at).getTime() : Date.now();
        const companyOgImageRaw = company.logo_url || fallbackImage;
        const companyOgImage = companyOgImageRaw ? `${companyOgImageRaw}?v=${baseV}` : companyOgImageRaw;

        return {
          title: `${company.name} | Catálogo Digital`,
          description: company.welcome_text || 'Confira nossos produtos e faça seu pedido online.',
          alternates: {
            canonical: `${APP_URL}/catalogo/${normalizedCompanySlug}`,
          },
          robots: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
          },
          openGraph: {
            title: company.name,
            description: company.welcome_text || undefined,
            url: `${APP_URL}/catalogo/${normalizedCompanySlug}`,
            siteName: 'RepVendas',
            images: companyOgImage
              ? [{ url: companyOgImage, width: 1200, height: 630 }]
              : [],
            locale: 'pt_BR',
            type: 'website',
          },
        };
      }
    }

    return {
      title: 'Loja não encontrada',
      robots: { index: false, follow: false },
    };
  }

  if (productId && typeof productId === 'string') {
    const { data: product } = await supabase
      .from('products')
      .select('name, price, image_url, external_image_url, description')
      .eq('id', productId)
      .eq('user_id', catalog.user_id)
      .eq('is_active', true)
      .maybeSingle();

    if (product) {
      const priceFormatted = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(product.price);
      const baseV = catalog?.updated_at
        ? new Date(catalog.updated_at).getTime()
        : Date.now();
      const ogImage =
        product.image_url ||
        product.external_image_url ||
        catalog.share_banner_url ||
        catalog.og_image_url ||
        catalog.single_brand_logo_url ||
        catalog.logo_url ||
        `${APP_URL}/repvendas.png`;
      const ogImageUrl = ogImage ? `${ogImage}?v=${baseV}` : ogImage;
      return {
        title: `${product.name} | ${catalog.store_name}`,
        description: `Por apenas ${priceFormatted}. ${product.description || 'Confira os detalhes!'}`,
        alternates: {
          canonical: `${APP_URL}/catalogo/${normalizedCompanySlug}?productId=${productId}`,
        },
        robots: {
          index: true,
          follow: true,
          'max-image-preview': 'large',
        },
        openGraph: {
          title: `${product.name} - ${priceFormatted}`,
          description: product.description || 'Confira este produto incrível!',
          url: `${APP_URL}/catalogo/${normalizedCompanySlug}?productId=${productId}`,
          siteName: 'RepVendas',
          images: ogImageUrl
            ? [
                {
                  url: ogImageUrl,
                  width: 1200,
                  height: 630,
                },
              ]
            : [],
          locale: 'pt_BR',
          type: 'article',
        },
      };
    }
  }

  const fallbackImage = `${APP_URL}/repvendas.png`;
  const baseV = catalog?.updated_at
    ? new Date(catalog.updated_at).getTime()
    : Date.now();
  const homeOgImageRaw =
    catalog.share_banner_url ||
    catalog.og_image_url ||
    catalog.single_brand_logo_url ||
    catalog.logo_url ||
    fallbackImage;
  const homeOgImage = homeOgImageRaw
    ? `${homeOgImageRaw}?v=${baseV}`
    : homeOgImageRaw;

  return {
    title: `${catalog.store_name} | Catálogo Digital`,
    description:
      catalog.footer_message ||
      'Confira nossos produtos e faça seu pedido online.',
    alternates: {
      canonical: `${APP_URL}/catalogo/${normalizedCompanySlug}`,
    },
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
    openGraph: {
      title: catalog.store_name,
      description: catalog.footer_message || undefined,
      url: `${APP_URL}/catalogo/${normalizedCompanySlug}`,
      siteName: 'RepVendas',
      images: [
        {
          url: homeOgImage,
          width: 1200,
          height: 630,
        },
      ],
      locale: 'pt_BR',
      type: 'website',
    },
  };
}

// 2. PÁGINA DO CATÁLOGO
export default async function CatalogPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const { productId } = resolvedSearchParams;
  const normalizedCompanySlug = normalizeCatalogSlug(slug);
  const supabase = await createClient();

  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || undefined;

  const buildAdminClient = () => {
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!adminKey || !supabaseUrl) return null;
    return createSupabaseAdmin(String(supabaseUrl), String(adminKey), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  };

  const admin = buildAdminClient();
  const clientToUse = admin || supabase;

  // Prioriza slug de distribuidora para evitar colisão com slug de perfil/legado.
  // Se existir company com este slug, esta rota base sempre aponta para /empresa.
  const { data: companyBySlugFirst } = await clientToUse
    .from('companies')
    .select('slug,type')
    .ilike('slug', escapeIlikePattern(normalizedCompanySlug))
    .maybeSingle();

  if (companyBySlugFirst?.slug && String((companyBySlugFirst as any).type || '').toLowerCase() === 'distribuidora') {
    redirect(`/catalogo/${normalizedCompanySlug}/empresa`);
  }

  // Resolução do contexto do catálogo público com fallback de Service Role
  const { context } = await resolvePublicCatalogContext(
    normalizedCompanySlug,
    supabase as any,
    buildAdminClient,
    { userAgent, pathname: `/catalogo/${normalizedCompanySlug}` }
  );

  if (context?.type === 'individual') {
    let catalog = context.catalog || null;
    let settingsFallback = context.settings || null;

    if (!catalog) {
      // Quando resolveContext identifica profile por slug, tenta resolver public_catalog associado.
      const representativeId = context.representative?.id;
      if (representativeId) {
        const { data: catalogByUser } = await clientToUse
          .from('public_catalogs')
          .select('*, price_password_hash')
          .eq('user_id', representativeId)
          .maybeSingle();
        catalog = catalogByUser || null;

        if (representativeId) {
          const { data: settingsByUser } = await clientToUse
            .from('settings')
            .select('*')
            .eq('user_id', representativeId)
            .maybeSingle();
          settingsFallback = settingsByUser || settingsFallback;
        }
      }

      if (!catalog) {
        const { data: catalogBySlug } = await clientToUse
          .from('public_catalogs')
          .select('*, price_password_hash')
          .eq('catalog_slug', normalizedCompanySlug)
          .maybeSingle();
        catalog = catalogBySlug || null;

        if (catalog?.user_id) {
          const { data: settingsByCatalogUser } = await clientToUse
            .from('settings')
            .select('*')
            .eq('user_id', catalog.user_id)
            .maybeSingle();
          settingsFallback = settingsByCatalogUser || settingsFallback;
        }
      }
    }

    if (!catalog && (context.representative || settingsFallback)) {
      catalog = {
        id: context.representative?.id || settingsFallback?.user_id || 'default',
        user_id: context.representative?.id || settingsFallback?.user_id || 'default',
        store_name:
          settingsFallback?.name ||
          settingsFallback?.representative_name ||
          context.representative?.full_name ||
          'Catálogo Virtual',
        catalog_slug: normalizedCompanySlug,
        logo_url: settingsFallback?.logo_url || null,
        primary_color: settingsFallback?.primary_color || '#2563eb',
        secondary_color: settingsFallback?.secondary_color || '#0f172a',
        is_active: true,
        show_cost_price: settingsFallback?.show_cost_price ?? false,
        show_sale_price: settingsFallback?.show_sale_price ?? true,
        price_unlock_mode: settingsFallback?.price_unlock_mode || 'modal',
        price_password_hash: settingsFallback?.price_password_hash || null,
      };
    }

    if (catalog) {
      if (settingsFallback) {
        catalog = {
          ...catalog,
          // Branding principal: settings sobrescreve public_catalogs
          // logo_url: settings.logo_url → public_catalogs.single_brand_logo_url → public_catalogs.logo_url
          logo_url:
            settingsFallback.logo_url ??
            (catalog as any).single_brand_logo_url ??
            catalog.logo_url,
          // Nome da loja: representative_name → name → store_name original
          store_name:
            settingsFallback.representative_name ??
            settingsFallback.name ??
            catalog.store_name,
          // Cor primária: settings.primary_color → pc.secondary_color (legado) → pc.primary_color
          primary_color:
            settingsFallback.primary_color ??
            (catalog as any).secondary_color ??
            catalog.primary_color,
          secondary_color: settingsFallback.secondary_color ?? catalog.secondary_color,
          // Banners / conteúdo
          banners: settingsFallback.banners ?? catalog.banners,
          banners_mobile: settingsFallback.banners_mobile ?? catalog.banners_mobile,
          footer_message: settingsFallback.footer_message ?? catalog.footer_message,
          phone: settingsFallback.phone ?? catalog.phone,
          // Top benefit bar
          show_top_benefit_bar:
            settingsFallback.show_top_benefit_bar ?? catalog.show_top_benefit_bar,
          show_top_info_bar:
            settingsFallback.show_top_info_bar ?? catalog.show_top_info_bar,
          top_benefit_text:
            settingsFallback.top_benefit_text ?? catalog.top_benefit_text,
          top_benefit_mode:
            settingsFallback.top_benefit_mode ?? catalog.top_benefit_mode,
          top_benefit_speed:
            settingsFallback.top_benefit_speed ?? catalog.top_benefit_speed,
          top_benefit_animation:
            settingsFallback.top_benefit_animation ??
            catalog.top_benefit_animation,
          top_benefit_bg_color:
            settingsFallback.top_benefit_bg_color ??
            catalog.top_benefit_bg_color,
          top_benefit_text_color:
            settingsFallback.top_benefit_text_color ??
            catalog.top_benefit_text_color,
          top_benefit_height:
            settingsFallback.top_benefit_height ?? catalog.top_benefit_height,
          top_benefit_text_size:
            settingsFallback.top_benefit_text_size ??
            catalog.top_benefit_text_size,
          top_benefit_image_url:
            settingsFallback.top_benefit_image_url ??
            catalog.top_benefit_image_url,
          // Pricing / access (prefer settings when present so storefront reflects latest intent)
          show_cost_price: typeof settingsFallback.show_cost_price !== 'undefined' ? settingsFallback.show_cost_price : catalog.show_cost_price,
          show_sale_price: typeof settingsFallback.show_sale_price !== 'undefined' ? settingsFallback.show_sale_price : catalog.show_sale_price,
          price_unlock_mode: settingsFallback.price_unlock_mode ?? catalog.price_unlock_mode,
          price_password_hash: settingsFallback.price_password_hash ?? (catalog as any).price_password_hash,
        };
      }

      // Herança resiliente da Distribuidora:
      // Quando o catálogo pertence a um representante vinculado a uma distribuidora,
      // herda automaticamente a identidade visual oficial (logo, banners, cores, headline, sobre)
      const repCompanyId = context?.representative?.company_id || (context?.representative as any)?.organization_id || null;
      if (repCompanyId) {
        try {
          const { data: compBranding } = await clientToUse
            .from('companies')
            .select('name, logo_url, primary_color, secondary_color, banners, banners_mobile, headline, about_text, welcome_text, footer_message, font_family, show_top_benefit_bar, top_benefit_text, top_benefit_bg_color, top_benefit_text_color')
            .eq('id', repCompanyId)
            .maybeSingle();

          // Buscar settings dos administradores da distribuidora se companies não tiver logo ou banners
          const { data: compAdmins } = await clientToUse
            .from('profiles')
            .select('id')
            .eq('company_id', repCompanyId)
            .in('role', ['admin_company', 'master', 'admin'])
            .limit(5);

          const adminIds = (compAdmins || []).map((a: any) => a.id).filter(Boolean);
          let distAdminSettings: any = null;
          if (adminIds.length > 0) {
            const { data: dSet } = await clientToUse
              .from('settings')
              .select('*')
              .in('user_id', adminIds)
              .not('logo_url', 'is', null)
              .limit(1)
              .maybeSingle();
            distAdminSettings = dSet;
          }

          if (compBranding || distAdminSettings) {
            const effLogo = compBranding?.logo_url || distAdminSettings?.logo_url;
            if (effLogo) catalog.logo_url = effLogo;

            const effName = compBranding?.name || distAdminSettings?.name;
            if (effName) catalog.store_name = effName;

            const effPrimary = compBranding?.primary_color || distAdminSettings?.primary_color;
            if (effPrimary) catalog.primary_color = effPrimary;

            const effSecondary = compBranding?.secondary_color || distAdminSettings?.secondary_color;
            if (effSecondary) catalog.secondary_color = effSecondary;

            const banners = (compBranding?.banners && compBranding.banners.length > 0)
              ? compBranding.banners
              : distAdminSettings?.banners;
            if (Array.isArray(banners) && banners.length > 0) {
              catalog.banners = banners;
            }

            const bannersMobile = (compBranding?.banners_mobile && compBranding.banners_mobile.length > 0)
              ? compBranding.banners_mobile
              : distAdminSettings?.banners_mobile;
            if (Array.isArray(bannersMobile) && bannersMobile.length > 0) {
              catalog.banners_mobile = bannersMobile;
            }

            catalog.headline = compBranding?.headline || distAdminSettings?.headline || catalog.headline;
            catalog.about_text = compBranding?.about_text || compBranding?.welcome_text || distAdminSettings?.about_text || distAdminSettings?.welcome_text || catalog.about_text;
            catalog.footer_message = compBranding?.footer_message || distAdminSettings?.footer_message || catalog.footer_message;
            catalog.font_family = compBranding?.font_family || distAdminSettings?.font_family || catalog.font_family;

            const showTop = compBranding?.show_top_benefit_bar ?? distAdminSettings?.show_top_benefit_bar;
            if (typeof showTop === 'boolean') {
              catalog.show_top_benefit_bar = showTop;
              catalog.top_benefit_text = compBranding?.top_benefit_text || distAdminSettings?.top_benefit_text || catalog.top_benefit_text;
              catalog.top_benefit_bg_color = compBranding?.top_benefit_bg_color || distAdminSettings?.top_benefit_bg_color || catalog.top_benefit_bg_color;
              catalog.top_benefit_text_color = compBranding?.top_benefit_text_color || distAdminSettings?.top_benefit_text_color || catalog.top_benefit_text_color;
            }
          }
        } catch (e) {
          console.warn('Erro ao herdar branding da distribuidora:', e);
        }
      }

      // Garante que logo_url sempre tem fallback para single_brand_logo_url
      // (campo real de logo em public_catalogs, mesmo sem settingsFallback)
      if (!catalog.logo_url && (catalog as any).single_brand_logo_url) {
        catalog = { ...catalog, logo_url: (catalog as any).single_brand_logo_url };
      }

      // Se a loja estiver desativada, redirecionar para página de manutenção.
      if (!catalog.is_active) {
        const { redirect } = await import('next/navigation');
        redirect(`/catalogo/${normalizedCompanySlug}/maintenance`);
      }

      let maxLimit = 5000;
      try {
        const { data: sub } = await clientToUse
          .from('subscriptions')
          .select('plan_id, plan_name')
          .eq('user_id', catalog.user_id)
          .maybeSingle();

        if (sub?.plan_id) {
          const { data: plan } = await clientToUse
            .from('plans')
            .select('product_limit, max_products')
            .eq('id', sub.plan_id)
            .maybeSingle();

          if (plan) {
            maxLimit = plan.product_limit || plan.max_products || maxLimit;
          }
        } else if (sub?.plan_name) {
          const { data: plan } = await clientToUse
            .from('plans')
            .select('product_limit, max_products')
            .eq('name', sub.plan_name)
            .maybeSingle();

          if (plan) {
            maxLimit = plan.product_limit || plan.max_products || maxLimit;
          }
        }
      } catch (e) {
        console.error('Erro ao recuperar limite do plano do catálogo:', e);
      }

      const fetchLimit = Number(maxLimit) || 5000;

      const representativeId = context?.representative?.id || null;
      const representativeCompanyId = context?.representative?.company_id || null;
      const ownerUserId = representativeId || catalog.user_id;

      let productsQuery = clientToUse
        .from('products')
        .select('*, linked_images, product_images(url, is_primary)')
        .not('is_active', 'eq', false)
        .order('created_at', { ascending: false })
        .range(0, fetchLimit - 1);

      if (representativeCompanyId) {
        // Representante vinculado: mostrar catálogo da distribuidora (company_id / organization_id)
        // e todos os produtos criados pelos administradores da distribuidora, sem perder produtos próprios.
        const { data: compAdminUsers } = await clientToUse
          .from('profiles')
          .select('id')
          .eq('company_id', representativeCompanyId)
          .in('role', ['admin_company', 'master', 'admin'])
          .limit(10);

        const adminUserIds = (compAdminUsers || []).map((u: any) => u.id).filter(Boolean);
        const allAssociatedUserIds = Array.from(new Set([ownerUserId, ...adminUserIds]));
        const userOrClauses = allAssociatedUserIds.map((id) => `user_id.eq.${id}`).join(',');

        productsQuery = productsQuery.or(
          `${userOrClauses},company_id.eq.${representativeCompanyId},organization_id.eq.${representativeCompanyId}`
        );
      } else {
        // Representante individual / catálogo público: buscar por user_id, company_id ou organization_id
        const ids = Array.from(new Set([ownerUserId, catalog.user_id, (catalog as any).company_id, (catalog as any).organization_id].filter(Boolean)));
        const orClause = ids.map(id => `user_id.eq.${id},company_id.eq.${id},organization_id.eq.${id}`).join(',');
        productsQuery = productsQuery.or(orClause);
      }

      const { data: products } = await productsQuery;

      const counts = new Map<string, number>();
      products?.forEach((p: any) => {
        const key = p.reference_id || p.reference_code || p.id;
        const current = counts.get(key) || 0;
        counts.set(key, current + 1);
      });

      const productsWithImages = products?.map((p: any) => {
        const gallery = p.product_images || [];
        const primary = gallery.find((i: any) => i.is_primary);
        const displayUrl = primary ? primary.url : gallery[0]?.url;
        const variantCount = counts.get(p.reference_id || p.reference_code || p.id) || 1;

        if (displayUrl) {
          return { ...p, image_url: displayUrl, variant_count: variantCount };
        }
        return { ...p, variant_count: variantCount };
      });

      // Ensure settings explicitly override public_catalogs store_name/logo/colors
      const finalCatalog = {
        ...catalog,
        store_name: representativeCompanyId
          ? (catalog.store_name || (settingsFallback?.name as any) || 'Catálogo Virtual')
          : ((settingsFallback?.name as any) || (settingsFallback?.representative_name as any) || (catalog as any).store_name),
        // Propagate contact and branding from settings when present
        email: (settingsFallback?.email as any) || (catalog as any).email || null,
        phone: (settingsFallback?.phone as any) || (catalog as any).phone || null,
        logo_url: representativeCompanyId
          ? (catalog.logo_url || (settingsFallback?.logo_url as any) || (catalog as any).single_brand_logo_url)
          : ((settingsFallback?.logo_url as any) || (catalog as any).single_brand_logo_url || (catalog as any).logo_url),
        primary_color: representativeCompanyId
          ? (catalog.primary_color || (settingsFallback?.primary_color as any))
          : ((settingsFallback?.primary_color as any) || (catalog as any).primary_color),
        secondary_color: representativeCompanyId
          ? (catalog.secondary_color || (settingsFallback?.secondary_color as any))
          : ((settingsFallback?.secondary_color as any) || (catalog as any).secondary_color),
        representative_name:
          context?.representative?.full_name ||
          (settingsFallback?.representative_name as any) ||
          (catalog as any).representative_name ||
          null,
      };

      try {
        if (normalizedCompanySlug === 'itelson') {
          console.log('[catalog/page][itelson] finalCatalog=', JSON.stringify(finalCatalog));
          console.log('[catalog/page][itelson] settingsFallback=', JSON.stringify(settingsFallback));
          console.log('[catalog/page][itelson] catalog(before merge)=', JSON.stringify(catalog));
        } else {
          console.log(`[catalog/page] slug=${normalizedCompanySlug} finalStoreName=${finalCatalog.store_name} hasSettings=${!!settingsFallback}`);
        }
      } catch (e) {
        /* ignore logging errors */
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://repvendas.com.br';
      const catalogJsonLd = [
        {
          '@context': 'https://schema.org',
          '@type': 'Store',
          name: finalCatalog.store_name,
          url: `${appUrl}/catalogo/${normalizedCompanySlug}`,
          image: finalCatalog.logo_url || undefined,
          description: finalCatalog.footer_message || finalCatalog.headline || finalCatalog.about_text || 'Catálogo Digital B2B',
          telephone: finalCatalog.phone || undefined,
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Início',
              item: appUrl,
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: finalCatalog.store_name,
              item: `${appUrl}/catalogo/${normalizedCompanySlug}`,
            },
          ],
        },
        ...(productsWithImages && productsWithImages.length > 0
          ? [
              {
                '@context': 'https://schema.org',
                '@type': 'ItemList',
                name: `Produtos - ${finalCatalog.store_name}`,
                numberOfItems: productsWithImages.length,
                itemListElement: productsWithImages.slice(0, 30).map((prod: any, idx: number) => ({
                  '@type': 'ListItem',
                  position: idx + 1,
                  item: {
                    '@type': 'Product',
                    name: prod.name,
                    url: `${appUrl}/catalogo/${normalizedCompanySlug}/product/${prod.id}`,
                    image: prod.image_url || undefined,
                    description: prod.description || undefined,
                    offers: {
                      '@type': 'Offer',
                      price: typeof prod.price === 'number' ? prod.price : 0,
                      priceCurrency: 'BRL',
                      availability: 'https://schema.org/InStock',
                    },
                  },
                })),
              },
            ]
          : []),
      ];

      return (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(catalogJsonLd) }}
          />
          <Storefront
            catalog={finalCatalog}
            initialProducts={productsWithImages || []}
            startProductId={typeof productId === 'string' ? productId : undefined}
          />
        </>
      );
    }
  }

  // 2) DUAL RESOLVER: FALLBACK PARA DISTRIBUIDORA NA NOVA ARQUITETURA (FASE 1.5)
  const orgRepo = RepositoryFactory.organization(supabase as any);
  const profileRepo = RepositoryFactory.profile(supabase as any);
  const brandingRepo = RepositoryFactory.branding(supabase as any);

  const assembler = new ApplicationContextAssembler(orgRepo, profileRepo, brandingRepo);
  const contextService = new ApplicationContextService(assembler);
  
  const repSlug = resolvedSearchParams.rep ? String(resolvedSearchParams.rep) : undefined;
  const appContext = await contextService.resolve(normalizedCompanySlug, repSlug);

  if (appContext?.organization) {
    const orgId = appContext.organization.id;

    // Buscar dados complementares da distribuidora (companies / public_catalogs)
    const { data: companyData } = await clientToUse
      .from('companies')
      .select('*')
      .or(`id.eq.${orgId},slug.eq.${normalizedCompanySlug}`)
      .maybeSingle();

    const { data: publicCatalog } = await clientToUse
      .from('public_catalogs')
      .select('*')
      .or(`catalog_slug.eq.${normalizedCompanySlug}`)
      .maybeSingle();

    // Buscar produtos do catálogo Master sob organization_id, company_id ou user_id
    const { data: orgProducts } = await clientToUse
      .from('products')
      .select('*, linked_images, product_images(url, is_primary)')
      .not('is_active', 'eq', false)
      .or(`organization_id.eq.${orgId},company_id.eq.${orgId},user_id.eq.${orgId}`)
      .order('created_at', { ascending: false });

    const companyEffective = {
      id: orgId,
      name: appContext.organization.name,
      slug: normalizedCompanySlug,
      logo_url: appContext.branding?.logoUrl || publicCatalog?.logo_url || companyData?.logo_url,
      primary_color: appContext.branding?.primaryColor || publicCatalog?.primary_color || companyData?.primary_color || '#2563eb',
      cover_image: companyData?.cover_image || publicCatalog?.share_banner_url,
      welcome_text: companyData?.welcome_text || publicCatalog?.footer_message || 'Bem-vindo ao Nosso Portal B2B Master',
      about_text: companyData?.about_text,
      show_cost_price: publicCatalog?.show_cost_price ?? companyData?.show_cost_price ?? false,
      show_sale_price: publicCatalog?.show_sale_price ?? companyData?.show_sale_price ?? true,
      price_unlock_mode: publicCatalog?.price_unlock_mode || companyData?.price_unlock_mode || 'modal',
      price_password_hash: publicCatalog?.price_password_hash || companyData?.price_password_hash || null,
      ...companyData,
      ...publicCatalog,
    };

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://repvendas.com.br';
    const richCatalogJsonLd = [
      {
        '@context': 'https://schema.org',
        '@type': 'Store',
        name: companyEffective.name,
        url: `${appUrl}/catalogo/${normalizedCompanySlug}`,
        image: companyEffective.logo_url || undefined,
        description: companyEffective.welcome_text || companyEffective.about_text || 'Catálogo Digital B2B Master',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Início',
            item: appUrl,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: companyEffective.name,
            item: `${appUrl}/catalogo/${normalizedCompanySlug}`,
          },
        ],
      },
      ...(orgProducts && orgProducts.length > 0
        ? [
            {
              '@context': 'https://schema.org',
              '@type': 'ItemList',
              name: `Produtos - ${companyEffective.name}`,
              numberOfItems: orgProducts.length,
              itemListElement: orgProducts.slice(0, 30).map((prod: any, idx: number) => ({
                '@type': 'ListItem',
                position: idx + 1,
                item: {
                  '@type': 'Product',
                  name: prod.name,
                  url: `${appUrl}/catalogo/${normalizedCompanySlug}/product/${prod.id}`,
                  image: prod.image_url || undefined,
                  description: prod.description || undefined,
                  offers: {
                    '@type': 'Offer',
                    price: typeof prod.price === 'number' ? prod.price : 0,
                    priceCurrency: 'BRL',
                    availability: 'https://schema.org/InStock',
                  },
                },
              })),
            },
          ]
        : []),
    ];

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(richCatalogJsonLd) }}
        />
        <CatalogRichLayout
          company={companyEffective}
          representative={appContext.representative}
          products={orgProducts || []}
        />
      </>
    );
  }

  return notFound();
}

