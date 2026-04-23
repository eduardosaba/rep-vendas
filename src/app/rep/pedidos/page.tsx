'use server';

import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function Page({ searchParams }: { searchParams?: { status?: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // fetch orders for this rep
  let query = supabase
    .from('orders')
    .select('id, display_id, total_value, status, faturado_at, despachado_at, entregue_at')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200);

  if (searchParams?.status === 'paid') {
    query = query.in('status', ['Confirmado', 'Entregue']);
  }

  const { data: orders } = await query;

  const rows = orders || [];

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-black italic text-slate-800">Meus Pedidos</h2>
      {searchParams?.status === 'paid' ? (
        <p className="text-xs font-bold text-emerald-600 uppercase">Filtro ativo: pedidos pagos/faturados</p>
      ) : null}

      <div className="space-y-4">
        {rows.map((o: any) => (
          <div key={o.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase">Pedido</p>
                <h3 className="font-bold text-slate-800">Pedido #{o.display_id}</h3>
              </div>
              <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase ${o.status === 'Confirmado' ? 'bg-blue-50 text-blue-600' : o.status === 'Enviado' ? 'bg-purple-50 text-purple-600' : o.status === 'Entregue' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                {o.status}
              </div>
            </div>

            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs text-slate-500">Total • R$ {Number(o.total_value || 0).toFixed(2)}</p>
                <p className="text-[10px] text-emerald-600 font-bold mt-1">Comissão: R$ {/* Commission calculation is visible in commissions list */} —</p>
              </div>
              <a className="text-xs font-bold text-primary underline" href={`/rep/pedidos/${o.id}`}>Ver detalhes</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
