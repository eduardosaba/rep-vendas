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
    .select('store_name, logo_url, footer_message, user_id')
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
      const ogImage =
        product.image_url ||
        product.external_image_url ||
        catalog.logo_url ||
        null;
      return {
        title: `${product.name} | ${catalog.store_name}`,
        description: `Por apenas ${priceFormatted}. ${product.description || 'Confira os detalhes!'}`,
        openGraph: {
          title: `${product.name} - ${priceFormatted}`,
          description: product.description || 'Confira este produto incrível!',
          images: ogImage ? [ogImage] : [],
        },
      };
    }
  }

  return {
    title: `${catalog.store_name} | Catálogo Digital`,
    description: catalog.footer_message || 'Confira nossos produtos e faça seu pedido online.',
    openGraph: {
      title: catalog.store_name,
      images: catalog.logo_url ? [catalog.logo_url] : [],
    },
  };
}

// 2. PÁGINA DO CATÁLOGO
export default async function CatalogPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { productId } = await searchParams;
  const supabase = await createClient();

  // AQUI: Adicionamos explicitamente o price_password_hash na query
  const { data: catalog, error: catalogError } = await supabase
    .from('public_catalogs')
    .select('*, price_password_hash') 
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (catalogError || !catalog) return notFound();

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', catalog.user_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  return (
    <Storefront
      catalog={catalog}
      initialProducts={products || []}
      startProductId={typeof productId === 'string' ? productId : undefined}
    />
  );
}