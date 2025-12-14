import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  ShoppingBag,
  ArrowLeft,
  Clock,
  Calendar,
  ArrowRight,
  Package,
  Plus,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Rascunhos | Rep-Vendas',
  description: 'Pedidos em andamento que ainda não foram finalizados.',
};

export default async function SavedCartsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Busca apenas pedidos com status 'pending' (Rascunhos)
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar rascunhos:', error);
  }

  const rows = orders || [];

  return (
    <div className="flex flex-col h-[calc(100vh-1rem)] bg-gray-50 dark:bg-slate-950 p-4 md:p-6 overflow-hidden">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-xl shadow-sm">
            <ShoppingBag size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Pedidos em Aberto
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Continue seus rascunhos de onde parou.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            href="/dashboard/orders"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <ArrowLeft size={16} />
            Todos os Pedidos
          </Link>
          <Link
            href="/dashboard/orders/new"
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-md"
          >
            <Plus size={16} />
            Novo Pedido
          </Link>
        </div>
      </div>

      {/* LISTA */}
      <div className="flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-8 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 border-dashed">
            <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <ShoppingBag className="h-8 w-8 text-gray-300" />
            </div>
            <h3 className="text-gray-900 dark:text-white font-medium text-lg">
              Nenhum rascunho encontrado
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 max-w-sm">
              Você não tem pedidos pendentes no momento.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((order) => (
              <Link
                key={order.id}
                href={`/dashboard/orders/${order.display_id}`}
                className="group bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-yellow-300 dark:hover:border-yellow-700 transition-all flex flex-col justify-between h-full"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs font-bold px-2 py-1 rounded-md border border-yellow-200 dark:border-yellow-800">
                        RASCUNHO
                      </span>
                      <span className="text-xs text-gray-400 font-mono">
                        #{order.display_id}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(order.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>

                  <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1 truncate">
                    {order.client_name_guest || 'Cliente não identificado'}
                  </h3>

                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-3">
                    <span className="flex items-center gap-1.5">
                      <Package size={14} />
                      {order.item_count} itens
                    </span>
                    <span className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(order.total_value)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 flex justify-end">
                  <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:gap-2 transition-all">
                    Continuar editando <ArrowRight size={16} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
