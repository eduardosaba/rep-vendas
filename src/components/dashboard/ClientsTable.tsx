'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  User,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Star,
  ArrowRight,
  X,
  MessageCircle,
  Mail as MailIcon,
  Package,
  Loader2,
} from 'lucide-react';

interface Order {
  id: number;
  display_id: number;
  created_at: string;
  status: string;
  total_value: number;
  item_count: number;
  client_name_guest: string | null;
  client_phone_guest: string | null;
  client_email_guest?: string | null;
  client_id?: string | null;
  clients?: { name?: string; email?: string; phone?: string } | null;
}

interface ClientProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  totalSpent: number;
  orderCount: number;
  lastOrderDate: string;
  firstOrderDate: string;
  isGuest: boolean;
  orders: Order[];
}

export function ClientsTable({ initialOrders }: { initialOrders: Order[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<
    'totalSpent' | 'lastOrderDate' | 'orderCount'
  >('lastOrderDate');
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(
    null
  );

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const clientsData = useMemo(() => {
    const map = new Map<string, ClientProfile>();

    initialOrders.forEach((order) => {
      const dbClient = order.clients;
      const rawName =
        dbClient?.name || order.client_name_guest || 'Cliente Sem Nome';
      const rawPhone = dbClient?.phone || order.client_phone_guest || '';
      const rawEmail = dbClient?.email || order.client_email_guest || '';
      const isGuest = !order.client_id;

      let key = '';
      if (order.client_id) key = `reg_${order.client_id}`;
      else if (rawPhone) key = `guest_ph_${rawPhone.replace(/\D/g, '')}`;
      else key = `guest_nm_${rawName.toLowerCase().trim()}`;

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: rawName,
          phone: rawPhone,
          email: rawEmail,
          totalSpent: 0,
          orderCount: 0,
          lastOrderDate: order.created_at,
          firstOrderDate: order.created_at,
          isGuest,
          orders: [],
        });
      }

      const client = map.get(key)!;
      if (order.status !== 'cancelled') {
        client.totalSpent += order.total_value || 0;
        client.orderCount += 1;
      }
      if (new Date(order.created_at) > new Date(client.lastOrderDate))
        client.lastOrderDate = order.created_at;
      if (new Date(order.created_at) < new Date(client.firstOrderDate))
        client.firstOrderDate = order.created_at;
      client.orders.push(order);
    });

    let array = Array.from(map.values());

    if (searchTerm) {
      const lt = searchTerm.toLowerCase();
      array = array.filter(
        (c) =>
          c.name.toLowerCase().includes(lt) ||
          (c.phone || '').includes(lt) ||
          (c.email || '').toLowerCase().includes(lt)
      );
    }

    array.sort((a, b) => {
      if (sortKey === 'totalSpent') return b.totalSpent - a.totalSpent;
      if (sortKey === 'orderCount') return b.orderCount - a.orderCount;
      return (
        new Date(b.lastOrderDate).getTime() -
        new Date(a.lastOrderDate).getTime()
      );
    });

    return array;
  }, [initialOrders, searchTerm, sortKey]);

  const kpis = useMemo(() => {
    const totalClients = clientsData.length;
    const activeClients = clientsData.filter((c) => {
      const days =
        (Date.now() - new Date(c.lastOrderDate).getTime()) / (1000 * 3600 * 24);
      return days <= 30;
    }).length;
    const vipCount = Math.max(1, Math.ceil(totalClients * 0.1));
    const topClientsValue = [...clientsData]
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, vipCount)
      .reduce((acc, c) => acc + c.totalSpent, 0);
    return { totalClients, activeClients, topClientsValue };
  }, [clientsData]);

  const totalPages = Math.max(1, Math.ceil(clientsData.length / itemsPerPage));
  const paginatedClients = clientsData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

  return (
    <div className="space-y-6 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full">
            <User size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase">
              Base de Clientes
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {kpis.totalClients}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-full">
            <ShoppingBag size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase">
              Clientes Ativos (30d)
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {kpis.activeClients}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-yellow-50 text-yellow-600 rounded-full">
            <Star size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase">
              Receita VIP (Top 10%)
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(kpis.topClientsValue)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            href="/dashboard/clients/new"
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap"
          >
            <User size={18} /> Novo Cliente
          </Link>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as any)}
            className="p-2.5 border border-gray-200 rounded-lg text-sm bg-white outline-none cursor-pointer"
          >
            <option value="lastOrderDate">Recentes</option>
            <option value="totalSpent">Maior Valor (LTV)</option>
            <option value="orderCount">Frequência</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="hidden md:block w-full overflow-x-auto scrollbar-thin shadow-sm border border-gray-100 rounded-lg">
          <table
            className="w-full text-left text-sm"
            style={{ minWidth: '800px' }}
          >
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-3 sm:px-6 py-4 font-medium min-w-[180px]">
                  Cliente
                </th>
                <th className="px-3 sm:px-6 py-4 font-medium min-w-[120px]">
                  Contato
                </th>
                <th className="px-3 sm:px-6 py-4 font-medium min-w-[120px]">
                  Total Gasto (LTV)
                </th>
                <th className="px-3 sm:px-6 py-4 font-medium min-w-[80px]">
                  Pedidos
                </th>
                <th className="px-3 sm:px-6 py-4 font-medium min-w-[120px]">
                  Última Compra
                </th>
                <th className="px-3 sm:px-6 py-4 text-right sticky right-0 bg-gray-50 shadow-[-5px_0_5px_-5px_rgba(0,0,0,0.1)] min-w-[100px]">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-500">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              ) : (
                paginatedClients.map((client) => (
                  <tr
                    key={client.id}
                    className="hover:bg-gray-50 transition-colors group"
                  >
                    <td className="px-3 sm:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {client.name}
                          </p>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded border ${client.isGuest ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}
                            >
                              {client.isGuest ? 'Visitante' : 'Cadastrado'}
                            </span>
                            <p className="text-xs text-gray-400">
                              Desde {formatDate(client.firstOrderDate)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {client.phone ? (
                          <a
                            href={`https://wa.me/55${client.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            className="flex items-center gap-1.5 text-gray-600 hover:text-green-600 transition-colors"
                          >
                            <MessageCircle size={14} /> {client.phone}
                          </a>
                        ) : (
                          <span className="text-gray-400 text-xs">
                            Sem telefone
                          </span>
                        )}
                        {client.email && (
                          <span className="text-gray-500 text-xs flex items-center gap-1">
                            <MailIcon size={12} /> {client.email}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 font-bold text-gray-900">
                      {formatCurrency(client.totalSpent)}
                    </td>
                    <td className="px-3 sm:px-6 py-4">
                      <span className="bg-gray-100 text-gray-600 py-1 px-2.5 rounded-full text-xs font-bold">
                        {client.orderCount}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-gray-500">
                      {formatDate(client.lastOrderDate)}
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-right sticky right-0 bg-white group-hover:bg-gray-50 shadow-[-5px_0_5px_-5px_rgba(0,0,0,0.1)]">
                      <button
                        onClick={() => setSelectedClient(client)}
                        className="text-[var(--primary)] hover:bg-[var(--primary)]/10 p-2 rounded-lg transition-colors font-medium text-sm inline-flex items-center gap-1"
                      >
                        Ver Detalhes <ArrowRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="grid md:hidden p-4 gap-4">
          {paginatedClients.length === 0 ? (
            <div className="p-6 text-center text-gray-500 bg-white rounded-lg border border-gray-100">
              Nenhum cliente encontrado.
            </div>
          ) : (
            paginatedClients.map((client) => (
              <div
                key={client.id}
                className="p-4 bg-white border border-gray-100 rounded-lg shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-gray-900">
                          {client.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded border ${client.isGuest ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}
                          >
                            {client.isGuest ? 'Visitante' : 'Cadastrado'}
                          </span>
                          <p className="text-xs text-gray-400">
                            Desde {formatDate(client.firstOrderDate)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          {formatCurrency(client.totalSpent)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {client.orderCount} pedidos
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      {client.phone ? (
                        <a
                          href={`https://wa.me/55${client.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          className="flex items-center gap-2 text-sm text-gray-600 hover:text-green-600"
                        >
                          <MessageCircle size={14} /> {client.phone}
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400 italic">
                          Sem telefone
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <button
                        onClick={() => setSelectedClient(client)}
                        className="px-3 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium"
                      >
                        Ver Detalhes
                      </button>
                      <Link
                        href={`/dashboard/clients/${client.id}`}
                        className="text-sm text-gray-500 hover:text-[var(--primary)]"
                      >
                        Abrir
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-between items-center">
          <span className="text-sm text-gray-500">
            Mostrando {paginatedClients.length} de {clientsData.length} clientes
          </span>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="p-2 border rounded bg-white disabled:opacity-50 hover:bg-gray-50"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="p-2 border rounded bg-white disabled:opacity-50 hover:bg-gray-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {selectedClient && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center md:justify-end">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedClient(null)}
          />
          <div className="relative w-full md:max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-gray-200 dark:border-slate-800 flex justify-between items-start bg-gray-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-white dark:bg-slate-700 border-4 border-white dark:border-slate-600 shadow-sm flex items-center justify-center text-2xl font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                  {selectedClient.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedClient.name}
                  </h2>
                  <div className="flex gap-2 mt-1">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${selectedClient.isGuest ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}`}
                    >
                      {selectedClient.isGuest ? 'Visitante' : 'Cadastrado'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedClient(null)}
                className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-full text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-900/30 text-center">
                  <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase">
                    Total Gasto
                  </p>
                  <p className="text-xl font-bold text-green-800 dark:text-green-300 mt-1">
                    {formatCurrency(selectedClient.totalSpent)}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30 text-center">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">
                    Pedidos
                  </p>
                  <p className="text-xl font-bold text-blue-800 dark:text-blue-300 mt-1">
                    {selectedClient.orderCount}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-slate-700 pb-2">
                  Contatos
                </h3>
                {selectedClient.phone ? (
                  <a
                    href={`https://wa.me/55${selectedClient.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    className="flex items-center gap-3 p-3 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors group"
                  >
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full group-hover:bg-green-200 dark:group-hover:bg-green-900/50">
                      <MessageCircle size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        WhatsApp
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedClient.phone}
                      </p>
                    </div>
                    <ArrowRight
                      size={16}
                      className="ml-auto text-gray-300 dark:text-gray-600 group-hover:text-green-600 dark:group-hover:text-green-400"
                    />
                  </a>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                    Sem telefone
                  </p>
                )}
                {selectedClient.email && (
                  <div className="flex items-center gap-3 p-3 border border-gray-200 dark:border-slate-700 rounded-lg">
                    <div className="p-2 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 rounded-full">
                      <MailIcon size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Email
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedClient.email}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-slate-700 pb-2 mb-4 flex items-center justify-between">
                  Histórico{' '}
                  <span className="text-xs bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-full text-gray-600 dark:text-gray-400">
                    {selectedClient.orders.length}
                  </span>
                </h3>
                <div className="space-y-3">
                  {selectedClient.orders
                    .sort(
                      (a, b) =>
                        new Date(b.created_at).getTime() -
                        new Date(a.created_at).getTime()
                    )
                    .map((order) => (
                      <Link
                        key={order.id}
                        href={`/dashboard/orders/${order.id}`}
                        className="block group"
                      >
                        <div className="p-4 border border-gray-200 dark:border-slate-700 rounded-xl hover:border-[var(--primary)]/50 hover:shadow-md transition-all bg-white dark:bg-slate-800/50">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="font-bold text-[var(--primary)] text-sm">
                                Pedido #{order.display_id}
                              </span>
                              <p className="text-xs text-gray-400 dark:text-gray-500">
                                {formatDate(order.created_at)}
                              </p>
                            </div>
                            <span
                              className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
                            >
                              {order.status}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Package size={14} /> {order.item_count} itens
                            </span>
                            <span className="font-bold text-gray-900 dark:text-white">
                              {formatCurrency(order.total_value)}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
