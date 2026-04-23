'use client';

import { useMemo, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  ArrowDownCircle,
  ArrowUpCircle,
} from 'lucide-react';

type OrderRow = {
  id: string;
  total_value: number;
  faturado_at: string;
  customer_id?: string | null;
  client_name_guest?: string | null;
};

type CommissionRow = {
  amount: number;
  status: string;
  created_at: string;
};

type OrderItemRow = {
  order_id: string;
  total_price: number;
  brand: string;
};

type Props = {
  orders: OrderRow[];
  commissions: CommissionRow[];
  orderItems: OrderItemRow[];
};

function money(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(v || 0));
}

function monthKey(dateStr: string) {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export default function FinancialClosureDashboard({
  orders,
  commissions,
  orderItems,
}: Props) {
  const monthKeys = useMemo(() => {
    const keys = new Set<string>();
    (orders || []).forEach((o) => {
      if (o.faturado_at) keys.add(monthKey(o.faturado_at));
    });
    return Array.from(keys).sort((a, b) => (a < b ? 1 : -1));
  }, [orders]);

  const [selectedMonth, setSelectedMonth] = useState<string>(monthKeys[0] || '');

  const selectedOrders = useMemo(() => {
    if (!selectedMonth) return [];
    return (orders || []).filter((o) => monthKey(o.faturado_at) === selectedMonth);
  }, [orders, selectedMonth]);

  const monthOrderIds = useMemo(() => new Set(selectedOrders.map((o) => o.id)), [selectedOrders]);

  const faturamentoBruto = useMemo(
    () => selectedOrders.reduce((acc, o) => acc + Number(o.total_value || 0), 0),
    [selectedOrders]
  );

  const totalPedidos = selectedOrders.length;
  const ticketMedio = totalPedidos > 0 ? faturamentoBruto / totalPedidos : 0;

  const comissoesMes = useMemo(() => {
    if (!selectedMonth) return 0;
    return (commissions || [])
      .filter((c) => c.status === 'pending' && monthKey(c.created_at) === selectedMonth)
      .reduce((acc, c) => acc + Number(c.amount || 0), 0);
  }, [commissions, selectedMonth]);

  const saldoLiquido = faturamentoBruto - comissoesMes;

  const brandPerformance = useMemo(() => {
    const totals = new Map<string, number>();
    (orderItems || []).forEach((item) => {
      if (!monthOrderIds.has(item.order_id)) return;
      const key = item.brand || 'Sem Marca';
      totals.set(key, (totals.get(key) || 0) + Number(item.total_price || 0));
    });

    const list = Array.from(totals.entries())
      .map(([brand, total]) => ({ brand, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    const base = list.reduce((acc, row) => acc + row.total, 0) || 1;
    return list.map((row) => ({
      ...row,
      percent: Math.round((row.total / base) * 100),
    }));
  }, [orderItems, monthOrderIds]);

  const topBuyers = useMemo(() => {
    const totals = new Map<string, number>();
    selectedOrders.forEach((o) => {
      const key = o.customer_id || o.client_name_guest || 'Cliente sem identificação';
      totals.set(key, (totals.get(key) || 0) + Number(o.total_value || 0));
    });

    return Array.from(totals.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [selectedOrders]);

  const previousMonthGrowth = useMemo(() => {
    if (monthKeys.length < 2 || !selectedMonth) return 0;
    const currentIdx = monthKeys.findIndex((m) => m === selectedMonth);
    const prev = currentIdx >= 0 ? monthKeys[currentIdx + 1] : null;
    if (!prev) return 0;

    const current = (orders || [])
      .filter((o) => monthKey(o.faturado_at) === selectedMonth)
      .reduce((acc, o) => acc + Number(o.total_value || 0), 0);
    const past = (orders || [])
      .filter((o) => monthKey(o.faturado_at) === prev)
      .reduce((acc, o) => acc + Number(o.total_value || 0), 0);

    if (past <= 0) return 0;
    return Math.round(((current - past) / past) * 100);
  }, [monthKeys, orders, selectedMonth]);

  return (
    <div className="p-4 md:p-8 space-y-8 bg-slate-50 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black italic text-slate-900">Fechamento Mensal</h1>
          <p className="text-slate-500 font-medium">
            Consolidação de pedidos faturados e comissões
          </p>
        </div>

        <div className="bg-white p-2 rounded-2xl border flex gap-2 overflow-x-auto">
          {monthKeys.slice(0, 6).map((key) => (
            <button
              key={key}
              onClick={() => setSelectedMonth(key)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase whitespace-nowrap ${
                selectedMonth === key
                  ? 'bg-slate-100 text-slate-800'
                  : 'text-slate-400'
              }`}
            >
              {monthLabel(key)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
            <span className="text-emerald-500 font-bold text-xs flex items-center gap-1">
              <ArrowUpCircle size={14} /> {previousMonthGrowth >= 0 ? '+' : ''}{previousMonthGrowth}%
            </span>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Faturamento Faturado</p>
          <h2 className="text-3xl font-black text-slate-900 mt-1">{money(faturamentoBruto)}</h2>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">Pedidos com faturamento confirmado</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
              <ArrowDownCircle size={24} />
            </div>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Comissões Devidas</p>
          <h2 className="text-3xl font-black text-slate-900 mt-1">{money(comissoesMes)}</h2>
          <p className="text-[10px] text-red-500 mt-2 font-bold uppercase">A pagar para representantes</p>
        </div>

        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-white/10 text-white rounded-2xl flex items-center justify-center">
              <PieChart size={24} />
            </div>
          </div>
          <p className="text-[10px] font-black opacity-50 uppercase tracking-widest">Saldo Líquido Operacional</p>
          <h2 className="text-3xl font-black mt-1">{money(saldoLiquido)}</h2>
          <p className="text-[10px] opacity-70 mt-2 font-medium italic">Faturamento - Comissões</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
              <BarChart3 size={24} />
            </div>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ticket Médio</p>
          <h2 className="text-3xl font-black text-slate-900 mt-1">{money(ticketMedio)}</h2>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">{totalPedidos} pedidos no período</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2 italic">
            <BarChart3 size={20} className="text-primary" /> Performance por Marca
          </h3>
          <div className="space-y-4">
            {brandPerformance.length === 0 ? (
              <p className="text-sm text-slate-500">Sem dados de marcas no período selecionado.</p>
            ) : (
              brandPerformance.map((row) => (
                <div key={row.brand} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-600 uppercase">
                    <span>{row.brand}</span>
                    <span>{row.percent}% das vendas</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--primary,#2563eb)] transition-all duration-1000"
                      style={{ width: `${row.percent}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h3 className="text-lg font-black text-slate-800 mb-6 italic">Principais Compradores</h3>
          <div className="space-y-4">
            {topBuyers.length === 0 ? (
              <p className="text-sm text-slate-500">Sem compradores no período selecionado.</p>
            ) : (
              topBuyers.map((row, i) => (
                <div key={`${row.name}-${i}`} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-transparent hover:border-primary/20 transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black">{i + 1}º</div>
                    <span className="font-bold text-slate-700 text-sm uppercase">{row.name}</span>
                  </div>
                  <span className="font-black text-slate-900">{money(row.total)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
