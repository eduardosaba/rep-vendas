'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  RefreshCcw,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Clock,
  ArrowRight,
  X,
  Package,
  PlusCircle,
} from 'lucide-react';
import { getUiStatusKey } from '@/lib/orderStatus';

// Interface do Pedido
export interface Order {
  id: number;
  display_id: number;
  created_at: string;
  status: string;
  total_value: number;
  item_count: number;
  client_name_guest: string;
  client_phone_guest: string;
}

interface OrdersTableProps {
  initialOrders: Order[];
}

// A exportação deve ser nomeada assim:
export function OrdersTable({ initialOrders }: OrdersTableProps) {
  // Dados
  const [orders, setOrders] = useState<Order[]>(initialOrders);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    startDate: '',
    endDate: '',
  });

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const kpis = useMemo(() => {
    const totalOrders = orders.length;
    const validOrders = orders.filter(
      (o) => getUiStatusKey(o.status) !== 'cancelled'
    );
    const totalRevenue = validOrders.reduce((acc, o) => acc + o.total_value, 0);
    const pendingOrders = orders.filter(
      (o) => getUiStatusKey(o.status) === 'pending'
    ).length;
    const averageTicket =
      validOrders.length > 0 ? totalRevenue / validOrders.length : 0;

    return { totalOrders, totalRevenue, pendingOrders, averageTicket };
  }, [orders]);

  // --- PROCESSAMENTO (Filtros + Busca) ---
  const processedOrders = useMemo(() => {
    const data = orders.filter((order) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        (order.client_name_guest || '').toLowerCase().includes(searchLower) ||
        String(order.display_id).includes(searchLower) ||
        (order.client_phone_guest || '').includes(searchLower);

      const matchesStatus =
        filters.status === 'all' ||
        getUiStatusKey(order.status) === filters.status;

      let matchesDate = true;
      if (filters.startDate || filters.endDate) {
        const orderDate = new Date(order.created_at).setHours(0, 0, 0, 0);
        const start = filters.startDate
          ? new Date(filters.startDate).setHours(0, 0, 0, 0)
          : null;
        const end = filters.endDate
          ? new Date(filters.endDate).setHours(23, 59, 59, 999)
          : null;

        if (start && orderDate < start) matchesDate = false;
        if (end && orderDate > end) matchesDate = false;
      }

      return matchesSearch && matchesStatus && matchesDate;
    });

    return data.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [orders, searchTerm, filters]);

  // --- PAGINAÇÃO ---
  const totalPages = Math.ceil(processedOrders.length / itemsPerPage);
  const paginatedOrders = processedOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // --- HELPERS ---
  const handleRefresh = () => window.location.reload();

  const getStatusBadge = (status: string) => {
    const key = getUiStatusKey(status);
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
      delivered: 'bg-green-100 text-green-800 border-green-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
    };
    const labels: Record<string, string> = {
      pending: 'Pendente',
      confirmed: 'Confirmado',
      delivered: 'Entregue',
      cancelled: 'Cancelado',
    };
    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles[key] || 'bg-gray-100 text-gray-800 border-gray-200'}`}
      >
        {labels[key] || key}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-20">
      {/* 1. DASHBOARD KPIS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-1">
            <ShoppingBag size={14} /> Total Pedidos
          </span>
          <span className="text-2xl font-bold text-gray-900">
            {kpis.totalOrders}
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-1">
            <DollarSign size={14} /> Receita Total
          </span>
          <span className="text-2xl font-bold text-green-600">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(kpis.totalRevenue)}
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-1">
            <Clock size={14} /> Pendentes
          </span>
          <span className="text-2xl font-bold text-yellow-600">
            {kpis.pendingOrders}
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-1">
            <TrendingUp size={14} /> Ticket Médio
          </span>
          <span className="text-2xl font-bold text-indigo-600">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(kpis.averageTicket)}
          </span>
        </div>
      </div>

      {/* 2. BARRA DE CONTROLE */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 justify-between">
          {/* Busca e Filtro Toggle */}
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Buscar cliente, telefone ou ID..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 focus:border-indigo-500 focus:outline-none transition-all shadow-sm"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg border flex items-center gap-2 font-medium transition-colors ${showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <Filter size={18} /> Filtros
            </button>
          </div>

          {/* Ações */}
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              className="p-2.5 text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg"
              title="Recarregar"
            >
              <RefreshCcw size={18} />
            </button>
            <Link
              href="/dashboard/orders/new"
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 shadow-sm transition-colors"
            >
              <PlusCircle size={18} />{' '}
              <span className="hidden sm:inline">Nova Venda</span>
            </Link>
          </div>
        </div>

        {/* Painel de Filtros Avançados */}
        {showFilters && (
          <div className="pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in slide-in-from-top-2">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                Status
              </label>
              <select
                className="w-full p-2 border rounded-lg text-sm bg-white outline-none focus:border-indigo-500"
                value={filters.status}
                onChange={(e) => {
                  setFilters({ ...filters, status: e.target.value });
                  setCurrentPage(1);
                }}
              >
                <option value="all">Todos</option>
                <option value="pending">Pendente</option>
                <option value="confirmed">Confirmado</option>
                <option value="delivered">Entregue</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block flex gap-2">
                <Calendar size={12} /> Data Início
              </label>
              <input
                type="date"
                className="w-full p-2 border rounded-lg text-sm outline-none focus:border-indigo-500"
                value={filters.startDate}
                onChange={(e) => {
                  setFilters({ ...filters, startDate: e.target.value });
                  setCurrentPage(1);
                }}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block flex gap-2">
                <Calendar size={12} /> Data Fim
              </label>
              <input
                type="date"
                className="w-full p-2 border rounded-lg text-sm outline-none focus:border-indigo-500"
                value={filters.endDate}
                onChange={(e) => {
                  setFilters({ ...filters, endDate: e.target.value });
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className="col-span-full flex justify-end">
              <button
                onClick={() => {
                  setFilters({ status: 'all', startDate: '', endDate: '' });
                  setCurrentPage(1);
                }}
                className="text-sm text-red-500 hover:underline flex items-center gap-1 font-medium"
              >
                <X size={14} /> Limpar Filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. TABELA DE PEDIDOS */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
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
              {processedOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <Package className="h-12 w-12 text-gray-300 mb-3" />
                      <p className="text-lg font-medium text-gray-900">
                        Nenhum pedido encontrado
                      </p>
                      <p className="text-sm text-gray-500">
                        Tente ajustar os filtros de busca.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">
                      #{order.display_id}
                      <span className="block text-xs text-gray-400 font-normal mt-0.5">
                        {order.item_count} itens
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      <span className="block font-medium">
                        {order.client_name_guest}
                      </span>
                      <span className="text-xs text-gray-400">
                        {order.client_phone_guest}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(order.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(order.total_value)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/dashboard/orders/${order.display_id}`}
                        className="inline-flex p-2 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors"
                        title="Ver Detalhes"
                      >
                        <ArrowRight size={18} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <p className="text-sm text-gray-500">
            Mostrando {paginatedOrders.length} de {processedOrders.length}{' '}
            pedidos
          </p>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-3 py-1.5 border rounded-lg bg-white disabled:opacity-50 hover:bg-gray-50 flex items-center gap-1 text-sm font-medium text-gray-700 transition-colors"
            >
              <ChevronLeft size={16} /> Anterior
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-3 py-1.5 border rounded-lg bg-white disabled:opacity-50 hover:bg-gray-50 flex items-center gap-1 text-sm font-medium text-gray-700 transition-colors"
            >
              Próxima <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
