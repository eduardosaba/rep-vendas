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

interface SalesBarChartProps {
  data: {
    name: string;
    vendas: number;
  }[];
}

export function SalesBarChart({ data }: SalesBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{
          top: 10,
          right: 10,
          left: -20, // Ajuste para o texto do eixo Y não cortar
          bottom: 0,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
        
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: '#6B7280', fontSize: 12 }} 
          dy={10}
        />
        
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: '#6B7280', fontSize: 12 }}
          tickFormatter={(value) => `R$ ${value}`} 
        />
        
        <Tooltip
          cursor={{ fill: '#F3F4F6' }}
          contentStyle={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
          // AQUI ESTÁ A MÁGICA DO R$
          formatter={(value: number) => [
            new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(value),
            'Vendas',
          ]}
          labelStyle={{ color: '#374151', fontWeight: 'bold', marginBottom: '4px' }}
        />
        
        <Bar 
          dataKey="vendas" 
          fill="var(--primary)" 
          radius={[6, 6, 0, 0]} 
          barSize={40}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}