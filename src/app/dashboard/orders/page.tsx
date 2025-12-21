import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OrdersTable } from '@/components/dashboard/OrdersTable';
import { ShoppingBag } from 'lucide-react';

// Força a página a ser dinâmica
export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const supabase = await createClient();

  // 1. Autenticação
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 2. Busca de Dados Otimizada
  const { data: orders, error } = await supabase
    .from('orders')
    .select(
      `id, display_id, created_at, status, total_value, item_count, client_name_guest, client_phone_guest, client_id, clients(name,phone)`
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar pedidos:', error);
  }

  const safeOrders = orders || [];

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 animate-in fade-in duration-500">
      {/* HEADER: Responsivo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Título */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShoppingBag size={24} className="text-[var(--primary)]" />
            Pedidos
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Acompanhe e gerencie suas vendas ({safeOrders.length} registros)
          </p>
        </div>

        {/* Botão Novo Pedido (Opcional, se você tiver a rota) */}
        {/* <Link href="/dashboard/orders/new">
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm w-full sm:w-auto justify-center">
            <Plus size={18} /> Novo Pedido
          </button>
        </Link> 
        */}
      </div>

      {/* CONTAINER DA TABELA */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[400px]">
        {/* Mapear dados para a forma esperada pelo OrdersTable: usar campos guest se existirem, caso contrário pegar dos clients relacionados */}
        <OrdersTable
          initialOrders={(safeOrders as any[]).map((o) => ({
            id: o.id,
            display_id: o.display_id,
            created_at: o.created_at,
            status: o.status,
            total_value: o.total_value || 0,
            item_count: o.item_count || 0,
            client_name_guest:
              o.client_name_guest || o.clients?.name || 'Visitante',
            client_phone_guest: o.client_phone_guest || o.clients?.phone || '',
          }))}
        />
      </div>
    </div>
  );
}
