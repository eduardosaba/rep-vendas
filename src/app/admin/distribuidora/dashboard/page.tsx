'use server';

import React from 'react';
import { Trophy, TrendingUp, Users, DollarSign, Clock, ArrowUpRight } from 'lucide-react';
import { getCompanyPerformance } from './actions';

export default async function Page() {
  const res = await getCompanyPerformance();
  if (!res.success) return <div className="p-6">Erro: {res.error}</div>;

  const stats = res;

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Performance Comercial</h1>
          <p className="text-slate-500 font-medium">Resultados consolidados da sua equipe</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-2xl border text-xs font-bold text-slate-400 uppercase">{new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total Vendido" value={`R$ ${Number(stats.totalSales).toLocaleString()}`} icon={<DollarSign />} color="bg-emerald-500" />
        <StatCard title="Pedidos" value={stats.ordersCount} icon={<TrendingUp />} color="bg-blue-500" />
        <StatCard title="Carteira" value={stats.totalCustomers} icon={<Users />} color="bg-purple-500" />
        <StatCard title="A Faturar" value={`R$ ${Number(stats.pendingBilling).toLocaleString()}`} icon={<Clock />} color="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><Trophy className="text-amber-500" /> Ranking de Vendas</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Top Performers</span>
          </div>
          <div className="space-y-4">
            {(stats.ranking || []).map((r: any, index: number) => (
              <div key={r.userId} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-transparent hover:border-primary/20 transition-all">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${index === 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-500'}`}>{index + 1}º</span>
                  <span className="font-bold text-slate-700">{r.name}</span>
                </div>
                <div className="text-right"><p className="font-black text-slate-900">R$ {Number(r.total).toLocaleString()}</p></div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-primary to-indigo-700 p-8 rounded-[2.5rem] text-white flex flex-col justify-between relative overflow-hidden">
          <ArrowUpRight className="absolute top-[-20px] right-[-20px] w-48 h-48 opacity-10" />
          <div className="relative z-10">
            <h4 className="text-2xl font-black mb-2">Saúde da Carteira</h4>
            <p className="text-white/70 text-sm leading-relaxed">Você tem {stats.sleepingCustomers} clientes que não realizam pedidos há mais de 45 dias.</p>
          </div>
          <button className="bg-white text-primary font-black py-4 rounded-2xl mt-8 hover:bg-slate-50 transition-colors">Ver Clientes Inativos</button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: any) {
  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden group">
      <div className={`${color} w-10 h-10 rounded-xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>{icon}</div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
      <h2 className="text-2xl font-black text-slate-900 mt-1">{value}</h2>
    </div>
  );
}
