import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getActiveUserId } from '@/lib/auth-utils';
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
  // Restringir busca ao usuário ativo para evitar expor nomes de produtos de terceiros
  try {
    const activeUserId = await getActiveUserId();
    if (!activeUserId) return { title: 'Editar Produto' };

    const { data: product } = await supabase
      .from('products')
      .select('name')
      .or(`slug.eq.${slug},id.eq.${slug}`)
      .eq('user_id', activeUserId)
      .maybeSingle();

    return { title: product ? `Editar: ${product.name}` : 'Editar Produto' };
  } catch (e) {
    return { title: 'Editar Produto' };
  }
}

export default async function EditProductBySlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const supabase = await createClient();
  const { slug } = await params;

  const activeUserId = await getActiveUserId();
  if (!activeUserId) redirect('/login');

  try {
    // Busca por slug ou id (compatibilidade com links antigos)
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .or(`slug.eq.${slug},id.eq.${slug}`)
      .eq('user_id', activeUserId)
      .maybeSingle();

    if (error) {
      // retornar erro legível na página para diagnóstico rápido
      return (
        <div className="p-8">
          <h2 className="text-xl font-bold">Erro ao carregar produto</h2>
          <pre className="whitespace-pre-wrap mt-4 text-sm text-red-600">
            {String(error)}
          </pre>
        </div>
      );
    }

    if (!product) {
      return (
        <div className="p-8">
          <h2 className="text-xl font-bold">Produto não encontrado</h2>
          <p className="mt-2 text-sm text-gray-700">
            O produto não foi encontrado ou você não tem permissão para
            editá-lo.
          </p>
          <div className="mt-4">
            <a
              href="/dashboard/products"
              className="rounded bg-blue-600 px-4 py-2 text-white"
            >
              Voltar aos Produtos
            </a>
          </div>
        </div>
      );
    }

    return <EditProductForm product={product} />;
  } catch (err: any) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-bold">Erro inesperado</h2>
        <pre className="whitespace-pre-wrap mt-4 text-sm text-red-600">
          {String(err)}
        </pre>
      </div>
    );
  }
}
