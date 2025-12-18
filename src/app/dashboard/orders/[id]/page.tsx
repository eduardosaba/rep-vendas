import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  User,
  Phone,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  ThumbsUp,
  CreditCard,
  Mail,
  FileText,
} from 'lucide-react';
import OrderStatusControls from '@/components/dashboard/OrderStatusControls';
import { OrderPdfButton } from '@/components/dashboard/OrderPdfButton';
import { getUiStatusKey } from '@/lib/orderStatus';
import { formatDocument } from '@/lib/formatDocument';

// Evita prerendering e fetchs durante o build
export const dynamic = 'force-dynamic';

function StatusBadge({ status }: { status: string }) {
  const styles = {
    pending: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-800 dark:text-yellow-300',
      border: 'border-yellow-200 dark:border-yellow-800',
      icon: Clock,
      label: 'Pendente',
    },
    confirmed: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-800 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800',
      icon: ThumbsUp,
      label: 'Confirmado',
    },
    delivered: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-800 dark:text-green-300',
      border: 'border-green-200 dark:border-green-800',
      icon: CheckCircle,
      label: 'Entregue',
    },
    cancelled: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-800 dark:text-red-300',
      border: 'border-red-200 dark:border-red-800',
      icon: XCircle,
      label: 'Cancelado',
    },
  };

  const current = (styles as any)[getUiStatusKey(status)] || styles.pending;
  const Icon = current.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${current.bg} ${current.text} ${current.border}`}
    >
      <Icon size={14} />
      {current.label}
    </span>
  );
}

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { id } = await params;

  // `id` no caminho agora representa `display_id` (ID curto mostrado ao usuário)
  const displayId = Number(id);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // 1. Buscar Pedido com Joins
  const { data: order, error } = await supabase
    .from('orders')
    .select(`*, order_items (*)`)
    .eq('display_id', displayId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !order) {
    return notFound();
  }

  // 2. Buscar Configurações (Para o PDF) - com resiliência .maybeSingle()
  const { data: storeSettings } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  // Fallback para settings padrão se não existir
  const safeSettings = storeSettings || {
    name: 'Loja',
    primary_color: '#4f46e5',
    secondary_color: '#64748b',
  };

  const statusKey = getUiStatusKey(order.status);

  return (
    <div className="flex flex-col min-h-[calc(100vh-1rem)] bg-gray-50 dark:bg-slate-950 p-4 md:p-6 overflow-hidden">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/orders"
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Pedido #{order.display_id}
              </h1>
              <StatusBadge status={order.status} />
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                {new Date(order.created_at).toLocaleString('pt-BR')}
              </span>
              {order.payment_method && (
                <span className="flex items-center gap-1.5 capitalize">
                  <CreditCard size={14} />
                  {order.payment_method}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <OrderPdfButton order={order} store={safeSettings} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUNA ESQUERDA: ITENS */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 flex justify-between items-center">
              <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Package size={18} /> Itens do Pedido
              </h2>
              <span className="text-xs font-bold bg-white dark:bg-slate-800 px-2 py-1 rounded border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300">
                {order.item_count} {order.item_count === 1 ? 'item' : 'itens'}
              </span>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {order.order_items.map((item: any) => (
                <div
                  key={item.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-gray-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-gray-400 dark:text-gray-500 overflow-hidden border border-gray-200 dark:border-slate-700 shrink-0">
                      {item.image_url ? (
                         
                        <img
                          src={item.image_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package size={20} />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white line-clamp-1">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                        Ref: {item.product_reference || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right pl-4">
                    <p className="font-bold text-gray-900 dark:text-white">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(item.total_price)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
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

            <div className="bg-gray-50 dark:bg-slate-900/50 px-6 py-4 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center">
              <span className="font-medium text-gray-600 dark:text-gray-400">
                Total do Pedido
              </span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(order.total_value)}
              </span>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: CLIENTE E AÇÕES */}
        <div className="space-y-6">
          {/* Dados do Cliente */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-slate-800">
              <User size={18} className="text-blue-600 dark:text-blue-400" />{' '}
              Dados do Cliente
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Nome
                </label>
                <p className="text-gray-900 dark:text-white font-medium text-lg">
                  {order.client_name_guest || 'Cliente não identificado'}
                </p>
              </div>

              {(order.client_phone_guest || order.client_email_guest) && (
                <div className="grid grid-cols-1 gap-3">
                  {order.client_phone_guest && (
                    <div>
                      <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        Contato
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <a
                          href={`https://wa.me/55${order.client_phone_guest.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 text-sm font-medium text-green-600 hover:text-green-700 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-lg transition-colors w-full"
                        >
                          <Phone size={14} />
                          {order.client_phone_guest}
                        </a>
                      </div>
                    </div>
                  )}

                  {order.client_email_guest && (
                    <div>
                      <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        Email
                      </label>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-700 dark:text-gray-300">
                        <Mail size={14} />
                        <span className="truncate">
                          {order.client_email_guest}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(order.client_cnpj_guest || order.client_document_guest) && (
                <div className="pt-2 border-t border-gray-100 dark:border-slate-800 mt-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <FileText size={12} />
                    <span className="font-mono">
                      {formatDocument(
                        order.client_cnpj_guest || order.client_document_guest
                      ) ||
                        order.client_cnpj_guest ||
                        order.client_document_guest}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Painel de Gerenciamento (Ações) */}
          {statusKey !== 'cancelled' && statusKey !== 'delivered' && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <CheckCircle
                  size={18}
                  className="text-green-600 dark:text-green-400"
                />
                Ações do Pedido
              </h3>

              <OrderStatusControls orderId={order.id} statusKey={statusKey} />

              <p className="text-xs text-gray-400 dark:text-gray-500 text-center pt-3 border-t border-gray-100 dark:border-slate-800 mt-4">
                Ações de status atualizam o estoque e notificam (se
                configurado).
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
