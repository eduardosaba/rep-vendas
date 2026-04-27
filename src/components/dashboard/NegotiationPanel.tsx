"use client";

import { makeWhatsAppUrl } from '@/lib/format-whatsapp';
import { CheckCircle, Clock, Loader2, Percent } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

type NegotiationItem = {
  id: string;
  name: string;
  brand?: string | null;
  quantity: number;
  subtotal: number;
};

type NegotiationPanelProps = {
  orderId: string;
  customerName: string;
  customerPhone?: string | null;
  representativeName?: string | null;
  baseTotal: number;
  items: NegotiationItem[];
  initialPaymentTerms?: string | null;
};

export function NegotiationPanel({
  orderId,
  customerName,
  customerPhone,
  representativeName,
  baseTotal,
  items,
  initialPaymentTerms,
}: NegotiationPanelProps) {
  const router = useRouter();
  const [discount, setDiscount] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState(
    initialPaymentTerms || 'Boleto 30/60/90'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const finalTotal = useMemo(() => {
    const pct = Math.min(100, Math.max(0, Number(discount) || 0));
    return baseTotal * (1 - pct / 100);
  }, [baseTotal, discount]);

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/orders/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          newStatus: 'awaiting_billing',
          review: {
            discountPercent: Number(discount) || 0,
            paymentLabel: paymentTerms,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || 'Erro ao aprovar negociação');
        return;
      }
      toast.success('Negociação aprovada e enviada para faturamento');

      const phone = String(customerPhone || '');
      if (phone) {
        const message = `Otimas noticias! O seu pedido foi aprovado com a condicao: ${paymentTerms}.`;
        const url = makeWhatsAppUrl(phone, message) || '#';
        window.open(url, '_blank');
      }

      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao aprovar negociação');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
      <div className="bg-slate-900 p-6 text-white">
        <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">
          Orçamento B2B
        </span>
        <h2 className="text-2xl font-black italic uppercase mt-2">
          Análise de Pedido: {customerName}
        </h2>
        <p className="text-slate-300 text-sm mt-1">
          Origem: Link do Representante
          {representativeName ? ` (${representativeName})` : ''}
        </p>
      </div>

      <div className="p-6 space-y-6">
        <div className="space-y-3">
          <h3 className="font-black italic uppercase text-xs text-slate-500">
            Revisão de Grade
          </h3>
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100"
            >
              <div className="w-12 h-9 rounded-lg bg-slate-200 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 truncate">{item.name}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase truncate">
                  {item.brand || 'Sem marca'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-black text-sm">{item.quantity} un.</p>
                <p className="text-xs text-slate-500">
                  Subtotal:{' '}
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(item.subtotal)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500">
              <Percent size={14} /> Desconto Comercial (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl h-12 px-4 font-black text-lg"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500">
              <Clock size={14} /> Condição de Pagamento
            </label>
            <select
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl h-12 px-4 font-bold"
            >
              <option value="Boleto 30/60/90">Boleto 30/60/90 dias</option>
              <option value="À vista">À vista</option>
              <option value="Cartão B2B 10x">Cartão B2B 10x</option>
              <option value="Condição especial">Condição especial</option>
            </select>
          </div>
        </div>

        <div className="bg-slate-900 rounded-3xl p-6 text-white flex flex-col md:flex-row justify-between items-center gap-5">
          <div>
            <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">
              Valor Final Negociado
            </p>
            <p className="text-3xl font-black italic text-amber-300">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(finalTotal)}
            </p>
          </div>

          <button
            disabled={isSubmitting}
            onClick={handleApprove}
            className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.16em] hover:bg-amber-100 transition-all flex items-center gap-3 disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Processando
              </>
            ) : (
              <>
                <CheckCircle size={18} /> Aprovar e Enviar p/ Faturamento
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
