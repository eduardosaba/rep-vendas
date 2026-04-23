'use client';

import { CheckCircle } from 'lucide-react';

type Rule = 'faturamento' | 'liquidez';

type SummaryStats = {
  pending: number;
  released: number;
  monthTotal: number;
};

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0));
}

export default function CommissionSummary({
  stats,
  rule,
}: {
  stats: SummaryStats;
  rule: Rule;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Em Aberto (Carteira)</p>
        <p className="text-3xl font-black italic text-slate-900 mt-2">{money(stats.pending)}</p>
        <p className="text-[9px] font-bold text-amber-500 mt-2 uppercase">
          Aguardando {rule === 'liquidez' ? 'Pagamento' : 'Faturamento'}
        </p>
      </div>

      <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase text-primary tracking-widest">Comissão Liberada</p>
          <p className="text-3xl font-black italic text-white mt-2">{money(stats.released)}</p>
          <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase">Pronto para Recebimento</p>
        </div>
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <CheckCircle size={80} className="text-white" />
        </div>
      </div>

      <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Faturado (Mês)</p>
        <p className="text-3xl font-black italic text-slate-900 mt-2">{money(stats.monthTotal)}</p>
        <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase">Base de Cálculo de Vendas</p>
      </div>
    </div>
  );
}
