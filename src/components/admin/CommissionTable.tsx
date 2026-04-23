'use client'

import React, { useState } from 'react';

export function CommissionTable({ commissions, onUpdate }: { commissions: any[]; onUpdate?: () => void }) {
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries((commissions || []).map((c: any) => [c.seller_id, Number(c.commission_rate || 0)]))
  );

  const handleSave = async (seller_id: string) => {
    const rate = Number(values[seller_id] || 0);
    try {
      const res = await fetch('/api/company/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: seller_id, commission_rate: rate }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Erro');
      setEditing((s) => ({ ...s, [seller_id]: false }));
      if (onUpdate) onUpdate();
    } catch (e: any) {
      alert('Erro ao salvar: ' + (e?.message || String(e)));
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-slate-50 border-b border-slate-100">
          <tr>
            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">Representante</th>
            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">Total Faturado</th>
            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase text-center">% Média</th>
            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase text-right">Comissão a Pagar</th>
            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {(commissions || []).map((item) => (
            <tr key={item.seller_id} className="hover:bg-slate-50/50 transition-colors">
              <td className="px-8 py-6 font-bold text-slate-800">{item.seller_name}</td>
              <td className="px-8 py-6 text-sm">R$ {Number(item.total_sales || 0).toFixed(2)}</td>
              <td className="px-8 py-6 text-center">
                {editing[item.seller_id] ? (
                  <input
                    type="number"
                    className="w-24 text-center rounded-md border px-2 py-1"
                    value={values[item.seller_id]}
                    onChange={(e) => setValues((s) => ({ ...s, [item.seller_id]: Number(e.target.value) }))}
                  />
                ) : (
                  <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-black">{item.commission_rate}%</span>
                )}
              </td>
              <td className="px-8 py-6 text-right font-black text-primary">R$ {Number(item.commission_to_pay || 0).toFixed(2)}</td>
              <td className="px-8 py-6 text-right">
                {editing[item.seller_id] ? (
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditing((s) => ({ ...s, [item.seller_id]: false }))} className="text-sm px-3 py-1 rounded-lg border">Cancelar</button>
                    <button onClick={() => handleSave(item.seller_id)} className="text-sm px-3 py-1 rounded-lg bg-slate-900 text-white">Salvar</button>
                  </div>
                ) : (
                  <button onClick={() => setEditing((s) => ({ ...s, [item.seller_id]: true }))} className="text-sm px-3 py-1 rounded-lg border">Editar %</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
