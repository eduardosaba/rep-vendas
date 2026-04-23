'use client';

import {
  X,
  Printer,
  Truck,
  AlertCircle,
  User,
  MapPin,
  Loader2,
  PackageSearch,
} from 'lucide-react';
import { useEffect, useState } from 'react';

type OrderDetail = {
  id: string;
  display_id?: number | null;
  status: string;
  customer_name?: string | null;
  customer_cnpj?: string | null;
  customer_city?: string | null;
  seller_name?: string | null;
  commission_value?: number;
  total_value?: number;
  signature_url?: string | null;
  tracking_code?: string | null;
  pdf_url?: string | null;
  tracking_history?: Array<{
    id: string;
    tracking_code: string | null;
    status_note: string | null;
    created_at: string;
  }>;
  items: Array<{
    id: string;
    name: string;
    brand?: string | null;
    quantity: number;
    total_price: number;
    image_url?: string | null;
  }>;
};

type Props = {
  open: boolean;
  order: OrderDetail | null;
  loading?: boolean;
  submitting?: boolean;
  onClose: () => void;
  onStatusUpdate: (
    action: 'faturado' | 'despachado' | 'update_tracking',
    trackingCode?: string | null
  ) => void;
  onGeneratePdf: () => void;
};

function money(v?: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(v || 0));
}

export default function OrderDetailModal({
  open,
  order,
  loading = false,
  submitting = false,
  onClose,
  onStatusUpdate,
  onGeneratePdf,
}: Props) {
  const [trackingInput, setTrackingInput] = useState('');

  useEffect(() => {
    setTrackingInput(order?.tracking_code || '');
  }, [order?.id, order?.tracking_code]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-end p-2 sm:p-4">
      <div className="bg-white w-full max-w-2xl h-full rounded-[2rem] sm:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-100 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Pedido Detalhado
            </span>
            <h2 className="text-2xl font-black text-slate-800">
              #{order?.display_id || '---'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors"
          >
            <X size={20} className="text-slate-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8">
          {loading || !order ? (
            <div className="h-40 flex items-center justify-center">
              <Loader2 className="animate-spin text-slate-500" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-3xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Status Atual</p>
                    <p className="text-sm font-bold text-slate-700 uppercase">{order.status}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={submitting}
                    onClick={() => onStatusUpdate('faturado')}
                    className="bg-[var(--primary,#2563eb)] text-white px-4 sm:px-6 py-2 rounded-xl text-xs font-black shadow-lg disabled:opacity-60"
                  >
                    FATURAR AGORA
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">
                    <MapPin size={12} /> Cliente
                  </p>
                  <p className="font-bold text-slate-800">{order.customer_name || '-'}</p>
                  <p className="text-xs text-slate-500">CNPJ: {order.customer_cnpj || '-'}</p>
                  {order.customer_city ? (
                    <p className="text-xs text-slate-500">{order.customer_city}</p>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">
                    <User size={12} /> Representante
                  </p>
                  <p className="font-bold text-slate-800">{order.seller_name || '-'}</p>
                  <p className="text-xs text-emerald-600 font-bold">
                    Comissão: {money(order.commission_value || 0)}
                  </p>
                </div>
              </div>

              <div className="space-y-3 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <PackageSearch size={14} /> Rastreio da Entrega
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    value={trackingInput}
                    onChange={(e) => setTrackingInput(e.target.value)}
                    placeholder="Ex.: BR1234567890"
                    className="flex-1 h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm"
                  />
                  <button
                    disabled={submitting}
                    onClick={() => onStatusUpdate('update_tracking', trackingInput.trim() || null)}
                    className="h-11 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-black uppercase disabled:opacity-60"
                  >
                    Salvar Rastreio
                  </button>
                </div>

                <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-100 bg-white">
                  {(order.tracking_history || []).length === 0 ? (
                    <div className="p-3 text-xs text-slate-500">Sem histórico de rastreio ainda.</div>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {(order.tracking_history || []).map((item) => (
                        <li key={item.id} className="p-3 text-xs text-slate-600">
                          <p className="font-bold text-slate-700">{item.tracking_code || 'Sem código'}</p>
                          <p className="text-[11px] text-slate-500">{item.status_note || 'Atualização'} • {new Date(item.created_at).toLocaleString('pt-BR')}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Itens do Pedido
                </p>
                <div className="border border-slate-100 rounded-[2rem] overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-4 sm:px-6 py-3 font-black text-slate-400">Produto</th>
                        <th className="px-4 sm:px-6 py-3 font-black text-slate-400 text-center">Qtd</th>
                        <th className="px-4 sm:px-6 py-3 font-black text-slate-400 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {(order.items || []).map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 sm:px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden">
                                {item.image_url ? (
                                  <img
                                    src={item.image_url}
                                    className="w-full h-full object-cover"
                                    alt={item.name}
                                  />
                                ) : null}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800">{item.name}</p>
                                <p className="text-[10px] text-slate-400 uppercase">{item.brand || '-'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-center font-medium">{item.quantity}</td>
                          <td className="px-4 sm:px-6 py-4 text-right font-black text-slate-900">
                            {money(item.total_price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end">
                  <p className="text-sm font-black text-slate-900">
                    Total do Pedido: {money(order.total_value || 0)}
                  </p>
                </div>
              </div>

              {order.signature_url ? (
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                    Assinatura Digital Coletada
                  </p>
                  <div className="bg-slate-50 rounded-[2rem] p-4 flex justify-center border border-slate-100">
                    <img src={order.signature_url} className="h-24 object-contain grayscale" alt="Assinatura" />
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="p-6 sm:p-8 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            onClick={onGeneratePdf}
            disabled={submitting || loading || !order}
            className="flex-1 h-12 sm:h-14 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors disabled:opacity-60"
          >
            <Printer size={18} /> IMPRIMIR PDF
          </button>
          <button
            onClick={() => onStatusUpdate('despachado', trackingInput.trim() || null)}
            disabled={submitting || loading || !order}
            className="flex-1 h-12 sm:h-14 bg-slate-800 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-900 transition-colors disabled:opacity-60"
          >
            <Truck size={18} /> MARCAR DESPACHADO
          </button>
        </div>
      </div>
    </div>
  );
}
