import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Storefront } from '@/components/catalog/Storefront';
import { Metadata } from 'next';

type Props = {
  params: Promise<{ slug: string }>; // Next.js 15: params é uma Promise
};

// 1. Gera metadados dinâmicos (Título da aba do navegador = Nome da Loja)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // AWAIT OBRIGATÓRIO no Next.js 15
  const { slug } = await params;

  const supabase = await createClient();
  const { data: store } = await supabase
    .from('settings')
    .select('name')
    .eq('catalog_slug', slug)
    .single();

  return {
    title: store
      ? `${store.name} | Catálogo Digital`
      : 'Catálogo não encontrado',
  };
}

export default async function CatalogPage({ params }: Props) {
  // AWAIT OBRIGATÓRIO no Next.js 15
  const { slug } = await params;

  const supabase = await createClient();

  // 2. Busca as Configurações da Loja (Baseado no Slug)
  const { data: store, error: storeError } = await supabase
    .from('settings')
    .select('*')
    .eq('catalog_slug', slug)
    .single();

  if (storeError || !store) {
    return notFound(); // Retorna página 404 padrão do Next.js se o slug não existir
  }

  // 3. Busca os Produtos dessa loja
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', store.user_id) // Usa o ID do dono da loja
    .order('created_at', { ascending: false });

  // 4. Renderiza a Interface (Client Component) passando os dados
  return <Storefront store={store} initialProducts={products || []} />;
}
