'use client'

import React from 'react';

function StatusBadge({ status }: { status?: string }) {
  const map = {
    Pendente: 'bg-yellow-100 text-yellow-700',
    Confirmado: 'bg-emerald-100 text-emerald-700',
    Enviado: 'bg-sky-100 text-sky-700',
    Entregue: 'bg-emerald-100 text-emerald-700',
    Cancelado: 'bg-red-100 text-red-700',
  } as Record<string, string>;
  const cls = map[status || ''] || 'bg-slate-100 text-slate-600';
  return <span className={`px-3 py-1 rounded-full text-[12px] font-bold ${cls}`}>{status || '—'}</span>;
}

type Order = any;

export function OrdersTeamTable({ orders }: { orders: Order[] }) {
  const formatDate = (d: string) => {
    try {
      return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(d));
    } catch {
      return d;
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-slate-50 border-b border-slate-100">
          <tr>
            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">Data/Hora</th>
            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">Representante</th>
            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">Cliente</th>
            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase text-center">Valor</th>
            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase text-right">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {(orders || []).map((order) => (
            <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
              <td className="px-8 py-6 text-sm font-medium">{formatDate(order.created_at)}</td>
              <td className="px-8 py-6">
                <span className="bg-primary/10 text-primary text-[10px] font-black px-3 py-1 rounded-full uppercase">
                  {order.seller_name}
                </span>
              </td>
              <td className="px-8 py-6 font-bold text-slate-800">{order.client_name || order.client_name_guest || '—'}</td>
              <td className="px-8 py-6 text-center font-black">R$ {Number(order.total_value || order.total_amount || 0).toFixed(2)}</td>
              <td className="px-8 py-6 text-right">
                <StatusBadge status={order.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
