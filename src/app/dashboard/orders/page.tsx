import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  Clock,
  CheckCircle,
  Package,
  XCircle,
  ChevronRight,
} from 'lucide-react';

export default async function OrdersPage({
  searchParams,
}: {
  // Em Next.js 15, searchParams é uma Promise
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // 1. AWAIT OBRIGATÓRIO: Resolvemos a promise dos parâmetros da URL
  const { status: statusFilter, q: search } = await searchParams;

  // Construção da Query
  let query = supabase
    .from('orders')
    .select(
      'id, display_id, client_name_guest, total_value, status, created_at, item_count'
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  if (search) {
    query = query.ilike('client_name_guest', `%${search}%`);
  }

  const { data: orders, error } = await query;

  if (error) {
    console.error(error);
  }

  const getStatusInfo = (s: string) => {
    switch (s) {
      case 'confirmed':
        return {
          color: 'text-green-600 bg-green-50',
          icon: CheckCircle,
          label: 'Confirmado',
        };
      case 'delivered':
        return {
          color: 'text-blue-600 bg-blue-50',
          icon: Package,
          label: 'Entregue',
        };
      case 'cancelled':
        return {
          color: 'text-red-600 bg-red-50',
          icon: XCircle,
          label: 'Cancelado',
        };
      default:
        return {
          color: 'text-yellow-600 bg-yellow-50',
          icon: Clock,
          label: 'Pendente',
        };
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
            <p className="text-sm text-gray-500">
              Gerencie todas as vendas realizadas.
            </p>
          </div>
        </div>

        {/* Filtros Rápidos */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'pending', label: 'Pendentes' },
            { id: 'confirmed', label: 'Confirmados' },
            { id: 'delivered', label: 'Entregues' },
          ].map((filter) => (
            <Link
              key={filter.id}
              href={`/dashboard/orders?status=${filter.id}`}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                statusFilter === filter.id ||
                (!statusFilter && filter.id === 'all')
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {filter.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Lista de Pedidos */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-medium">Pedido</th>
                <th className="px-6 py-4 font-medium">Cliente</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Data</th>
                <th className="px-6 py-4 font-medium text-right">Total</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!orders || orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                      <Search size={20} className="text-gray-400" />
                    </div>
                    <p className="font-medium">Nenhum pedido encontrado</p>
                    <p className="text-xs">Tente mudar os filtros.</p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const status = getStatusInfo(order.status);
                  const StatusIcon = status.icon;

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 transition-colors group"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">
                        #{order.display_id}
                        <span className="block text-xs text-gray-400 font-normal">
                          {order.item_count} itens
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {order.client_name_guest}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}
                        >
                          <StatusIcon size={12} />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(order.created_at).toLocaleDateString('pt-BR')}
                        <span className="text-gray-400 text-xs ml-2">
                          {new Date(order.created_at).toLocaleTimeString(
                            'pt-BR',
                            { hour: '2-digit', minute: '2-digit' }
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(order.total_value)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/dashboard/orders/${order.id}`}
                          className="inline-flex p-2 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors"
                        >
                          <ChevronRight size={18} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
