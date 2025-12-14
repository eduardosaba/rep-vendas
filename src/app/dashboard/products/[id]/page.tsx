import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EditProductForm } from '@/components/dashboard/EditProductForm';

// Garante que a página não faça cache, pois os dados do produto podem mudar
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from('products')
    .select('name')
    .eq('id', id)
    .single();

  return {
    title: product ? `Editar: ${product.name}` : 'Editar Produto',
  };
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { id } = await params;

  // 1. Autenticação
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // 2. Busca do Produto
  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !product) {
    return notFound();
  }

  // 3. Renderiza o Formulário Cliente com os dados iniciais
  return <EditProductForm product={product} />;
}
