'use client';

import { useState } from 'react';
import { RefreshCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/hooks/useConfirm';

export default function ReprocessRowButton({
  brand,
  status,
}: {
  brand: string | null | undefined;
  status: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { confirm } = useConfirm();

  const handle = async () => {
    const confirmed = await confirm({
      title: 'Reprocessar itens',
      description: `Deseja reprocessar os produtos da marca "${brand || 'Sem Marca'}" com status "${status}"?`,
      confirmText: 'Sim, Reprocessar',
      cancelText: 'Cancelar',
    });
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch('/api/admin/reprocess-by-brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand: brand || null, status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro desconhecido');
      toast.success(
        json.message || `Reprocessamento agendado para ${json.count} produtos.`
      );
      router.refresh();
    } catch (err: any) {
      toast.error('Falha ao solicitar reprocessamento');
      console.error('reprocess-by-brand error', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      onClick={handle}
      disabled={loading}
      className="ml-2 inline-flex items-center gap-2"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <RefreshCcw className="w-4 h-4" />
      )}
      Reprocessar
    </Button>
  );
}
