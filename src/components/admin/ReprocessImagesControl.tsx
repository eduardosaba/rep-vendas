'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';

export default function ReprocessImagesControl({
  initialCount = 0,
}: {
  initialCount?: number;
}) {
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(initialCount);

  const handleReprocess = async () => {
    if (!confirm('Deseja reprocessar todos os itens com falha?')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/reprocess-images', {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro desconhecido');
      toast.success(`Reprocessamento agendado para ${json.reset} itens.`);
      setCount(json.reset || 0);
    } catch (err: any) {
      console.error('reprocess error', err);
      toast.error('Falha ao reprocessar: ' + (err?.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lg:col-span-3 bg-amber-50 border border-amber-200 rounded-2xl p-6 mt-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-amber-800 font-bold">Saúde das Imagens</h3>
          <p className="text-amber-700 text-xs">
            Existem itens aguardando processamento ou com erro de download.
          </p>
          <p className="mt-2 text-sm text-amber-800">
            Itens com falha: <strong>{count}</strong>
          </p>
        </div>
        <div>
          <Button
            variant="outline"
            className="bg-white border-amber-300 text-amber-700 hover:bg-amber-100"
            onClick={handleReprocess}
            disabled={loading || count === 0}
          >
            {loading ? 'Processando...' : 'Reprocessar Falhas'}
          </Button>
        </div>
      </div>
    </div>
  );
}
