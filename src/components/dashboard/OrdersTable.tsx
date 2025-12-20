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
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getUiStatusKey } from '@/lib/orderStatus';

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

  // --- PROCESSAMENTO ---
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
      pending:
        'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-900/50',
      confirmed:
        'bg-primary/10 text-primary border-primary/30 dark:bg-primary/30 dark:text-primary/80 dark:border-primary/20',
      delivered:
        'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900/50',
      cancelled:
        'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/50',
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {/* Total Pedidos */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col justify-center min-h-[90px]">
          <span className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-slate-400 uppercase flex items-center gap-2 mb-1">
            <ShoppingBag size={14} /> Total Pedidos
          </span>
          <span className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
            {kpis.totalOrders}
          </span>
        </div>

        {/* Receita Total - Fonte responsiva */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col justify-center min-h-[90px]">
          <span className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-slate-400 uppercase flex items-center gap-2 mb-1">
            <DollarSign size={14} /> Receita Total
          </span>
          <span className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400 break-words leading-tight">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(kpis.totalRevenue)}
          </span>
        </div>

        {/* Pendentes */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col justify-center min-h-[90px]">
          <span className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-slate-400 uppercase flex items-center gap-2 mb-1">
            <Clock size={14} /> Pendentes
          </span>
          <span className="text-lg sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400 truncate">
            {kpis.pendingOrders}
          </span>
        </div>

        {/* Ticket Médio */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col justify-center min-h-[90px]">
          <span className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-slate-400 uppercase flex items-center gap-2 mb-1">
            <TrendingUp size={14} /> Ticket Médio
          </span>
          <span className="text-lg sm:text-2xl font-bold text-primary dark:text-primary/70 break-words leading-tight">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(kpis.averageTicket)}
          </span>
        </div>
      </div>

      {/* 2. BARRA DE CONTROLE */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 justify-between">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Buscar cliente ou ID..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 py-2.5 pl-10 pr-4 focus:border-primary focus:outline-none transition-all shadow-sm text-gray-900 dark:text-white placeholder-gray-400 text-sm"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={`${
                showFilters
                  ? 'bg-primary/5 dark:bg-primary/20 border-primary/30 dark:border-primary/20 text-primary dark:text-primary/70'
                  : ''
              }`}
              leftIcon={<Filter size={18} />}
            >
              Filtros
            </Button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              className="p-2.5 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Recarregar"
            >
              <RefreshCcw size={18} />
            </button>

            {/* Botão Nova Venda com COR PRIMÁRIA */}
            <Link href="/dashboard/orders/new">
              <Button
                leftIcon={<PlusCircle size={18} />}
                className="bg-[var(--primary)] hover:opacity-90 text-white border-transparent shadow-md"
              >
                <span className="hidden sm:inline">Nova Venda</span>
                <span className="sm:hidden">Novo</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Filtros Avançados */}
        {showFilters && (
          <div className="pt-4 border-t border-gray-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in slide-in-from-top-2">
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1 block">
                Status
              </label>
              <select
                className="w-full p-2 border rounded-lg text-sm bg-white dark:bg-slate-950 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:border-primary"
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
              <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1 block flex gap-2">
                <Calendar size={12} /> Data Início
              </label>
              <input
                type="date"
                className="w-full p-2 border rounded-lg text-sm bg-white dark:bg-slate-950 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:border-[var(--primary)]"
                value={filters.startDate}
                onChange={(e) => {
                  setFilters({ ...filters, startDate: e.target.value });
                  setCurrentPage(1);
                }}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1 block flex gap-2">
                <Calendar size={12} /> Data Fim
              </label>
              <input
                type="date"
                className="w-full p-2 border rounded-lg text-sm bg-white dark:bg-slate-950 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:border-[var(--primary)]"
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
      <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto shadow-sm border border-gray-100 rounded-lg">
          <table className="w-full text-left text-sm border-collapse min-w-full">
            <thead className="bg-gray-50 dark:bg-slate-950/50 text-gray-500 dark:text-slate-400 border-b border-gray-200 dark:border-slate-800">
              <tr>
                <th className="px-3 sm:px-6 py-4 font-medium whitespace-nowrap">
                  Pedido
                </th>
                <th className="px-3 sm:px-6 py-4 font-medium whitespace-nowrap hidden sm:table-cell">
                  Cliente
                </th>
                <th className="px-3 sm:px-6 py-4 font-medium whitespace-nowrap">
                  Status
                </th>
                <th className="px-3 sm:px-6 py-4 font-medium whitespace-nowrap hidden md:table-cell">
                  Data
                </th>
                <th className="px-3 sm:px-6 py-4 font-medium text-right whitespace-nowrap">
                  Total
                </th>
                <th className="sticky right-0 z-20 bg-gray-50 dark:bg-slate-950 px-3 sm:px-6 py-4 font-medium text-right shadow-[-5px_0_5px_-5px_rgba(0,0,0,0.1)] w-[80px]">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {processedOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-12 text-center text-gray-500 dark:text-slate-400"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <Package className="h-12 w-12 text-gray-300 dark:text-slate-600 mb-3" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white">
                        Nenhum pedido encontrado
                      </p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        Tente ajustar os filtros de busca.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="group hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                  >
                    <td className="px-3 sm:px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      #{order.display_id}
                      <span className="block text-xs text-gray-400 font-normal mt-0.5">
                        {order.item_count} itens
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-gray-700 dark:text-slate-300 whitespace-nowrap hidden sm:table-cell">
                      <span className="block font-medium truncate max-w-[150px]">
                        {order.client_name_guest || 'Visitante'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {order.client_phone_guest}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-gray-500 dark:text-slate-400 whitespace-nowrap hidden md:table-cell">
                      {new Date(order.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-right font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(order.total_value)}
                    </td>
                    <td className="sticky right-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-gray-50 dark:group-hover:bg-slate-800/50 px-3 sm:px-6 py-4 text-right shadow-[-5px_0_5px_-5px_rgba(0,0,0,0.1)]">
                      <Link
                        href={`/dashboard/orders/${order.display_id}`}
                        className="inline-flex p-2 rounded-lg text-primary hover:bg-primary/10 dark:text-primary/70 dark:hover:bg-primary/20 transition-colors"
                        title="Ver Detalhes"
                      >
                        <ArrowRight size={20} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between bg-gray-50 dark:bg-slate-900/50 text-sm text-gray-500 dark:text-slate-400">
          <p>
            Mostrando {paginatedOrders.length} de {processedOrders.length}{' '}
            pedidos
          </p>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-slate-300 transition-colors"
            >
              <ChevronLeft size={16} /> Anterior
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-slate-300 transition-colors"
            >
              Próxima <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
