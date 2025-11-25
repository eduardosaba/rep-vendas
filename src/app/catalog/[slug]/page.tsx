import { Metadata } from 'next';
import { supabase } from '@/lib/supabaseClient';
import { notFound } from 'next/navigation';
import CatalogClient from '@/components/catalog/CatalogClient'; // Vamos criar este wrapper abaixo

// Função para descobrir o ID real do representante a partir do slug ou ID
async function resolveCatalogUserId(slug: string): Promise<string | null> {
  // 1. Tentar buscar por SLUG na tabela de configurações
  const { data: settings } = await supabase
    .from('settings')
    .select('user_id')
    .eq('catalog_slug', slug)
    .single();

  if (settings?.user_id) {
    return settings.user_id;
  }

  // 2. Se não achou por slug, verifica se o texto parece um UUID (ID direto)
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      slug
    );

  if (isUuid) {
    // Verifica se esse usuário realmente existe
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', slug)
      .single();

    if (profile) return slug;
  }

  return null;
}

// Metadados para SEO e WhatsApp
export async function generateMetadata({
  params,
}: {
  params: { slug: string } | Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = (await params) as { slug: string };
  const userId = await resolveCatalogUserId(slug);
  if (!userId) return { title: 'Catálogo não encontrado' };

  const { data: settings } = await supabase
    .from('settings')
    .select('name, logo_url')
    .eq('user_id', userId)
    .single();

  return {
    title: settings?.name || 'Catálogo Online',
    description: `Confira os produtos de ${settings?.name || 'nosso representante'}.`,
    openGraph: {
      images: settings?.logo_url ? [settings.logo_url] : [],
    },
  };
}

export default async function CatalogPage({
  params,
}: {
  params: { slug: string } | Promise<{ slug: string }>;
}) {
  const { slug } = (await params) as { slug: string };

  // 1. Resolver quem é o dono deste catálogo
  const userId = await resolveCatalogUserId(slug);

  // 2. Se não encontrou ninguém, 404
  if (!userId) {
    notFound();
  }

  // 3. Carregar os dados iniciais no servidor (Rápido + SEO)
  // Isso evita o "loading..." piscando na tela do cliente
  const [settingsRes, productsRes] = await Promise.all([
    supabase.from('settings').select('*').eq('user_id', userId).single(),
    supabase.from('products').select('*').eq('user_id', userId),
  ]);

  // 4. Renderizar o Cliente
  return (
    <CatalogClient
      initialUserId={userId}
      initialSettings={settingsRes.data}
      initialProducts={productsRes.data || []}
    />
  );
}
