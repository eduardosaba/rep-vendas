'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ThumbsUp, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  orderId: string | number;
  statusKey: 'pending' | 'confirmed' | 'delivered' | 'cancelled' | string;
}

export default function OrderStatusControls({ orderId, statusKey }: Props) {
  const router = useRouter();
  // usar sonner programático
  const [loading, setLoading] = useState<
    'confirm' | 'deliver' | 'cancel' | null
  >(null);

  async function updateStatus(target: 'confirmed' | 'delivered' | 'cancelled') {
    try {
      setLoading(
        target === 'confirmed'
          ? 'confirm'
          : target === 'delivered'
            ? 'deliver'
            : 'cancel'
      );
      // use globalThis.fetch to avoid lint/no-undef in some configs
      type FetchFn = (...args: any[]) => Promise<any>;
      const gw = globalThis as unknown as { fetch: FetchFn };
      const res = await gw.fetch('/api/orders/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, newStatus: target }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || 'Erro ao atualizar status');
      } else {
        toast.success('Status atualizado', {
          description: 'Pedido atualizado com sucesso',
        });
        // refresh server components
        router.refresh();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-2">
      {statusKey === 'pending' && (
        <button
          onClick={() => updateStatus('confirmed')}
          disabled={!!loading}
          className="w-full py-2.5 px-4 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
        >
          <ThumbsUp size={16} />{' '}
          {loading === 'confirm' ? 'Processando...' : 'Aprovar Pedido'}
        </button>
      )}

      {statusKey === 'confirmed' && (
        <button
          onClick={() => updateStatus('delivered')}
          disabled={!!loading}
          className="w-full py-2.5 px-4 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-bold hover:bg-green-100 transition-colors flex items-center justify-center gap-2"
        >
          <CheckCircle size={16} />{' '}
          {loading === 'deliver' ? 'Processando...' : 'Marcar Entregue'}
        </button>
      )}

      {statusKey !== 'cancelled' && statusKey !== 'delivered' && (
        <button
          onClick={() => updateStatus('cancelled')}
          disabled={!!loading}
          className="w-full py-2.5 px-4 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
        >
          <XCircle size={16} />{' '}
          {loading === 'cancel' ? 'Processando...' : 'Cancelar Pedido'}
        </button>
      )}
    </div>
  );
}
