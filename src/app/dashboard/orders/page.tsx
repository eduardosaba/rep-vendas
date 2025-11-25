'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Order } from '@/lib/types';
import Link from 'next/link';
import {
  Search,
  Filter,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';

export default function OrdersPage() {
  const { addToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  // --- BUSCAR PEDIDOS ---
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Buscamos os pedidos, garantindo que trazemos o display_id
      const { data, error } = await supabase
        .from('orders')
        .select('*, display_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error(error);
      addToast({ title: 'Erro ao carregar pedidos', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // --- FILTRAGEM LOCAL ---
  const filteredOrders = orders.filter((order) => {
    // 1. Filtro por Status
    const matchesStatus =
      statusFilter === 'Todos' || order.status === statusFilter;

    // 2. Filtro por Busca (ID, ID curto ou Nome do Cliente)
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      (order.id && String(order.id).toLowerCase().includes(searchLower)) ||
      (order.display_id &&
        String(order.display_id).toLowerCase().includes(searchLower)) ||
      order.client_name_guest?.toLowerCase().includes(searchLower) ||
      false;

    return matchesStatus && matchesSearch;
  });

  // --- BADGE DE STATUS ---
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Pendente: 'bg-yellow-100 text-yellow-800',
      Completo: 'bg-green-100 text-green-800',
      Confirmado: 'bg-blue-100 text-blue-800',
      Enviado: 'bg-purple-100 text-purple-800',
      Entregue: 'bg-green-100 text-green-800',
      Cancelado: 'bg-red-100 text-red-800',
      Orçamento: 'bg-gray-100 text-gray-800',
    };

    const Icons: Record<string, any> = {
      Pendente: Clock,
      Completo: CheckCircle,
      Confirmado: CheckCircle,
      Enviado: CheckCircle,
      Entregue: CheckCircle,
      Cancelado: XCircle,
      Orçamento: AlertTriangle,
    };

    const Icon = Icons[status] || Clock;
    const style = styles[status] || 'bg-gray-100 text-gray-800';

    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}
      >
        <Icon size={12} />
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Gerenciar Pedidos
          </h1>
          <p className="text-sm text-gray-500">
            Acompanhe as vendas e orçamentos
          </p>
        </div>

        {/* Filtros Rápidos (Abas) */}
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 custom-scrollbar">
          {['Todos', 'Pendente', 'Confirmado', 'Enviado', 'Cancelado'].map(
            (status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  statusFilter === status
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {status}
              </button>
            )
          )}
        </div>
      </div>

      {/* Barra de Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Buscar por número do pedido (#1001) ou nome do cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all shadow-sm"
        />
      </div>

      {/* Lista de Pedidos (Tabela) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-medium">Pedido</th>
                <th className="px-6 py-4 font-medium">Cliente</th>
                <th className="px-6 py-4 font-medium">Data</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">
                  Valor Total
                </th>
                <th className="px-6 py-4 font-medium text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <Loader2 className="animate-spin mx-auto text-indigo-600 h-8 w-8" />
                    <p className="mt-2 text-gray-500">Carregando pedidos...</p>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <Filter className="h-12 w-12 text-gray-300 mb-3" />
                      <p className="text-lg font-medium text-gray-900">
                        Nenhum pedido encontrado
                      </p>
                      <p className="text-sm text-gray-500">
                        Tente ajustar os filtros ou a busca.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">
                          #
                          {order.display_id ||
                            order.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500 font-mono">
                          {order.id.slice(0, 8)}...
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900 block">
                        {order.client_name_guest || 'Cliente não identificado'}
                      </span>
                      <span className="text-xs text-gray-500 capitalize">
                        {order.payment_method || 'Pagamento pendente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} />
                        {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </div>
                      <div className="text-xs mt-1 text-gray-400">
                        {new Date(order.created_at).toLocaleTimeString(
                          'pt-BR',
                          { hour: '2-digit', minute: '2-digit' }
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(order.total_value)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link
                        href={`/dashboard/orders/${order.display_id || order.id}`}
                        className="inline-flex p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Ver Detalhes"
                      >
                        <Eye size={20} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
