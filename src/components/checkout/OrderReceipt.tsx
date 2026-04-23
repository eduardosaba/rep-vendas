'use client';

import { CheckCircle } from 'lucide-react';

type ReceiptOrderItem = {
  id: string;
  name: string;
  quantity: number;
  subtotal: number;
};

type ReceiptOrder = {
  id: string;
  total_amount: number;
  payment_terms?: string;
  signature_data?: string | null;
  metadata?: {
    ip_location?: string;
    timestamp?: string;
  };
  items: ReceiptOrderItem[];
};

type ReceiptPerson = {
  name?: string;
  full_name?: string;
  phone?: string;
};

type ReceiptCompany = {
  name?: string;
  logo_url?: string;
};

export default function OrderReceipt({
  order,
  company,
  representative,
  customer,
}: {
  order: ReceiptOrder;
  company: ReceiptCompany;
  representative: ReceiptPerson;
  customer: ReceiptPerson;
}) {
  return (
    <div className="bg-white p-8 max-w-md mx-auto rounded-[2.5rem] shadow-2xl border border-slate-100 font-sans" id="receipt-content">
      <div className="text-center space-y-4 mb-10">
        {company?.logo_url ? (
          <img src={company.logo_url} className="h-10 mx-auto object-contain" alt={company?.name || 'Logo da empresa'} />
        ) : (
          <div className="h-10 mx-auto text-xs text-slate-400 flex items-center justify-center">{company?.name || 'Distribuidora'}</div>
        )}
        <div className="space-y-1">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Comprovante de Pedido</h2>
          <p className="text-sm font-bold text-slate-900">#{String(order.id || '').substring(0, 8).toUpperCase()}</p>
        </div>
      </div>

      <div className="space-y-6 mb-10">
        <div className="flex justify-between border-b border-slate-50 pb-4 gap-4">
          <span className="text-[10px] font-black uppercase text-slate-400">Cliente</span>
          <span className="text-xs font-bold uppercase italic text-right">{customer?.name || 'Cliente não informado'}</span>
        </div>

        <div className="flex justify-between border-b border-slate-50 pb-4 gap-4">
          <span className="text-[10px] font-black uppercase text-slate-400">Consultor</span>
          <span className="text-xs font-bold uppercase italic text-right">{representative?.full_name || representative?.name || 'Representante'}</span>
        </div>

        <div className="py-2">
          <p className="text-[10px] font-black uppercase text-slate-400 mb-3">Resumo da Grade</p>
          {(order.items || []).slice(0, 3).map((item, i) => (
            <div key={`${item.id}-${i}`} className="flex justify-between text-[11px] mb-2 gap-3">
              <span className="font-medium">{item.quantity}x {item.name}</span>
              <span className="font-black italic">R$ {Number(item.subtotal || 0).toFixed(2)}</span>
            </div>
          ))}
          {(order.items || []).length > 3 ? (
            <p className="text-[9px] text-slate-400 italic">+ {(order.items || []).length - 3} itens no pedido</p>
          ) : null}
        </div>

        <div className="bg-slate-900 rounded-2xl p-6 text-white flex justify-between items-center gap-3">
          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Final</span>
          <span className="text-xl font-black italic">R$ {Number(order.total_amount || 0).toFixed(2)}</span>
        </div>
      </div>

      <div className="border-2 border-dashed border-slate-100 rounded-3xl p-6 text-center space-y-3">
        <p className="text-[9px] font-black uppercase text-emerald-500 tracking-widest flex items-center justify-center gap-2">
          <CheckCircle size={12} /> Assinado Digitalmente
        </p>
        {order.signature_data ? (
          <img src={order.signature_data} className="h-12 mx-auto opacity-80 contrast-125" alt="Assinatura" />
        ) : (
          <p className="text-[10px] text-slate-400">Sem assinatura coletada</p>
        )}
        <p className="text-[8px] text-slate-400 font-medium tracking-tighter uppercase">
          IP: {order.metadata?.ip_location || 'N/A'} • {order.metadata?.timestamp ? new Date(order.metadata.timestamp).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}
        </p>
      </div>
    </div>
  );
}
