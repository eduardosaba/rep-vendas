'use client'

import React from 'react';

type DataPoint = { seller_name: string; total_vendido: number; qtd_pedidos: number };

export default function SalesChart({ data }: { data: DataPoint[] | any[] }) {
  const max = Math.max(1, ...(data || []).map((d: any) => Number(d.total_vendido || 0)));

  return (
    <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm h-80">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-black italic text-lg text-slate-900">Desempenho da Equipe</h3>
        <select className="text-xs font-bold bg-slate-50 border-none rounded-xl px-4 py-2">
          <option>Últimos 7 dias</option>
          <option>Últimos 30 dias</option>
        </select>
      </div>

      <div className="w-full h-48 bg-slate-50 rounded-2xl flex items-end justify-between p-4 gap-2">
        {(data || []).map((d: any, i: number) => {
          const h = Math.round((Number(d.total_vendido || 0) / max) * 100);
          return (
            <div key={i} className="flex-1 h-full px-1">
              <div style={{ height: `${h}%` }} className="w-full bg-primary/20 rounded-t-lg hover:bg-primary transition-colors cursor-pointer relative group">
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  R$ {Number(d.total_vendido || 0).toFixed(2)}
                </span>
              </div>
              <div className="text-xs text-center mt-2 truncate">{d.seller_name || 'Direta'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
