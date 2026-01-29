import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Storefront } from '@/components/catalogo/Storefront';
import { Metadata, ResolvingMetadata } from 'next';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

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

  const { data: catalog } = await supabase
    .from('public_catalogs')
    .select(
      'store_name, logo_url, footer_message, user_id, og_image_url, single_brand_logo_url, share_banner_url, updated_at'
    )
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (!catalog) return { title: 'Loja não encontrada' };

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
        `${process.env.NEXT_PUBLIC_APP_URL || ''}/link.webp`;
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

  const fallbackImage = `${process.env.NEXT_PUBLIC_APP_URL || ''}/link.webp`;
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
  const { productId } = await searchParams;
  const supabase = await createClient();

  // Buscar catálogo SEM filtrar por is_active para verificar se existe
  const { data: catalog, error: catalogError } = await supabase
    .from('public_catalogs')
    .select('*, price_password_hash')
    .eq('slug', slug)
    .maybeSingle();

  if (catalogError || !catalog) return notFound();

  // Se a loja estiver desativada, redirecionar para página de manutenção
  if (!catalog.is_active) {
    const { redirect } = await import('next/navigation');
    redirect(`/catalogo/${slug}/maintenance`);
  }

  // Determinar limite do plano do dono do catálogo (compatível com product_limit ou max_products)
  let maxLimit = 5000; // fallback aumentado para 5000
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

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*, product_images(url, is_primary)')
    .eq('user_id', catalog.user_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .range(0, fetchLimit - 1);

  // Injeta a imagem principal da galeria no campo image_url para o ProductCard usar
  const productsWithImages = products?.map((p: any) => {
    const gallery = p.product_images || [];
    const primary = gallery.find((i: any) => i.is_primary);
    const displayUrl = primary ? primary.url : gallery[0]?.url;

    if (displayUrl) {
      return { ...p, image_url: displayUrl };
    }
    return p;
  });

  return (
    <Storefront
      catalog={catalog}
      initialProducts={productsWithImages || []}
      startProductId={typeof productId === 'string' ? productId : undefined}
    />
  );
}
