import { Metadata, ResolvingMetadata } from 'next';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import ProductDetailUnifiedPage from '@/components/catalogo/pages/ProductDetailUnifiedPage';
import { normalizeCatalogSlug, escapeIlikePattern } from '@/lib/resolve-context';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type Props = {
  params: Promise<{ slug: string; productId: string }>;
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://repvendas.com.br';

function getAdminClient() {
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!adminKey || !supabaseUrl) return null;
  return createSupabaseAdmin(supabaseUrl, adminKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function generateMetadata(
  { params }: Props,
  _parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug, productId } = await params;
  const normalizedSlug = normalizeCatalogSlug(slug);
  const admin = getAdminClient();

  if (!admin) {
    return {
      title: 'Produto | Catálogo Digital',
      alternates: {
        canonical: `${APP_URL}/catalogo/${normalizedSlug}/product/${productId}`,
      },
    };
  }

  // 1. Buscar produto
  const { data: product } = await admin
    .from('products')
    .select('id, name, description, price, sale_price, image_url, external_image_url, brand, is_active')
    .eq('id', productId)
    .maybeSingle();

  // 2. Buscar identificação da loja / empresa
  let storeName = 'Catálogo Digital';
  const { data: catalog } = await admin
    .from('public_catalogs')
    .select('store_name')
    .ilike('catalog_slug', escapeIlikePattern(normalizedSlug))
    .maybeSingle();

  if (catalog?.store_name) {
    storeName = catalog.store_name;
  } else {
    const { data: company } = await admin
      .from('companies')
      .select('name')
      .ilike('slug', escapeIlikePattern(normalizedSlug))
      .maybeSingle();
    if (company?.name) {
      storeName = company.name;
    }
  }

  if (!product || product.is_active === false) {
    return {
      title: `Produto não encontrado | ${storeName}`,
      robots: { index: false, follow: false },
    };
  }

  const effectivePrice = product.sale_price || product.price;
  const priceFormatted = effectivePrice
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(effectivePrice)
    : null;

  const title = `${product.name} | ${storeName}`;
  const description = priceFormatted
    ? `Por ${priceFormatted}. ${product.description ? product.description.slice(0, 150) : 'Confira detalhes e faça seu pedido online.'}`
    : product.description
      ? product.description.slice(0, 150)
      : `Confira os detalhes de ${product.name} em nosso catálogo online.`;

  const imageUrl =
    product.image_url ||
    product.external_image_url ||
    `${APP_URL}/repvendas.png`;

  const canonicalUrl = `${APP_URL}/catalogo/${normalizedSlug}/product/${productId}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: storeName,
      type: 'article',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: product.name,
        },
      ],
      locale: 'pt_BR',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ProductDetailPageServer({ params }: Props) {
  const { slug, productId } = await params;
  const normalizedSlug = normalizeCatalogSlug(slug);
  const admin = getAdminClient();

  let productSchema: any = null;
  let breadcrumbSchema: any = null;

  if (admin) {
    const { data: product } = await admin
      .from('products')
      .select('id, name, description, price, sale_price, image_url, external_image_url, brand, sku')
      .eq('id', productId)
      .maybeSingle();

    let storeName = 'Catálogo';
    const { data: catalog } = await admin
      .from('public_catalogs')
      .select('store_name')
      .ilike('catalog_slug', escapeIlikePattern(normalizedSlug))
      .maybeSingle();

    if (catalog?.store_name) {
      storeName = catalog.store_name;
    } else {
      const { data: company } = await admin
        .from('companies')
        .select('name')
        .ilike('slug', escapeIlikePattern(normalizedSlug))
        .maybeSingle();
      if (company?.name) storeName = company.name;
    }

    if (product) {
      const effectivePrice = product.sale_price || product.price || 0;
      const imageUrl = product.image_url || product.external_image_url || `${APP_URL}/repvendas.png`;
      const canonicalUrl = `${APP_URL}/catalogo/${normalizedSlug}/product/${productId}`;

      productSchema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        image: imageUrl,
        description: product.description || `Produto ${product.name} disponível em ${storeName}`,
        sku: product.sku || product.id,
        brand: product.brand
          ? {
              '@type': 'Brand',
              name: product.brand,
            }
          : undefined,
        offers: {
          '@type': 'Offer',
          url: canonicalUrl,
          priceCurrency: 'BRL',
          price: effectivePrice,
          availability: 'https://schema.org/InStock',
          seller: {
            '@type': 'Organization',
            name: storeName,
          },
        },
      };

      breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Início',
            item: APP_URL,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: storeName,
            item: `${APP_URL}/catalogo/${normalizedSlug}`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: product.name,
            item: canonicalUrl,
          },
        ],
      };
    }
  }

  return (
    <>
      {productSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
        />
      )}
      {breadcrumbSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
      )}
      <ProductDetailUnifiedPage />
    </>
  );
}
