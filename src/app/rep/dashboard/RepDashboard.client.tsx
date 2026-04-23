'use client';

import React from 'react';
import { Target, Wallet, Users, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import CommissionSummary from '@/components/dashboard/CommissionSummary';

export default function RepDashboard({ stats, announcements = [] }: any) {
  const regra = stats?.regraComissao === 'faturamento' ? 'faturamento' : 'liquidez';

  return (
    <div className="p-6 space-y-8 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-3xl font-black text-slate-900 italic">Meu Desempenho</h1>
        <p className="text-slate-500 font-medium text-sm">Acompanhe suas metas e comissões</p>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Regra de Pagamento</p>
        <p className="text-sm font-bold text-slate-900 mt-1">
          {regra === 'liquidez' ? 'Liquidez (após compensação do boleto)' : 'Faturamento (após emissão/faturamento)' }
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Taxa aplicada: {Number(stats?.taxaComissao || 0).toFixed(2)}%
        </p>
      </div>

      <CommissionSummary
        rule={regra}
        stats={{
          pending: Number(stats?.comissaoPendente || 0),
          released: Number(stats?.comissaoLiberada || 0),
          monthTotal: Number(stats?.totalVendido || 0),
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-primary p-6 rounded-[2.5rem] text-white shadow-xl shadow-primary/20">
          <div className="flex justify-between items-start">
            <Wallet size={24} className="opacity-70" />
            <span className="text-[10px] font-black bg-white/20 px-3 py-1 rounded-full uppercase">Este Mês</span>
          </div>
          <p className="text-xs font-bold opacity-80 mt-4 uppercase">Comissão em Aberto</p>
          <h2 className="text-3xl font-black">R$ {Number(stats.comissaoPendente || 0).toLocaleString()}</h2>
        </div>

        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start text-slate-400">
            <Target size={24} />
            <span className="text-[10px] font-black bg-slate-100 px-3 py-1 rounded-full uppercase">Faturamento</span>
          </div>
          <p className="text-xs font-bold text-slate-400 mt-4 uppercase">Total Vendido</p>
          <h2 className="text-3xl font-black text-slate-900">R$ {Number(stats.totalVendido || 0).toLocaleString()}</h2>
        </div>
      </div>

      {stats.clientesInativos && stats.clientesInativos.length > 0 && (
        <div className="bg-amber-50 p-6 rounded-[2.5rem] border border-amber-100 space-y-4">
          <div className="flex items-center gap-2 text-amber-700 font-black italic">
            <AlertCircle size={20} />
            <h3>Recuperação de Clientes</h3>
          </div>
          <p className="text-xs text-amber-600 font-medium">
            Existem {stats.clientesInativos.length} óticas da sua carteira que não compram há mais de 45 dias.
          </p>
          <div className="space-y-2">
            {stats.clientesInativos.slice(0, 3).map((cliente: any) => (
              <div key={cliente.id} className="flex justify-between items-center bg-white/50 p-3 rounded-xl border border-amber-200">
                <span className="text-xs font-bold text-slate-700">{cliente.name}</span>
                <button className="text-[10px] font-black text-primary flex items-center gap-1">
                  VENDER AGORA <ArrowRight size={12}/>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-400">Comunicados da Distribuidora</h3>
          <span className="text-[10px] font-black px-3 py-1 rounded-full bg-slate-100 text-slate-600 uppercase">
            {announcements.length} ativos
          </span>
        </div>

        {announcements.length === 0 ? (
          <p className="text-sm text-slate-500">Sem novos comunicados no momento.</p>
        ) : (
          <div className="space-y-3">
            {announcements.map((item: any) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                <p className="text-sm font-bold text-slate-800">{item.title}</p>
                <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{item.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button className="h-32 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Users size={20} />
          </div>
          <span className="text-xs font-bold text-slate-600">Meus Clientes</span>
        </button>
        <button className="h-32 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <CheckCircle2 size={20} />
          </div>
          <span className="text-xs font-bold text-slate-600">Pedidos Pagos</span>
        </button>
      </div>
    </div>
  );
}
