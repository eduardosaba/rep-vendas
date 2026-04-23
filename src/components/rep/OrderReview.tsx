'use client';

import React, { useMemo, useState } from 'react';
import { ShoppingBag, CreditCard, MapPin, CheckCircle, PenTool } from 'lucide-react';
import SignaturePad from './SignaturePad';

type OrderReviewProps = {
  cart: any[];
  customer: any;
  settings: any;
  paymentLabel?: string;
  discountPercent?: number;
  onSubmit: (payload: { includeSignature: boolean; signatureDataUrl: string | null; paymentLabel: string; discountPercent: number }) => Promise<void>;
  onGoCustomers?: () => void;
  onGoPaidOrders?: () => void;
  submitting?: boolean;
  isDirectSale?: boolean;
};

export default function OrderReview({
  cart,
  customer,
  settings,
  paymentLabel = 'Boleto 30/60/90 Dias',
  discountPercent = 0,
  onSubmit,
  onGoCustomers,
  onGoPaidOrders,
  submitting = false,
  isDirectSale = false,
}: OrderReviewProps) {
  const [showSignature, setShowSignature] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  const total = useMemo(() => {
    const subtotal = cart.reduce((acc: number, item: any) => acc + Number(item.price || 0) * Number(item.quantity || 0), 0);
    const discount = discountPercent > 0 ? subtotal * (discountPercent / 100) : 0;
    return subtotal - discount;
  }, [cart, discountPercent]);

  const primaryColor = settings?.primary_color || 'var(--primary)';
  const fontClass = settings?.font_family || '';

  return (
    <div className={`p-6 space-y-8 bg-white min-h-screen pb-44 ${fontClass}`}>
      <div className="text-center space-y-2 pt-4">
        <div
          style={{ backgroundColor: primaryColor }}
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto text-white shadow-xl"
        >
          <ShoppingBag size={28} />
        </div>
        <h2 className="text-2xl font-black italic text-slate-900 uppercase">Conferência do Pedido</h2>
        <p className="text-slate-500 text-sm font-medium">Revise os itens com o cliente antes de finalizar</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Itens Selecionados</h3>
        <div className="space-y-3">
          {cart.map((item: any) => (
            <div key={item.id} className="flex gap-4 p-4 rounded-[2rem] bg-slate-50 border border-slate-100">
              {item.image_url ? (
                <img src={item.image_url} className="w-16 h-16 object-cover rounded-2xl bg-white" alt={item.name} />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-xs text-slate-400">IMG</div>
              )}
              <div className="flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">{item.brand || 'Sem marca'}</p>
                <h4 className="font-bold text-slate-800 text-sm leading-tight">{item.name}</h4>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs font-medium text-slate-500">{item.quantity} un.</span>
                  <span className="font-black text-slate-900">R$ {(Number(item.price || 0) * Number(item.quantity || 0)).toLocaleString('pt-BR')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="p-5 rounded-[2rem] border border-slate-100 flex items-start gap-3">
          <MapPin className="text-slate-400 mt-1" size={18} />
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase">Entrega para</p>
            <p className="text-sm font-bold text-slate-800 leading-tight">{customer?.name || 'Cliente'}</p>
            <p className="text-[10px] text-slate-500">{customer?.address_city || 'Cidade'}, {customer?.address_state || 'UF'}</p>
          </div>
        </div>

        <div className="p-5 rounded-[2rem] border border-slate-100 flex items-start gap-3">
          <CreditCard className="text-slate-400 mt-1" size={18} />
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase">Condição de Pagamento</p>
            <p className="text-sm font-bold text-slate-800 leading-tight">{paymentLabel}</p>
            {discountPercent > 0 ? <p className="text-[10px] text-emerald-600 font-bold mt-1">Desconto aplicado: {discountPercent}%</p> : null}
          </div>
        </div>
      </div>

      <div className="px-2">
        <label className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl cursor-pointer">
          <div className="flex items-center gap-3">
            <div
              style={showSignature ? { backgroundColor: primaryColor, color: '#fff' } : undefined}
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${showSignature ? '' : 'bg-slate-100 text-slate-400'}`}
            >
              <PenTool size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Assinatura Digital</p>
              <p className="text-[10px] text-slate-500 font-medium italic">Coletar assinatura na tela agora</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={showSignature}
            onChange={(e) => setShowSignature(e.target.checked)}
            className="w-6 h-6 rounded-lg border-slate-200 text-primary focus:ring-primary"
          />
        </label>
      </div>

      {showSignature ? (
        <SignaturePad primaryColor={primaryColor} onChange={setSignatureDataUrl} />
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={onGoCustomers}
          className="h-24 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
        >
          <span className="text-xs font-bold text-slate-600">Meus Clientes</span>
        </button>
        <button
          type="button"
          onClick={onGoPaidOrders}
          className="h-24 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
        >
          <span className="text-xs font-bold text-slate-600">Pedidos Pagos</span>
        </button>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-100 rounded-t-[3rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-center mb-4 px-2">
          <span className="text-slate-400 font-bold">Total do Pedido</span>
          <span style={{ color: primaryColor }} className="text-2xl font-black italic">
            R$ {Number(total || 0).toLocaleString('pt-BR')}
          </span>
        </div>

        <button
          type="button"
          disabled={submitting || (showSignature && !signatureDataUrl)}
          onClick={() => onSubmit({ includeSignature: showSignature, signatureDataUrl, paymentLabel, discountPercent })}
          style={{ backgroundColor: primaryColor }}
          className="w-full h-16 rounded-[2rem] text-white font-black text-lg flex items-center justify-center gap-2 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <CheckCircle size={20} />
          {submitting
            ? 'ENVIANDO...'
            : isDirectSale
              ? 'CONFIRMAR PEDIDO PRESENCIAL'
              : showSignature
                ? 'CONFIRMAR COM ASSINATURA'
                : 'FINALIZAR PEDIDO AGORA'}
        </button>
      </div>
    </div>
  );
}
