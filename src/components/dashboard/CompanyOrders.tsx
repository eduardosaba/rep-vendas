'use client';

import { useState } from 'react';
import { Package, Truck, XCircle, CheckCircle2, User, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function CompanyOrdersDashboard({ orders }: any) {
  const [filterRep, setFilterRep] = useState('');

  const filtered = filterRep
    ? orders.filter((o: any) => o.rep_name === filterRep)
    : orders;

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black">Gestão de Pedidos da Distribuidora</h2>
        <div className="flex gap-2">
          {/* filtro futuro */}
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-widest">
            <tr>
              <th className="p-4">Data/Pedido</th>
              <th className="p-4">Representante</th>
              <th className="p-4">Cliente</th>
              <th className="p-4">Valor</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((order: any) => (
              <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-700">#{order.number}</span>
                    <span className="text-[10px] text-slate-400">{new Date(order.created_at).toLocaleDateString()}</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                      {order.rep_name?.charAt(0) ?? '?'}
                    </div>
                    <span className="font-medium">{order.rep_name || '—'}</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex flex-col">
                    <span className="font-bold">{order.customer_name || order.client_name_guest}</span>
                    <span className="text-[10px] text-slate-500">{order.customer_city || ''}</span>
                  </div>
                </td>
                <td className="p-4 font-black text-slate-700">R$ {order.total_amount}</td>
                <td className="p-4">
                  <StatusBadge status={order.status} />
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="outline" title="Faturar" onClick={async () => await handleUpdate(order.id, 'faturado')}>
                      <Package size={14} />
                    </Button>
                    <Button size="icon" variant="outline" className="text-blue-600" title="Enviar" onClick={async () => await handleUpdate(order.id, 'enviado')}>
                      <Truck size={14} />
                    </Button>
                    <Button size="icon" variant="outline" className="text-red-600" title="Cancelar" onClick={async () => await handleUpdate(order.id, 'cancelado')}>
                      <XCircle size={14} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    pendente: 'bg-amber-100 text-amber-700',
    pending: 'bg-amber-100 text-amber-700',
    faturado: 'bg-blue-100 text-blue-700',
    enviado: 'bg-green-100 text-green-700',
    cancelado: 'bg-red-100 text-red-700',
  };
  const label = status || 'pendente';
  return <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${styles[label] || 'bg-gray-100 text-gray-700'}`}>{label}</span>;
}

async function handleUpdate(orderId: string, newStatus: string) {
  try {
    const res = await fetch('/api/admin/orders/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, newStatus }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Falha ao atualizar');
    toast.success('Status atualizado');
    // Optionally refresh page
    setTimeout(() => location.reload(), 600);
  } catch (e: any) {
    toast.error('Erro ao atualizar status', { description: e?.message });
  }
}
