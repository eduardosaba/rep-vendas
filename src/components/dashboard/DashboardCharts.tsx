'use client';

import { useState, useMemo } from 'react';
import { SalesBarChart } from '@/components/dashboard/SalesBarChart';
import { Activity } from 'lucide-react';

interface ChartOrderData {
  total_value: number;
  created_at: string;
}

interface DashboardChartsProps {
  orders: ChartOrderData[];
}

export function DashboardCharts({ orders }: DashboardChartsProps) {
  const [period, setPeriod] = useState<'7d' | '30d' | '6m' | '12m'>('6m');

  // Lógica de Agregação (Mantida igual)
  const chartData = useMemo(() => {
    const today = new Date();
    const dataMap = new Map<string, number>();
    let startDate = new Date();
    let dateFormat: 'day' | 'month' = 'month';

    if (period === '7d') {
      startDate.setDate(today.getDate() - 7);
      dateFormat = 'day';
    } else if (period === '30d') {
      startDate.setDate(today.getDate() - 30);
      dateFormat = 'day';
    } else if (period === '6m') {
      startDate.setMonth(today.getMonth() - 6);
      dateFormat = 'month';
    } else {
      startDate.setMonth(today.getMonth() - 12);
      dateFormat = 'month';
    }

    if (dateFormat === 'day') {
      for (
        let d = new Date(startDate);
        d <= today;
        d.setDate(d.getDate() + 1)
      ) {
        const label = d.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        });
        dataMap.set(label, 0);
      }
    } else {
      for (
        let d = new Date(startDate);
        d <= today;
        d.setMonth(d.getMonth() + 1)
      ) {
        const monthLabel = d.toLocaleString('pt-BR', { month: 'short' });
        const label = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
        dataMap.set(label, 0);
      }
    }

    orders.forEach((order) => {
      const orderDate = new Date(order.created_at);
      if (orderDate >= startDate) {
        let label = '';
        if (dateFormat === 'day') {
          label = orderDate.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
          });
        } else {
          const monthLabel = orderDate.toLocaleString('pt-BR', {
            month: 'short',
          });
          label = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
        }
        if (dataMap.has(label)) {
          dataMap.set(
            label,
            (dataMap.get(label) || 0) + Number(order.total_value)
          );
        }
      }
    });

    return Array.from(dataMap.entries()).map(([name, vendas]) => ({
      name,
      vendas,
    }));
  }, [orders, period]);

  return (
    <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm h-full flex flex-col">
      {/* HEADER RESPONSIVO: Flex-Col no mobile, Row no desktop */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-base sm:text-lg">
          <div className="p-2 bg-primary/5 dark:bg-primary/20 rounded-lg shrink-0">
            <Activity size={18} className="text-primary" />
          </div>
          Desempenho de Vendas
        </h3>

        {/* Filtros com scroll horizontal no mobile se necessário */}
        <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-lg w-full sm:w-auto overflow-x-auto no-scrollbar">
          {(['7d', '30d', '6m', '12m'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                period === p
                  ? 'bg-white dark:bg-slate-700 text-primary dark:text-primary/70 shadow-sm'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
              }`}
            >
              {p === '7d'
                ? '7 Dias'
                : p === '30d'
                  ? '30 Dias'
                  : p === '6m'
                    ? '6 Meses'
                    : '1 Ano'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full min-h-[300px]">
        <SalesBarChart data={chartData} />
      </div>
    </div>
  );
}
