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

interface SalesBarChartProps {
  data: SalesData[];
  primaryColor?: string; // Cor primária do usuário para branding dinâmico
}

export default function SalesBarChart({
  data = [],
  primaryColor = '#4f46e5', // Fallback: Indigo-600
}: SalesBarChartProps) {
  return (
    <div className="rounded-lg bg-white dark:bg-slate-900 p-6 shadow">
      <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-slate-50">
        Vendas por Marca
      </h3>
      <ChartWrapper height={300}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#E5E7EB"
              className="dark:stroke-slate-700"
            />
            <XAxis
              dataKey="name"
              stroke="#6B7280"
              className="dark:stroke-slate-400"
            />
            <YAxis stroke="#6B7280" className="dark:stroke-slate-400" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
              }}
              className="dark:bg-slate-800 dark:border-slate-700"
            />
            <Bar dataKey="vendas" fill={primaryColor} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartWrapper>
    </div>
  );
}
