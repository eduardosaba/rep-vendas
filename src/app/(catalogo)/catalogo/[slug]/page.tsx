import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CatalogRichLayout from '@/components/catalogo/CatalogRichLayout';
import CatalogStandardLayout from '@/components/catalogo/CatalogStandardLayout';
import { Storefront } from '@/components/catalogo/Storefront';
import { Metadata, ResolvingMetadata } from 'next';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { getPublicCatalog } from '@/lib/catalog';
import { resolveContext } from '@/lib/resolve-context';

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
    .eq('catalog_slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  // Fallback 1: busca por profiles.slug → settings (caso catalog_slug não esteja populado)
  if (!catalog && admin) {
    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('slug', slug)
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
        const ogImageRaw = settings.share_banner_url || settings.og_image_url || logoUrl || `${process.env.NEXT_PUBLIC_APP_URL || ''}/repvendas.png`;
        const ogImage = ogImageRaw ? `${ogImageRaw}?v=${baseV}` : ogImageRaw;
        return {
          title: `${storeName} | Catálogo Digital`,
          description: settings.footer_message || 'Confira nossos produtos e faça seu pedido online.',
          openGraph: {
            title: storeName,
            description: settings.footer_message || undefined,
            url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/catalogo/${slug}`,
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
        .eq('slug', slug)
        .maybeSingle();

      if (company) {
        const fallbackImage = `${process.env.NEXT_PUBLIC_APP_URL || ''}/repvendas.png`;
        const baseV = company?.updated_at ? new Date(company.updated_at).getTime() : Date.now();
        const companyOgImageRaw = company.logo_url || fallbackImage;
        const companyOgImage = companyOgImageRaw ? `${companyOgImageRaw}?v=${baseV}` : companyOgImageRaw;

        return {
          title: `${company.name} | Catálogo Digital`,
          description: company.welcome_text || 'Confira nossos produtos e faça seu pedido online.',
          openGraph: {
            title: company.name,
            description: company.welcome_text || undefined,
            url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/catalogo/${slug}`,
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

    return { title: 'Loja não encontrada' };
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
        `${process.env.NEXT_PUBLIC_APP_URL || ''}/repvendas.png`;
      const ogImageUrl = ogImage ? `${ogImage}?v=${baseV}` : ogImage;
      return {
        title: `${product.name} | ${catalog.store_name}`,
        description: `Por apenas ${priceFormatted}. ${product.description || 'Confira os detalhes!'}`,
        openGraph: {
          title: `${product.name} - ${priceFormatted}`,
          description: product.description || 'Confira este produto incrível!',
          url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/catalogo/${slug}`,
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

  const fallbackImage = `${process.env.NEXT_PUBLIC_APP_URL || ''}/repvendas.png`;
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
    openGraph: {
      title: catalog.store_name,
      description: catalog.footer_message || undefined,
      url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/catalogo/${slug}`,
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
  const normalizedCompanySlug = String(slug || '').trim().toLowerCase();
  const supabase = await createClient();

  // Prioriza slug de distribuidora para evitar colisão com slug de perfil/legado.
  // Se existir company com este slug, esta rota base sempre aponta para /empresa.
  const { data: companyBySlugFirst } = await supabase
    .from('companies')
    .select('slug,type')
    .eq('slug', normalizedCompanySlug)
    .maybeSingle();

  if (companyBySlugFirst?.slug && String((companyBySlugFirst as any).type || '').toLowerCase() === 'distribuidora') {
    redirect(`/catalogo/${normalizedCompanySlug}/empresa`);
  }

  // Fallback com service role caso RLS impeça leitura pública em companies.
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (adminKey && supabaseUrl) {
    const admin = createSupabaseAdmin(String(supabaseUrl), String(adminKey), {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: companyBySlugAdminFirst } = await admin
      .from('companies')
      .select('slug,type')
      .eq('slug', normalizedCompanySlug)
      .maybeSingle();

    if (companyBySlugAdminFirst?.slug && String((companyBySlugAdminFirst as any).type || '').toLowerCase() === 'distribuidora') {
      redirect(`/catalogo/${normalizedCompanySlug}/empresa`);
    }
  }

  // 1) TENTA COMO CATÁLOGO INDIVIDUAL (representante ou catálogo legacy)
  let context = await resolveContext([normalizedCompanySlug], supabase as any);

  if (context?.type === 'individual') {
    let catalog = context.catalog || null;
    let settingsFallback = context.settings || null;

    if (!catalog) {
      // Quando resolveContext identifica profile por slug, tenta resolver public_catalog associado.
      const representativeId = context.representative?.id;
      if (representativeId) {
        const { data: catalogByUser } = await supabase
          .from('public_catalogs')
          .select('*, price_password_hash')
          .eq('user_id', representativeId)
          .maybeSingle();
        catalog = catalogByUser || null;

        if (representativeId) {
          const { data: settingsByUser } = await supabase
            .from('settings')
            .select('*')
            .eq('user_id', representativeId)
            .maybeSingle();
          settingsFallback = settingsByUser || settingsFallback;
        }
      }

      if (!catalog) {
        const { data: catalogBySlug } = await supabase
          .from('public_catalogs')
          .select('*, price_password_hash')
          .eq('catalog_slug', normalizedCompanySlug)
          .maybeSingle();
        catalog = catalogBySlug || null;

        if (catalog?.user_id) {
          const { data: settingsByCatalogUser } = await supabase
            .from('settings')
            .select('*')
            .eq('user_id', catalog.user_id)
            .maybeSingle();
          settingsFallback = settingsByCatalogUser || settingsFallback;
        }
      }
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
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('plan_id, plan_name')
          .eq('user_id', catalog.user_id)
          .maybeSingle();

        if (sub?.plan_id) {
          const { data: plan } = await supabase
            .from('plans')
            .select('product_limit, max_products')
            .eq('id', sub.plan_id)
            .maybeSingle();

          if (plan) {
            maxLimit = plan.product_limit || plan.max_products || maxLimit;
          }
        } else if (sub?.plan_name) {
          const { data: plan } = await supabase
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

      let productsQuery = supabase
        .from('products')
        .select('*, linked_images, product_images(url, is_primary)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(0, fetchLimit - 1);

      if (representativeCompanyId) {
        // Representante vinculado: mostrar catálogo da distribuidora (company_id)
        // sem perder produtos próprios já associados ao user_id do catálogo.
        productsQuery = productsQuery.or(
          `user_id.eq.${ownerUserId},company_id.eq.${representativeCompanyId}`
        );
      } else {
        // Representante individual: sempre filtrar pelo próprio user_id (slug -> profile.id)
        // para evitar depender de eventuais inconsistências em public_catalogs.user_id.
        productsQuery = productsQuery.eq('user_id', ownerUserId);
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
        // Prefer settings.name (explicit request) then representative_name then catalog.store_name
        store_name:
          (settingsFallback?.name as any) ||
          (settingsFallback?.representative_name as any) ||
          (catalog as any).store_name,
        // Propagate contact and branding from settings when present
        email: (settingsFallback?.email as any) || (catalog as any).email || null,
        phone: (settingsFallback?.phone as any) || (catalog as any).phone || null,
        logo_url:
          (settingsFallback?.logo_url as any) ||
          (catalog as any).single_brand_logo_url ||
          (catalog as any).logo_url,
        primary_color:
          (settingsFallback?.primary_color as any) ||
          (catalog as any).primary_color,
        secondary_color:
          (settingsFallback?.secondary_color as any) ||
          (catalog as any).secondary_color,
        representative_name: (settingsFallback?.representative_name as any) || (catalog as any).representative_name || null,
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

      return (
        <Storefront
          catalog={finalCatalog}
          initialProducts={productsWithImages || []}
          startProductId={typeof productId === 'string' ? productId : undefined}
        />
      );
    }
  }

  return notFound();
}

