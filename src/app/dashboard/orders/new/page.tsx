import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { NewOrderClient } from '@/components/dashboard/NewOrderClient';
import { ShoppingCart, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Novo Pedido | Rep-Vendas',
  description: 'Crie um novo pedido ou orçamento.',
};

export const dynamic = 'force-dynamic';

export default async function NewOrderPage() {
  const supabase = await createClient();

  // 1. Autenticação
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // 2. Buscar Produtos
  // Ordenamos por nome para facilitar a busca inicial
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*') // Trazemos tudo para o carrinho ter acesso a foto, preço, estoque, etc.
    .eq('user_id', user.id)
    .order('name');

  if (productsError) {
    console.error('Erro ao buscar produtos:', productsError);
  }

  // 3. Buscar Configurações
  // Usamos maybeSingle() para não dar erro se o usuário ainda não salvou configurações
  const { data: settings } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  return (
    <div className="flex flex-col h-[calc(100vh-1rem)] bg-gray-50 dark:bg-slate-950 p-4 md:p-6 overflow-hidden">
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl shadow-sm">
            <ShoppingCart size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Novo Pedido
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Monte o carrinho e selecione o cliente.
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/orders"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
        >
          <ArrowLeft size={16} />
          Voltar para Pedidos
        </Link>
      </div>

      {/* ÁREA DO CLIENTE (POS / CARRINHO) */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col relative">
        <NewOrderClient
          initialProducts={products || []}
          userSettings={settings}
          userId={user.id}
        />
      </div>
    </div>
  );
}
