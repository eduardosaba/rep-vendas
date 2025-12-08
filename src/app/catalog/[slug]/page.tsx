import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Storefront } from '@/components/catalog/Storefront';
import { Metadata, ResolvingMetadata } from 'next';

export const revalidate = 0;

// Força carregamento dinâmico para evitar fetchs durante o build
export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// 1. GERADOR DE METADADOS (SEO)
export async function generateMetadata(
  { params, searchParams }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;
  const { productId } = await searchParams;

  const supabase = await createClient();

  const { data: store } = await supabase
    .from('settings')
    .select('name, logo_url, footer_message')
    .eq('catalog_slug', slug)
    .single();

  if (!store) return { title: 'Loja não encontrada' };

  if (productId && typeof productId === 'string') {
    const { data: product } = await supabase
      .from('products')
      .select('name, price, image_url, external_image_url, description')
      .eq('id', productId)
      .eq('is_active', true) // GARANTE QUE SÓ MOSTRA SE ATIVO
      .single();

    if (product) {
      const priceFormatted = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(product.price);
      const ogImage =
        product.image_url ||
        product.external_image_url ||
        store.logo_url ||
        null;
      return {
        title: `${product.name} | ${store.name}`,
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
    title: `${store.name} | Catálogo Digital`,
    description:
      store.footer_message ||
      'Confira nossos produtos e faça seu pedido online.',
    openGraph: {
      title: store.name,
      images: store.logo_url ? [store.logo_url] : [],
    },
  };
}

// 2. PÁGINA DO CATÁLOGO
export default async function CatalogPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { productId } = await searchParams;

  const supabase = await createClient();

  const { data: store, error: storeError } = await supabase
    .from('settings')
    .select('*')
    .eq('catalog_slug', slug)
    .single();

  if (storeError || !store) return notFound();

  // BUSCA APENAS PRODUTOS ATIVOS
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', store.user_id)
    .eq('is_active', true) // <--- FILTRO IMPORTANTE
    .order('created_at', { ascending: false });

  return (
    <Storefront
      store={store}
      initialProducts={products || []}
      startProductId={typeof productId === 'string' ? productId : undefined}
    />
  );
}
