'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Edit, Eye, MoreHorizontal, Loader2 } from 'lucide-react';

interface Order {
  id: string;
  customer_name: string;
  created_at: string;
  total_amount: number;
  status: 'Pendente' | 'Pago' | 'Cancelado';
}

export default function OrdersTableRealtime({ userId }: { userId?: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchOrders = async () => {
    try {
      setLoading(true);
      let query: any = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (userId) query = query.eq('user_id', userId);

      const { data, error } = await query;
      if (error) {
        console.error('Erro ao buscar pedidos:', error);
        setOrders([]);
      } else {
        setOrders((data || []) as Order[]);
      }
    } catch (err) {
      console.error(err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    fetchOrders();

    const channel: any = supabase
      .channel('orders_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload: any) => {
          // Para simplicidade e consistência, buscamos novamente.
          // Em uso intensivo, podemos atualizar `orders` localmente
          // com base em payload.eventType (INSERT/UPDATE/DELETE).
          if (!mounted) return;
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        // fallback: se removeChannel não existir
        try {
          channel.unsubscribe?.();
        } catch (er) {
          // ignore
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (loading) return <SkeletonTable />;

  return (
    <div className="w-full animate-in fade-in duration-500">
      {/* Tabela Desktop */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:bg-slate-900 dark:border-slate-800">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
          <thead className="bg-gray-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-500">
                Pedido
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-500">
                Cliente
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-500">
                Valor
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-500">
                Status
              </th>
              <th className="px-6 py-4 text-right text-xs font-bold uppercase text-gray-500">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
            {orders.map((order) => (
              <tr
                key={order.id}
                className="hover:bg-gray-50 dark:hover:bg-slate-800/30"
              >
                <td className="px-6 py-4 text-sm font-bold">
                  #{order.id.slice(0, 5)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">
                  {order.customer_name}
                </td>
                <td className="px-6 py-4 text-sm font-black">
                  R$ {order.total_amount.toLocaleString('pt-BR')}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full">
                    <MoreHorizontal size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards Mobile */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {orders.map((order) => (
          <div
            key={order.id}
            className="p-4 bg-white dark:bg-slate-900 border rounded-xl shadow-sm"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-sm">#{order.id.slice(0, 5)}</span>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-sm font-medium mb-1">{order.customer_name}</p>
            <div className="flex justify-between items-center">
              <span className="text-lg font-black text-[var(--primary)]">
                R$ {order.total_amount.toLocaleString('pt-BR')}
              </span>
              <button className="flex items-center gap-1 text-xs font-bold bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                <Eye size={14} /> Detalhes
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Componente de Skeleton para um Carregamento Elegante
function SkeletonTable() {
  return (
    <div className="w-full space-y-4 animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="h-20 bg-gray-100 dark:bg-slate-800 rounded-xl"
        />
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: Order['status'] }) {
  const styles: Record<string, string> = {
    Pago: 'bg-green-100 text-green-700',
    Pendente: 'bg-amber-100 text-amber-700',
    Cancelado: 'bg-red-100 text-red-700',
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${styles[status]}`}
    >
      {status}
    </span>
  );
}
