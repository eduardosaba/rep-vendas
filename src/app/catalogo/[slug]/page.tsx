import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Storefront } from '@/components/catalogo/Storefront';
import { Metadata, ResolvingMetadata } from 'next';
import { PublicCatalog } from '@/lib/types';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

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
    .maybeSingle();

  if (!catalog) return { title: 'Loja não encontrada' };

  // Se houver um produto selecionado na URL, priorizamos ele no SEO
  if (productId && typeof productId === 'string') {
    const { data: product } = await supabase
      .from('products')
      .select('name, price, description, image_url')
      .eq('id', productId)
      .maybeSingle();

    if (product) {
      return {
        title: `${product.name} | ${catalog.store_name}`,
        description:
          product.description || `Confira ${product.name} em nosso catálogo.`,
        openGraph: {
          images: [product.image_url || catalog.logo_url || ''],
        },
      };
    }
  }

  return {
    title: `${catalog.store_name} | Catálogo Online`,
    description: catalog.footer_message,
  };
}

export default async function CatalogPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sParams = await searchParams;
  const productId = sParams.product; // Ajustado para bater com a lógica do Context

  const supabase = await createClient();

  // 1. Busca Catálogo com tipagem explícita
  const { data: catalog } = await supabase
    .from('public_catalogs')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (!catalog) return notFound();

  // 2. Busca Produtos (Apenas o necessário para renderização inicial)
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', (catalog as PublicCatalog).user_id)
    .eq('is_active', true)
    .order('name', { ascending: true });

  return (
    <Storefront
      catalog={catalog as PublicCatalog}
      initialProducts={products || []}
      startProductId={typeof productId === 'string' ? productId : undefined}
    />
  );
}
