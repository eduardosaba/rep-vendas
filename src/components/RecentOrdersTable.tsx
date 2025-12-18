'use client';

import Link from 'next/link';
import { Eye } from 'lucide-react';

interface Order {
  id: string;
  display_id: number;
  client_name_guest: string | null;
  total_value: number;
  status: string;
  created_at: string;
  item_count: number;
}

export default function RecentOrdersTable({ orders }: { orders: Order[] }) {
  if (!orders || orders.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        Nenhum pedido recente encontrado.
      </div>
    );
  }

  // Mapa de cores para status
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
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-800">
          <tr>
            <th className="px-6 py-4 font-medium">Pedido</th>
            <th className="px-6 py-4 font-medium">Cliente</th>
            <th className="px-6 py-4 font-medium">Valor</th>
            <th className="px-6 py-4 font-medium text-center">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
          {orders.map((order) => (
            <tr
              key={order.id}
              className="group hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <td className="px-6 py-4">
                <Link
                  href={`/dashboard/orders/${order.id}`}
                  className="font-bold text-gray-900 dark:text-white group-hover:text-primary dark:group-hover:text-primary transition-colors flex items-center gap-2"
                >
                  #{order.display_id}
                  <Eye
                    size={14}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-primary"
                  />
                </Link>
                <div className="text-xs text-gray-400 mt-0.5">
                  {new Date(order.created_at).toLocaleDateString('pt-BR')}
                </div>
              </td>
              <td className="px-6 py-4 text-gray-600 dark:text-slate-300">
                {order.client_name_guest || 'Cliente Visitante'}
                <div className="text-xs text-gray-400">
                  {order.item_count} {order.item_count === 1 ? 'item' : 'itens'}
                </div>
              </td>
              <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(order.total_value)}
              </td>
              <td className="px-6 py-4 text-center">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    statusColors[order.status] || 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {order.status || 'Pendente'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
