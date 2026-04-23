'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function ApproveRejectButtons({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleApprove = async () => {
    if (!confirm('Aprovar pré-cadastro e vincular cliente ao pedido?')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/customers/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const json = await res.json();
      if (json?.success) {
        toast.success('Cliente criado e pedido vinculado.');
        router.refresh();
      } else {
        toast.error(json?.error || 'Erro ao aprovar.');
      }
    } catch (e: any) {
      toast.error('Erro na requisição');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt('Motivo da reprovação (opcional)');
    if (!confirm('Reprovar o cadastro e cancelar o pedido?')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/customers/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, reason }),
      });
      const json = await res.json();
      if (json?.success) {
        toast.success('Pedido reprovado.');
        router.refresh();
      } else {
        toast.error(json?.error || 'Erro ao reprovar.');
      }
    } catch (e: any) {
      toast.error('Erro na requisição');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <button onClick={handleApprove} disabled={loading} className="px-2 py-1 bg-emerald-600 text-white rounded">Aprovar</button>
      <button onClick={handleReject} disabled={loading} className="px-2 py-1 bg-red-600 text-white rounded">Reprovar</button>
    </div>
  );
}
