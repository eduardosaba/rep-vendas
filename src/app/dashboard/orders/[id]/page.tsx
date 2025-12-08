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
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      icon: Clock,
      label: 'Pendente',
    },
    confirmed: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      icon: ThumbsUp,
      label: 'Confirmado',
    },
    delivered: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      icon: CheckCircle,
      label: 'Entregue',
    },
    cancelled: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      icon: XCircle,
      label: 'Cancelado',
    },
  };

  const current = (styles as any)[getUiStatusKey(status)] || styles.pending;
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

  // 1. Buscar Pedido
  const { data: order, error } = await supabase
    .from('orders')
    .select(`*, order_items (*)`)
    .eq('display_id', displayId)
    .eq('user_id', user.id)
    .single();

  if (error || !order) {
    return notFound();
  }

  // 2. Buscar Configurações (Para o PDF)
  const { data: storeSettings } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // status update is handled by the client component OrderStatusControls

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/orders"
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
              <Calendar size={14} />{' '}
              {new Date(order.created_at).toLocaleString('pt-BR')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Botão PDF (Substitui o Imprimir) */}
          <OrderPdfButton order={order} store={storeSettings} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda: Itens */}
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
                    <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 overflow-hidden border border-gray-200">
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
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

        {/* Coluna Direita: Cliente e Ações Extras */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User size={18} className="text-gray-400" /> Dados do Cliente
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
              {order.client_email_guest && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">
                    Email
                  </label>
                  <p className="text-gray-900 text-sm truncate">
                    {order.client_email_guest}
                  </p>
                </div>
              )}
              {(order.client_cnpj_guest || order.client_document_guest) && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">
                    Documento
                  </label>
                  <p className="text-gray-900 text-sm font-mono">
                    {formatDocument(
                      order.client_cnpj_guest || order.client_document_guest
                    ) ||
                      order.client_cnpj_guest ||
                      order.client_document_guest}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Painel de Gerenciamento */}
          {getUiStatusKey(order.status) !== 'cancelled' &&
            getUiStatusKey(order.status) !== 'delivered' && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-3">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Gerenciar Pedido
                </h3>

                <OrderStatusControls
                  orderId={order.id}
                  statusKey={getUiStatusKey(order.status)}
                />

                <p className="text-xs text-gray-400 text-center pt-2">
                  Ações são irreversíveis.
                </p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
