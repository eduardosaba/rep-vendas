import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getServerUserFallback } from '@/lib/supabase/getServerUserFallback';
import { OrdersTable } from '@/components/dashboard/OrdersTable';
import { ShoppingBag, Plus } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const supabase = await createClient();

  // 1. Verificação de Sessão
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let finalUser = user;

  if (!finalUser) {
    try {
      const fb = await getServerUserFallback();
      if (fb) finalUser = fb;
    } catch (e) {}
  }

  if (!finalUser) redirect('/login');

  // 2. Busca de Dados Otimizada com joins de Clientes e Itens
  const { data: orders, error } = await supabase
    .from('orders')
    .select(
      `
      id, 
      display_id, 
      created_at, 
      status, 
      total_value, 
      client_name_guest, 
      client_phone_guest, 
      client_id,
      clients (name, phone),
      order_items (id) 
    `
    )
    .eq('user_id', finalUser.id)
    .order('created_at', { ascending: false });

  if (error) console.error('Erro ao buscar pedidos:', error);

  // 3. Mapeamento para o formato da OrdersTable
  const mappedOrders = (orders || []).map((o: any) => {
    const clientData = Array.isArray(o.clients) ? o.clients[0] : o.clients;

    return {
      id: o.id,
      display_id: o.display_id,
      created_at: o.created_at,
      status: o.status,
      total_value: o.total_value || 0,
      item_count: o.order_items?.length || 0,
      // Prioridade: Cliente cadastrado -> Nome digitado no Guest -> 'Cliente'
      client_name_guest:
        clientData?.name || o.client_name_guest || 'Cliente não identificado',
      client_phone_guest: clientData?.phone || o.client_phone_guest || '',
    };
  });

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingBag size={24} className="text-primary" /> Pedidos
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Histórico completo e gestão de status ({mappedOrders.length}{' '}
            registros).
          </p>
        </div>

        <Link href="/dashboard/orders/new" className="w-full sm:w-auto">
          <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 w-full justify-center">
            <Plus size={18} /> Criar Pedido Manual
          </button>
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[500px]">
        <OrdersTable initialOrders={mappedOrders} />
      </div>
    </div>
  );
}
