import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  User,
  Phone,
  MapPin,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  Printer,
} from 'lucide-react';
import { updateOrderStatus } from '../actions'; // Importa a action que acabamos de criar

// Componente visual para o Badge de Status
function StatusBadge({ status }: { status: string }) {
  const styles = {
    pending: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      icon: Clock,
      label: 'Pendente',
    },
    confirmed: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      icon: CheckCircle,
      label: 'Confirmado',
    },
    delivered: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      icon: Package,
      label: 'Entregue',
    },
    cancelled: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      icon: XCircle,
      label: 'Cancelado',
    },
  };

  const current = styles[status as keyof typeof styles] || styles.pending;
  const Icon = current.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${current.bg} ${current.text}`}
    >
      <Icon size={14} />
      {current.label}
    </span>
  );
}

export default async function OrderDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const { id } = params;

  // 1. Verificar Autenticação
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // 2. Buscar Pedido + Itens
  const { data: order, error } = await supabase
    .from('orders')
    .select(
      `
      *,
      order_items (*)
    `
    )
    .eq('id', id)
    .eq('user_id', user.id) // Garante que só vê seus pedidos
    .single();

  if (error || !order) {
    return notFound();
  }

  // Ações para os botões (Server Actions wrapper)
  const markAsDelivered = async (formData: FormData) => {
    await updateOrderStatus(order.id, 'delivered');
  };

  const markAsCancelled = async (formData: FormData) => {
    await updateOrderStatus(order.id, 'cancelled');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* --- HEADER --- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                Pedido #{order.display_id}
              </h1>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
              <Calendar size={14} />
              {new Date(order.created_at).toLocaleString('pt-BR')}
            </p>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-2">
          {/* Botão de Imprimir (Simples window.print) */}
          <button
            /* Client-side logic for print would go here, simplified for Server Component */
            className="hidden sm:flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Printer size={16} />
            Imprimir
          </button>

          {order.status === 'pending' && (
            <form action={markAsDelivered}>
              <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm">
                <CheckCircle size={16} />
                Marcar como Entregue
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- COLUNA ESQUERDA: ITENS --- */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h2 className="font-semibold text-gray-900">Itens do Pedido</h2>
              <span className="text-xs font-medium bg-white px-2 py-1 rounded border text-gray-500">
                {order.item_count} itens
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {order.order_items.map((item: any) => (
                <div
                  key={item.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                      <Package size={20} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">
                        Ref: {item.product_reference || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(item.total_price)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.quantity} x{' '}
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(item.unit_price)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-between items-center">
              <span className="font-medium text-gray-600">Total do Pedido</span>
              <span className="text-xl font-bold text-gray-900">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(order.total_value)}
              </span>
            </div>
          </div>
        </div>

        {/* --- COLUNA DIREITA: CLIENTE & INFO --- */}
        <div className="space-y-6">
          {/* Card Cliente */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User size={18} className="text-gray-400" />
              Dados do Cliente
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">
                  Nome
                </label>
                <p className="text-gray-900 font-medium">
                  {order.client_name_guest}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">
                  Contato
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Phone size={16} className="text-green-600" />
                  <a
                    href={`https://wa.me/55${order.client_phone_guest?.replace(/\D/g, '')}`}
                    target="_blank"
                    className="text-indigo-600 hover:underline"
                  >
                    {order.client_phone_guest || 'Não informado'}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Card Ações Perigosas */}
          {order.status !== 'cancelled' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Gerenciar</h3>
              <form action={markAsCancelled}>
                <button className="w-full py-2 px-4 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                  <XCircle size={16} />
                  Cancelar Pedido
                </button>
              </form>
              <p className="text-xs text-gray-400 mt-3 text-center">
                Cancelar o pedido não estorna pagamentos automaticamente.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
