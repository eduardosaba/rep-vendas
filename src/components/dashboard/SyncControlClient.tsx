'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Zap, Play } from 'lucide-react';

export default function SyncControlClient({
  jobId,
  totals: _totals,
}: {
  jobId?: string | null;
  totals?: { total_count?: number; completed_count?: number } | null;
}) {
  const [chunkSize, setChunkSize] = useState(20);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleForceChunk = async () => {
    setIsProcessing(true);
    const toastId = toast.loading('Solicitando lote...');
    try {
      const res = await fetch('/api/admin/sync-chunk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chunkSize, jobId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'Falha ao solicitar chunk');
      toast.success('Lote solicitado com sucesso!', { id: toastId });
      // atualiza página para pegar novo job/contadores
      try {
        window.location.reload();
      } catch {}
    } catch (err: unknown) {
      toast.error(String(err) || 'Erro ao solicitar lote', { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="text-xs text-gray-500">Próximo lote:</div>
      <input
        type="number"
        min={1}
        max={500}
        value={chunkSize}
        onChange={(e) => setChunkSize(Number(e.target.value))}
        className="w-20 px-2 py-1 rounded border bg-white dark:bg-slate-800"
      />
      <button
        onClick={handleForceChunk}
        disabled={isProcessing}
        className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50"
      >
        {isProcessing ? <Play className="animate-spin" /> : <Zap />}
        Forçar Lote
      </button>
    </div>
  );
}
