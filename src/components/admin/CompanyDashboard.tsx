'use client';

import { TrendingUp, Users, DollarSign, Clock, Trophy } from 'lucide-react';

export default function CompanyDashboard({ stats }: any) {
  const s = stats || {
    totalSales: 0,
    orderCount: 0,
    activeCustomers: 0,
    ranking: [],
    pendingBilling: 0,
  };

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-3xl font-black text-slate-900">Performance da Distribuidora</h1>
        <p className="text-slate-500 text-sm">Visão geral do mês atual</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total em Pedidos" value={`R$ ${Number(s.totalSales || 0).toLocaleString()}`} icon={<DollarSign />} color="bg-emerald-500" />
        <StatCard title="Pedidos no Mês" value={s.orderCount || 0} icon={<TrendingUp />} color="bg-blue-500" />
        <StatCard title="Clientes na Base" value={s.activeCustomers || 0} icon={<Users />} color="bg-purple-500" />
        <StatCard title="Aguardando Faturar" value={`R$ ${Number(s.pendingBilling || 0).toLocaleString()}`} icon={<Clock />} color="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
            <Trophy className="text-amber-500" /> Ranking de Vendas (Rep)
          </h3>
          <div className="space-y-4">
            {(s.ranking || []).map(([email, total]: any, index: number) => (
              <div key={email} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className="font-black text-slate-300">#{index + 1}</span>
                  <span className="font-bold text-slate-700 text-sm truncate max-w-[150px]">{email}</span>
                </div>
                <span className="font-black text-slate-900">R$ {Number(total).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-center items-center text-center">
             <div className="bg-blue-50 p-4 rounded-full text-blue-500 mb-4">
                <Users size={32} />
             </div>
             <h4 className="font-bold text-slate-800">Saúde da Carteira</h4>
             <p className="text-sm text-slate-500 px-8">Em breve: Relatório de clientes que não compram há mais de 45 dias.</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: any) {
  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden">
      <div className={`${color} w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-4`}>
        {icon}
      </div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</p>
      <h2 className="text-2xl font-black text-slate-900 mt-1">{value}</h2>
    </div>
  );
}
