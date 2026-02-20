"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  RefreshCcw,
  ShoppingBag,
  Clock,
  ArrowRight,
  ArrowLeft,
  Package,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getUiStatusKey } from "@/lib/orderStatus";

export interface Order {
  id: string | number;
  display_id: number;
  created_at: string;
  status: string;
  total_value: number;
  item_count: number;     // Quantidade de SKUs/Linhas
  total_qty?: number;     // QUANTIDADE TOTAL DE PEÇAS (Soma das colunas quantity)
  brands?: string;        // Marcas formatadas
  client_name_guest: string;    // Já mapeado no servidor
  client_phone_guest: string;
  order_items?: any[];
}

interface OrdersTableProps {
  initialOrders: any[];
}

export function OrdersTable({ initialOrders }: OrdersTableProps) {
  const [orders] = useState<Order[]>(initialOrders || []);
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ status: "all", startDate: "", endDate: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ... (Mantenha os useMemo de kpis e processedOrders iguais ao seu código original)
  const kpis = useMemo(() => {
    const totalOrders = orders.length;
    const validOrders = orders.filter((o) => getUiStatusKey(o.status) !== "cancelled");
    const totalRevenue = validOrders.reduce((acc, o) => acc + (o.total_value || 0), 0);
    const pendingOrders = orders.filter((o) => getUiStatusKey(o.status) === "pending").length;
    const averageTicket = validOrders.length > 0 ? totalRevenue / validOrders.length : 0;
    return { totalOrders, totalRevenue, pendingOrders, averageTicket };
  }, [orders]);

  const processedOrders = useMemo(() => {
    const q = (searchTerm || "").toLowerCase();
    return orders.filter((o) => {
      const matchesSearch =
        (o.client_name_guest || "").toLowerCase().includes(q) ||
        String(o.display_id).includes(q) ||
        (o.client_phone_guest || "").includes(q);
      const matchesStatus = filters.status === "all" || getUiStatusKey(o.status) === filters.status;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, filters]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(processedOrders.length / itemsPerPage)), [processedOrders.length, itemsPerPage]);

  const paginatedOrders = processedOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusBadge = (status: string) => {
    const key = getUiStatusKey(status);
    const labels: Record<string, string> = { pending: "Pendente", confirmed: "Confirmado", delivered: "Entregue", cancelled: "Cancelado" };
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${styles[key]}`}>{labels[key] || key}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho de busca e configuração de página */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Search size={16} className="text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Buscar por cliente, ID ou telefone"
            className="border rounded px-3 py-2 text-sm w-[320px] bg-white dark:bg-slate-900"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-500">Mostrar</div>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border rounded px-2 py-1 text-sm bg-white dark:bg-slate-900"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <div className="text-sm text-slate-500">de {processedOrders.length} pedidos</div>
        </div>
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b">
            <tr>
              <th className="px-4 py-4">Pedido / Marcas</th>
              <th className="px-4 py-4">Cliente</th>
              <th className="px-4 py-4 text-center">Peças</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-4 py-4 text-right">Total</th>
              <th className="px-4 py-4 text-center">Ver</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedOrders.map((order) => (
              <tr
                key={order.id}
                className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") router.push(`/dashboard/orders/${order.id}`);
                }}
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    {/* Ícone fixo em vez de imagem vazia */}
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <Package size={20} />
                    </div>
                    <div>
                      <Link href={`/dashboard/orders/${order.id}`} className="font-bold text-slate-900 hover:underline" onClick={(e) => e.stopPropagation()}>#{order.display_id}</Link>
                      <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                        {order.brands || "Sem marca"}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="font-medium text-slate-700">{order.client_name_guest}</div>
                  <div className="text-xs text-slate-400">{order.client_phone_guest}</div>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md text-xs">
                    {order.total_qty || order.item_count}
                  </span>
                </td>
                <td className="px-4 py-4">{getStatusBadge(order.status)}</td>
                <td className="px-4 py-4 text-right font-black text-slate-900">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(order.total_value)}
                </td>
                <td className="px-4 py-4 text-center">
                  <Link href={`/dashboard/orders/${order.id}`} onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">
                      <ArrowRight size={18} />
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile: cards */}
      <div className="md:hidden px-3">
        {paginatedOrders.length === 0 ? (
          <div className="p-6 text-center text-gray-500">Nenhum pedido encontrado.</div>
        ) : (
          <div className="space-y-3">
            {paginatedOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-4 shadow-sm cursor-pointer"
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') router.push(`/dashboard/orders/${order.id}`); }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                      <Package size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">#{order.display_id} — {order.brands || 'Sem marca'}</div>
                      <div className="text-xs text-slate-500 truncate">{order.client_name_guest}</div>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-2">
                    <div className="text-xs text-slate-500">{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(order.created_at))}</div>
                    <div className="flex items-center gap-2">
                      <div>{getStatusBadge(order.status)}</div>
                      <div className="font-black text-slate-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_value)}</div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs text-slate-500">Peças: <span className="font-bold text-slate-700">{order.total_qty || order.item_count}</span></div>
                  <div>
                    <Link href={`/dashboard/orders/${order.id}`} onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">Ver</Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Paginação */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="text-sm text-slate-500">Mostrando {paginatedOrders.length} de {processedOrders.length}</div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
            <ArrowLeft size={16} /> Anterior
          </Button>
          <div className="text-sm text-slate-700">Página {currentPage} / {totalPages}</div>
          <Button variant="ghost" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
            Próxima <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}