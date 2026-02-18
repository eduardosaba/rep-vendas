import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getServerUserFallback } from '@/lib/supabase/getServerUserFallback';
import { getActiveUserId } from '@/lib/auth-utils';
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
  MapPin,
  Hash,
  Tag,
} from 'lucide-react';
import OrderStatusControls from '@/components/dashboard/OrderStatusControls';
import { OrderPdfButton } from '@/components/dashboard/OrderPdfButton';
import { getUiStatusKey } from '@/lib/orderStatus';
import { formatDocument } from '@/lib/formatDocument';

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

  const activeUserId = await getActiveUserId();
  let finalUserId = activeUserId;
  if (!finalUserId) {
    try {
      const fb = await getServerUserFallback();
      if (!fb) return redirect('/login');
      finalUserId = fb.id;
    } catch (e) {
      return redirect('/login');
    }
  }

  const isDisplayId = /^\d+$/.test(id);

  let query = supabase
    .from('orders')
    .select(
      `
      *,
      clients (*),
      order_items (
        *,
        products ( reference_code, image_url, brand, barcode, name ) 
      )
    `
    )
    .eq('user_id', finalUserId);

  if (isDisplayId) {
    query = query.eq('display_id', parseInt(id));
  } else {
    query = query.eq('id', id);
  }

  const { data: order, error } = await query.maybeSingle();

  if (error) {
    console.error('Erro ao buscar pedido:', error.message);
    return (
      <div className="p-8 text-center text-red-500">
        <h2 className="font-bold">Erro ao carregar pedido</h2>
        <p className="text-xs mt-2 text-gray-400">{error.message}</p>
      </div>
    );
  }

  if (!order) return notFound();

  // Settings
  const { data: storeSettings } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', finalUserId)
    .maybeSingle();

  const safeSettings = storeSettings || {
    name: 'Loja',
    primary_color: '#4f46e5',
  };
  const statusKey = getUiStatusKey(order.status);

  // Cliente
  const clientData = Array.isArray(order.clients)
    ? order.clients[0]
    : order.clients;
  const clientName =
    clientData?.name || order.client_name_guest || 'Cliente não identificado';
  const clientPhone = clientData?.phone || order.client_phone_guest;
  const clientEmail = clientData?.email || order.client_email_guest;

  // LÓGICA DO DOCUMENTO (Prioriza client_cnpj_guest)
  const clientDoc =
    order.client_cnpj_guest ||
    clientData?.document ||
    order.client_document_guest;

  const clientAddress = clientData?.address || order.client_address_guest;

  // Total
  const calculatedTotal =
    order.order_items?.reduce((acc: number, item: any) => {
      return acc + (item.quantity || 0) * (item.unit_price || 0);
    }, 0) || 0;

  return (
    <div className="flex flex-col min-h-[calc(100vh-1rem)] bg-gray-50 dark:bg-slate-950 p-4 md:p-6 overflow-hidden animate-in fade-in">
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
                Pedido #{order.display_id || order.id.slice(0, 8)}
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
                  <CreditCard size={14} /> {order.payment_method}
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
                {order.order_items?.reduce(
                  (acc: number, item: any) => acc + (item.quantity || 0),
                  0
                ) || 0}{' '}
                un.
              </span>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {order.order_items?.map((item: any) => {
                const finalImg = item.image_url || item.products?.image_url;
                              const safeImg = (url: string | null | undefined) => {
                                if (!url) return null;
                                try {
                                  if (url.includes('/storage/v1/object/public/')) {
                                    const parts = url.split('/storage/v1/object/public/');
                                    const path = parts.length > 1 ? parts[1] : parts[0];
                                    return `/api/storage-image?path=${encodeURIComponent(path)}`;
                                  }
                                } catch (e) {}
                                return url;
                              };
                const productName = item.products?.name || item.product_name;
                const brand = item.products?.brand;
                const barcode = item.products?.barcode;
                const refCode =
                  item.products?.reference_code || item.product_reference;

                const realTotal = (item.quantity || 0) * (item.unit_price || 0);

                return (
                  <div
                    key={item.id}
                    className="p-4 md:p-6 flex flex-col md:flex-row md:items-start justify-between hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors gap-4"
                  >
                    {/* ESQUERDA: FOTO E DETALHES */}
                    <div className="flex items-start gap-4 flex-1">
                      {/* 1. Imagem */}
                      <div className="h-20 w-20 md:h-24 md:w-24 bg-gray-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-gray-400 dark:text-gray-500 overflow-hidden border border-gray-200 dark:border-slate-700 shrink-0">
                        {finalImg ? (
                          <img
                            src={safeImg(finalImg) || ''}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package size={28} />
                        )}
                      </div>

                      {/* 2. Dados do Produto */}
                      <div className="flex-1 min-w-0 flex flex-col h-full pt-0.5 space-y-2">
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white text-base leading-tight">
                            {productName}
                          </p>

                          {brand && (
                            <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-700 uppercase tracking-wide">
                              <Tag size={10} /> {brand}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 mt-auto">
                          {refCode && (
                            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                              <Hash
                                size={14}
                                className="text-[var(--primary)]"
                              />
                              <span>{refCode}</span>
                            </div>
                          )}

                          {barcode && (
                            <div
                              className="bg-white p-1 rounded border border-gray-200 shadow-sm"
                              title={`EAN: ${barcode}`}
                            >
                              <img
                                src={`https://bwipjs-api.metafloor.com/?bcid=ean13&text=${barcode}&scale=2&height=8&includetext&guardwhitespace`}
                                alt={barcode}
                                className="h-8 md:h-10 object-contain max-w-[140px]"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* DIREITA: VALORES */}
                    <div className="flex flex-row md:flex-col justify-between md:justify-start items-center md:items-end pl-0 md:pl-4 min-w-[120px] border-t md:border-0 border-gray-100 dark:border-slate-800 pt-3 md:pt-1 mt-2 md:mt-0">
                      <div className="text-left md:text-right">
                        <span className="text-[10px] text-gray-400 uppercase md:hidden block mb-1">
                          Valor Total
                        </span>
                        <p className="font-bold text-gray-900 dark:text-white text-lg md:text-xl">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(realTotal)}
                        </p>
                      </div>

                      <div className="text-right mt-0 md:mt-1">
                        <span className="text-[10px] text-gray-400 uppercase md:hidden block mb-1">
                          Qtd x Unit
                        </span>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                          {item.quantity} un. x{' '}
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(item.unit_price)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-gray-50 dark:bg-slate-900/50 px-6 py-4 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center">
              <span className="font-medium text-gray-600 dark:text-gray-400">
                Total do Pedido
              </span>
              <span className="text-2xl md:text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(calculatedTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: CLIENTE */}
        <div className="space-y-6">
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
                <p className="text-gray-900 dark:text-white font-medium text-lg break-words">
                  {clientName}
                </p>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${order.client_id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
                >
                  {order.client_id ? 'Cadastrado' : 'Visitante'}
                </span>
              </div>

              {(clientPhone || clientEmail) && (
                <div className="grid grid-cols-1 gap-3">
                  {clientPhone && (
                    <div>
                      <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        Contato
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <a
                          href={`https://wa.me/55${clientPhone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 text-sm font-medium text-green-600 hover:text-green-700 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-lg transition-colors w-full"
                        >
                          <Phone size={14} /> {clientPhone}
                        </a>
                      </div>
                    </div>
                  )}

                  {clientEmail && (
                    <div>
                      <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        Email
                      </label>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-700 dark:text-gray-300">
                        <Mail size={14} />
                        <span className="truncate">{clientEmail}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CORREÇÃO NA EXIBIÇÃO: Mostra sempre se tiver dado, com rótulo explícito */}
              {clientDoc ? (
                <div className="pt-2 border-t border-gray-100 dark:border-slate-800 mt-2">
                  <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1">
                    CPF/CNPJ
                  </label>
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <FileText size={14} />
                    <span className="font-mono">
                      {formatDocument(clientDoc) || clientDoc}
                    </span>
                  </div>
                </div>
              ) : (
                // Opcional: Mostrar que não tem documento cadastrado (útil para debug)
                <div className="pt-2 border-t border-gray-100 dark:border-slate-800 mt-2 opacity-50">
                  <span className="text-xs text-gray-400 italic">
                    Documento não informado
                  </span>
                </div>
              )}

              {clientAddress && (
                <div className="pt-2 border-t border-gray-100 dark:border-slate-800 mt-2">
                  <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1">
                    Endereço
                  </label>
                  <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <MapPin size={14} className="mt-0.5" />
                    <span>{clientAddress}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AÇÕES */}
          {statusKey !== 'cancelled' && statusKey !== 'delivered' && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <CheckCircle
                  size={18}
                  className="text-green-600 dark:text-green-400"
                />{' '}
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
