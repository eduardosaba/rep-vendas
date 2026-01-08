'use client';

import Link from 'next/link';
import { Eye, FileDown } from 'lucide-react';
import { exportDashboardPDF } from '@/lib/exportDashboardPDF';

interface OrderItem {
  id: string;
  quantity: number;
}

interface Order {
  id: string;
  display_id: number;
  client_name_guest: string | null;
  clients?: { name: string } | null;
  total_value: number;
  status: string;
  created_at: string;
  order_items?: OrderItem[];
}

export default function RecentOrdersTable({
  orders,
  store,
  rangeLabel,
}: {
  orders: Order[];
  store: any;
  rangeLabel: string;
}) {
  const handleExport = () => {
    exportDashboardPDF(orders, store, rangeLabel);
  };

  if (!orders || orders.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        Nenhum pedido recente encontrado.
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    Pendente:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    Aprovado:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    Cancelado: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    Enviado:
      'bg-primary/10 text-primary dark:bg-primary/30 dark:text-primary/80',
  };

  return (
    <div className="w-full">
      {/* Botão de Exportação com o Branding */}
      <div className="p-4 flex justify-end bg-gray-50/50 dark:bg-slate-800/30 border-b border-gray-100 dark:border-slate-800">
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 hover:text-primary transition-all shadow-sm active:scale-95"
        >
          <FileDown size={14} />
          Exportar Relatório PDF
        </button>
      </div>

      {/* DESKTOP: tabela tradicional */}
      <div className="hidden md:block overflow-x-auto scrollbar-thin">
        <table
          className="w-full text-left text-sm"
          style={{ minWidth: '600px' }}
        >
          <thead className="bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-800">
            <tr>
              <th className="px-4 sm:px-6 py-4 font-bold uppercase text-[10px] tracking-widest">
                Pedido
              </th>
              <th className="px-4 sm:px-6 py-4 font-bold uppercase text-[10px] tracking-widest">
                Cliente
              </th>
              <th className="px-4 sm:px-6 py-4 font-bold uppercase text-[10px] tracking-widest">
                Valor
              </th>
              <th className="px-4 sm:px-6 py-4 font-bold uppercase text-[10px] tracking-widest text-center">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {orders.map((order) => {
              const clientName =
                order.clients?.name ||
                order.client_name_guest ||
                'Cliente Visitante';
              const totalItems =
                order.order_items?.reduce(
                  (sum, item) => sum + (item.quantity || 0),
                  0
                ) || 0;

              return (
                <tr
                  key={order.id}
                  className="group hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors flex items-center gap-2"
                    >
                      #{order.display_id}
                      <Eye
                        size={14}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-primary"
                      />
                    </Link>
                    <div className="text-[10px] text-gray-400 mt-0.5 font-medium">
                      {new Date(order.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-700 dark:text-slate-200">
                      {clientName}
                    </div>
                    <div className="text-[10px] font-black text-primary/60 uppercase">
                      {totalItems} {totalItems === 1 ? 'unidade' : 'unidades'}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-black text-gray-900 dark:text-white">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(order.total_value)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}
                    >
                      {order.status || 'Pendente'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MOBILE: cards verticais */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {orders.map((order) => {
          const clientName =
            order.clients?.name ||
            order.client_name_guest ||
            'Cliente Visitante';
          const totalItems =
            order.order_items?.reduce(
              (sum, item) => sum + (item.quantity || 0),
              0
            ) || 0;

          return (
            <div
              key={order.id}
              className="p-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/orders/${order.id}`}
                    className="font-bold text-sm text-gray-900 dark:text-white truncate block"
                  >
                    #{order.display_id}
                  </Link>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(order.created_at).toLocaleDateString('pt-BR')}
                  </div>
                  <div className="font-medium text-sm text-gray-700 dark:text-slate-200 mt-2 truncate">
                    {clientName}
                  </div>
                  <div className="text-[10px] text-primary/60 uppercase mt-1">
                    {totalItems} {totalItems === 1 ? 'unidade' : 'unidades'}
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <div className="font-black text-gray-900 dark:text-white">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(order.total_value)}
                  </div>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}
                  >
                    {order.status || 'Pendente'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
