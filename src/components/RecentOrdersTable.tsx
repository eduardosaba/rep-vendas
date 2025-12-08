import Link from 'next/link';
import {
  ArrowUpRight,
  Clock,
  CheckCircle,
  XCircle,
  Package,
} from 'lucide-react';
import { getUiStatusKey } from '@/lib/orderStatus';

// Definimos a interface com os dados REAIS que vêm do banco
interface Order {
  id: string;
  display_id: number; // O ID curto (ex: 123)
  client_name_guest: string; // Nome do cliente
  total_value: number;
  status: string; // 'pending', 'confirmed', etc.
  created_at: string;
  item_count: number;
  pdf_url?: string | null;
}

interface RecentOrdersTableProps {
  orders: Order[];
}

export default function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  // Função auxiliar para formatar o status
  const getStatusStyle = (status: string) => {
    const key = getUiStatusKey(status);
    switch (key) {
      case 'confirmed':
        return {
          bg: 'bg-green-100',
          text: 'text-green-700',
          icon: CheckCircle,
          label: 'Confirmado',
        };
      case 'cancelled':
        return {
          bg: 'bg-red-100',
          text: 'text-red-700',
          icon: XCircle,
          label: 'Cancelado',
        };
      case 'delivered':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-700',
          icon: Package,
          label: 'Entregue',
        };
      default: // pending
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          icon: Clock,
          label: 'Pendente',
        };
    }
  };

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h3 className="font-semibold text-gray-900">Pedidos Recentes</h3>
        <Link
          href="/dashboard/orders" // Link para a página completa de pedidos (futura)
          className="flex items-center gap-1 text-sm font-medium rv-text-primary rv-text-primary-hover"
        >
          Ver todos <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-6 py-3 font-medium">Pedido</th>
              <th className="px-6 py-3 font-medium">Cliente</th>
              <th className="px-6 py-3 font-medium">Valor</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">PDF</th>
              <th className="px-6 py-3 font-medium">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  Nenhum pedido recebido ainda.
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const statusStyle = getStatusStyle(order.status);
                const StatusIcon = statusStyle.icon;

                return (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">
                      #{order.display_id}
                      <span className="block text-xs text-gray-500 font-normal mt-0.5">
                        {order.item_count}{' '}
                        {order.item_count === 1 ? 'item' : 'itens'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {order.client_name_guest}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(order.total_value)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
                      >
                        <StatusIcon size={12} />
                        {statusStyle.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {order.pdf_url ? (
                        <a
                          href={order.pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rv-text-primary hover:underline text-sm font-medium"
                        >
                          Ver PDF
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(order.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
