import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { NewOrderClient } from '@/components/dashboard/NewOrderClient';
import { ShoppingCart, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Novo Pedido | Sistema',
  description: 'Crie um novo pedido ou orçamento.',
};

export const dynamic = 'force-dynamic';

export default async function NewOrderPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Busca produtos e configurações
  const [productsReq, settingsReq] = await Promise.all([
    supabase.from('products').select('*').eq('user_id', user.id).order('name'),
    supabase.from('settings').select('*').eq('user_id', user.id).maybeSingle()
  ]);

  const products = productsReq.data || [];
  const settings = settingsReq.data;

  return (
    <div className="flex flex-col h-[calc(100vh-1rem)] bg-gray-50 dark:bg-slate-950 p-4 md:p-6 overflow-hidden">
      
      {/* Header Compacto */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <ShoppingCart size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Novo Pedido
            </h1>
          </div>
        </div>

        <Link
          href="/dashboard/orders"
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={14} /> Voltar
        </Link>
      </div>

      {/* Área do Carrinho */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col relative">
        <NewOrderClient
          initialProducts={products}
          userSettings={settings}
          userId={user.id}
        />
      </div>
    </div>
  );
}