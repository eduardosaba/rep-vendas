import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OrdersTable } from '@/components/dashboard/OrdersTable';
import { ShoppingBag, Plus } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // 1. Busca de Dados Otimizada
  // count no order_items garante o número real de itens
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id, 
      display_id, 
      created_at, 
      status, 
      total_value, 
      client_name_guest, 
      client_phone_guest, 
      client_id,
      clients (name, phone),
      order_items (count) 
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar pedidos:', error);
  }

  const safeOrders = orders || [];

  // Lógica de mapeamento robusta
  const mappedOrders = safeOrders.map((o: any) => {
    // Tenta pegar nome do cliente cadastrado (objeto ou array)
    const clientData = Array.isArray(o.clients) ? o.clients[0] : o.clients;
    
    // Nome: Preferência para Guest (se foi digitado na hora) ou Cliente Cadastrado
    // Dependendo da sua regra de negócio, você pode inverter essa prioridade.
    // Aqui assumo: Se tem ID de cliente, usa o nome do cadastro. Se não, usa o Guest.
    const finalName = clientData?.name || o.client_name_guest || 'Cliente não identificado';
    const finalPhone = clientData?.phone || o.client_phone_guest || '';

    // Contagem de itens
    const itemCount = o.order_items ? o.order_items[0]?.count : 0;

    return {
      id: o.id,
      display_id: o.display_id,
      created_at: o.created_at,
      status: o.status,
      total_value: o.total_value || 0,
      item_count: itemCount, // Usa a contagem real do banco
      client_name_guest: finalName,
      client_phone_guest: finalPhone,
    };
  });

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShoppingBag size={24} className="text-indigo-600" />
            Pedidos
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Histórico de vendas e orçamentos ({safeOrders.length} registros)
          </p>
        </div>

        <Link href="/dashboard/orders/new">
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm w-full sm:w-auto justify-center">
            <Plus size={18} /> Novo Pedido
          </button>
        </Link>
      </div>

      {/* TABELA */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[400px]">
        <OrdersTable initialOrders={mappedOrders} />
      </div>
    </div>
  );
}