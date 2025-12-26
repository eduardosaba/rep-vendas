import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { StoreMaintenance } from '@/components/catalogo/StoreMaintenance';
import { Metadata } from 'next';
import { Storefront } from '@/components/catalogo/Storefront';

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * 1. Geração Dinâmica de Metadados (SEO)
 * Garante que ao compartilhar o link, o nome e logo da loja apareçam no card.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: store } = await supabase
    .from('public_catalogs')
    .select('store_name, logo_url')
    .eq('slug', slug)
    .maybeSingle();

  if (!store) return { title: 'Catálogo não encontrado' };

  return {
    title: `${store.store_name} | RepVendas`,
    description: `Confira o catálogo digital de ${store.store_name}. Faça seu pedido online via WhatsApp.`,
    openGraph: {
      title: store.store_name,
      images: store.logo_url ? [store.logo_url] : [],
    },
  };
}

/**
 * 2. Página do Catálogo (Server Component)
 */
export default async function CatalogPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  // A. Busca os dados fundamentais do catálogo na tabela pública
  const { data: store, error: storeError } = await supabase
    .from('public_catalogs')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  // B. Validação de existência (Se o slug não existir, mostra 404 padrão)
  if (!store || storeError) {
    return notFound();
  }

  // C. TRAVA DE SEGURANÇA: Chave Mestra Online/Offline
  // Se is_active for false, o catálogo é bloqueado e mostra a página de manutenção.
  if (store.is_active === false) {
    return (
      <StoreMaintenance storeName={store.store_name} phone={store.phone} />
    );
  }

  // D. Busca paralela de Categorias e Produtos (Performance Otimizada)
  const [categoriesRes, productsRes] = await Promise.all([
    supabase
      .from('categories')
      .select('*')
      .eq('user_id', store.user_id)
      .order('name'),
    supabase
      .from('products')
      .select('*')
      .eq('user_id', store.user_id)
      .eq('active', true) // Filtro crítico: apenas produtos marcados como ativos
      .order('created_at', { ascending: false }),
  ]);

  const categories = categoriesRes.data || [];
  const products = productsRes.data || [];

  // E. Renderiza a visualização do cliente (Client Component Wrapper)
  // Usa `Storefront`, que envolve os providers necessários.
  return (
    <Storefront
      catalog={store}
      initialProducts={products}
      // startProductId pode ser usado para abrir um produto específico
    />
  );
}
