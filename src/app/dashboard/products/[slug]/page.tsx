import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EditProductForm } from '@/components/dashboard/EditProductForm';

// Não cachear: produto pode mudar
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from('products')
    .select('name')
    .eq('slug', slug)
    .maybeSingle();

  return { title: product ? `Editar: ${product.name}` : 'Editar Produto' };
}

export default async function EditProductBySlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const supabase = await createClient();
  const { slug } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !product) return notFound();

  return <EditProductForm product={product} />;
}
