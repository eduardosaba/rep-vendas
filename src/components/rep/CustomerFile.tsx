'use client';

import { AlertCircle, CheckCircle2, ShoppingCart, History } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CustomerFile({ customer }: any) {
  const isBlocked = customer?.financial_status === 'bloqueado';
  const companySlug = customer?.sales_context?.company_slug;
  const repSlug = customer?.sales_context?.representative_slug;

  const checkoutUrl =
    companySlug && repSlug
      ? `/catalogo/${companySlug}/${repSlug}/venda-direta?customer_id=${customer?.id}`
      : `/catalogo/checkout?customer_id=${customer?.id}`;

  return (
    <div className="p-4 space-y-6 bg-slate-50 min-h-screen">
      <div className={`p-6 rounded-3xl border-2 ${isBlocked ? 'bg-red-50 border-red-200' : 'bg-white border-white'} shadow-sm`}>
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase">{customer?.name}</h2>
            <p className="text-sm text-slate-500">{customer?.document}</p>
          </div>
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase ${isBlocked ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
            {isBlocked ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
            {customer?.financial_status}
          </div>
        </div>

        <Button
          disabled={isBlocked}
          className="w-full mt-6 h-14 rounded-2xl gap-2 text-lg font-bold shadow-lg shadow-primary/20"
          onClick={() => (window.location.href = checkoutUrl)}
        >
          <ShoppingCart size={20} />
          {isBlocked ? 'Venda Bloqueada' : 'Abrir Nova Venda'}
        </Button>
      </div>

      <div className="space-y-3">
        <h3 className="flex items-center gap-2 font-bold text-slate-700 px-2">
          <History size={18} /> Últimos Pedidos
        </h3>

        {customer?.orders?.map((order: any) => (
          <div key={order.id} className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm">
            <div>
              <p className="font-bold text-slate-800">#{order.display_id || order.id}</p>
              <p className="text-[10px] text-slate-400">{new Date(order.created_at).toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <p className="font-black text-slate-700">R$ {order.total_value}</p>
              <span className="text-[9px] uppercase font-bold text-primary">{order.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
