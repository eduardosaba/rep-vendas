import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface SalesData {
  name: string;
  vendas: number;
}

interface SalesBarChartProps {
  data: SalesData[];
}

export default function SalesBarChart({ data = [] }: SalesBarChartProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
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
