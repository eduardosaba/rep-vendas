'use client';

import { useMemo } from 'react';
import { SalesBarChart } from '@/components/dashboard/SalesBarChart';
import { Activity } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import {
  format,
  startOfToday,
  subDays,
  eachHourOfInterval,
  eachDayOfInterval,
  eachMonthOfInterval,
  startOfHour,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChartOrderData {
  total_value: number;
  created_at: string;
}

interface DashboardChartsProps {
  orders: ChartOrderData[];
}

export function DashboardCharts({ orders }: DashboardChartsProps) {
  const searchParams = useSearchParams();
  const range = searchParams.get('range') || '30d';

  const chartData = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let formatStr: string;
    let interval: Date[];

    switch (range) {
      case 'today':
        startDate = startOfToday();
        formatStr = 'HH:00';
        interval = eachHourOfInterval({ start: startDate, end: now });
        break;
      case '7d':
        startDate = subDays(now, 6);
        formatStr = 'dd/MM';
        interval = eachDayOfInterval({ start: startDate, end: now });
        break;
      case '6m':
        startDate = startOfMonth(subMonths(now, 5));
        formatStr = 'MMM';
        interval = eachMonthOfInterval({ start: startDate, end: now });
        break;
      case '12m':
        startDate = startOfMonth(subMonths(now, 11));
        formatStr = 'MMM';
        interval = eachMonthOfInterval({ start: startDate, end: now });
        break;
      case '30d':
      default:
        startDate = subDays(now, 29);
        formatStr = 'dd/MM';
        interval = eachDayOfInterval({ start: startDate, end: now });
        break;
    }

    const dataMap = new Map<string, number>();
    interval.forEach((date) => {
      const label = format(date, formatStr, { locale: ptBR });
      // Capitalizar primeira letra para meses (Ex: Mar)
      const finalLabel = label.charAt(0).toUpperCase() + label.slice(1);
      dataMap.set(finalLabel, 0);
    });

    orders.forEach((order) => {
      const orderDate = new Date(order.created_at);
      let label = '';

      if (range === 'today') {
        label = format(startOfHour(orderDate), 'HH:00');
      } else if (range === '6m' || range === '12m') {
        const rawLabel = format(startOfMonth(orderDate), 'MMM', {
          locale: ptBR,
        });
        label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
      } else {
        label = format(orderDate, formatStr);
      }

      if (dataMap.has(label)) {
        dataMap.set(label, dataMap.get(label)! + Number(order.total_value));
      }
    });

    return Array.from(dataMap.entries()).map(([name, vendas]) => ({
      name,
      vendas,
    }));
  }, [orders, range]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Activity size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="font-black text-slate-800 dark:text-white leading-none">
              Fluxo de Caixa
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
              {range === 'today'
                ? 'Visão por Hora'
                : range === '6m' || range === '12m'
                  ? 'Visão Mensal'
                  : 'Visão Diária'}
            </p>
          </div>
        </div>
      </div>
      <div className="flex-1 w-full min-h-[300px]">
        <SalesBarChart data={chartData} />
      </div>
    </div>
  );
}
