'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import ChartWrapper from '@/components/ChartWrapper';

interface SalesData {
  name: string;
  vendas: number;
}

interface Props {
  data: SalesData[];
  primaryColor?: string; // Cor primária do usuário para branding dinâmico
}

export const SalesBarChart = ({
  data,
  primaryColor = '#4f46e5', // Fallback: Indigo-600
}: Props) => {
  return (
    <div className="h-[400px] w-full rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <h3 className="mb-6 text-lg font-semibold text-gray-900 dark:text-slate-50">
        Vendas por Mês
      </h3>
      <ChartWrapper height={300}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#E5E7EB"
              className="dark:stroke-slate-700"
            />
            <XAxis
              dataKey="name"
              stroke="#6B7280"
              className="dark:stroke-slate-400"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#6B7280"
              className="dark:stroke-slate-400"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `R$ ${value}`}
            />
            <Tooltip
              cursor={{ fill: '#F3F4F6' }}
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              className="dark:bg-slate-800 dark:border-slate-700"
            />
            <Bar
              dataKey="vendas"
              fill={primaryColor}
              radius={[4, 4, 0, 0]}
              barSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartWrapper>
    </div>
  );
};
