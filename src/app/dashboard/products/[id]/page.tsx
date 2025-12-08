import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EditProductForm } from '@/components/dashboard/EditProductForm';

// OBRIGATÓRIO: Força a página a não fazer cache, garantindo dados frescos
export const dynamic = 'force-dynamic';

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ensureSupabaseEnv = () => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      // eslint-disable-next-line no-console
      console.error(
        'Faltam variáveis de ambiente Supabase: NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY'
      );
      throw new Error(
        'Configuração inválida: verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY'
      );
    }
  };

  ensureSupabaseEnv();
  const supabase = await createClient();
  const { id } = await params; // Next.js 15: params é Promise

  // 1. Autenticação
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // 2. Busca do Produto (Server Side)
  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !product) {
    return notFound();
  }

  // 3. Renderiza o Formulário (Client Component)
  return <EditProductForm product={product} userId={user.id} />;
}
