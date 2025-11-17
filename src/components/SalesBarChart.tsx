import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface SalesData {
  name: string;
  vendas: number;
}

interface SalesBarChartProps {
  data: SalesData[];
}

export default function SalesBarChart({ data = [] }: SalesBarChartProps) {
  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h3 className="mb-4 text-lg font-medium text-gray-900">
        Vendas por Marca
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="vendas" fill="#3B82F6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
