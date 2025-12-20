'use client';

import { useEffect, useState } from 'react';
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

interface SalesBarChartProps {
  data: {
    name: string;
    vendas: number;
  }[];
}

export function SalesBarChart({ data }: SalesBarChartProps) {
  // CORREÇÃO: Inicializa a cor diretamente no useState (Lazy Initializer)
  // Isso evita o erro de "setState in effect" na montagem
  const [primaryColor, setPrimaryColor] = useState(() => {
    if (typeof document === 'undefined') return '#b9722e';
    const root = document.documentElement;
    const inlineColor = root.style.getPropertyValue('--primary').trim();
    if (inlineColor) return inlineColor;
    const computedColor = getComputedStyle(root)
      .getPropertyValue('--primary')
      .trim();
    return computedColor || '#b9722e';
  });

  useEffect(() => {
    // A função getPrimaryColor precisa ser recriada ou movida para fora se for usada em múltiplos lugares
    // Mas para o observer, podemos defini-la aqui dentro
    const updateColor = () => {
      if (typeof document === 'undefined') return;
      const root = document.documentElement;
      const inlineColor = root.style.getPropertyValue('--primary').trim();
      const computedColor = getComputedStyle(root)
        .getPropertyValue('--primary')
        .trim();
      setPrimaryColor(inlineColor || computedColor || '#b9722e');
    };

    const observer = new MutationObserver(updateColor);

    if (document.documentElement) {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['style'],
        subtree: false,
      });
    }

    return () => observer.disconnect();
  }, []);

  return (
    <ChartWrapper height={300} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#E5E7EB"
          />
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
            formatter={(value: number) => [
              new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(value),
              'Vendas',
            ]}
            labelStyle={{
              color: '#374151',
              fontWeight: 'bold',
              marginBottom: '4px',
            }}
          />
          <Bar
            dataKey="vendas"
            fill={primaryColor}
            radius={[6, 6, 0, 0]}
            barSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}
