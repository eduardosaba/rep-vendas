'use client';

import { useState } from 'react';
import { RefreshCcw, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/hooks/useConfirm';

export function ReprocessButton({ disabled }: { disabled?: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { confirm } = useConfirm();

  const handleReprocess = async () => {
    const confirmed = await confirm({
      title: 'Reprocessar Erros',
      description:
        'Deseja reenviar todos os erros para a fila de processamento? Isso resetará o status de todos os produtos com falhas para "pending".',
      confirmText: 'Sim, Reprocessar',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/reprocess-errors', {
        method: 'POST',
      });
      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'Produtos reenviados para fila!', {
          description: `${data.count} produtos serão reprocessados.`,
        });
        router.refresh(); // Atualiza os números na página de auditoria
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error) {
      toast.error('Erro ao tentar reprocessar', {
        description:
          error instanceof Error ? error.message : 'Tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleReprocess}
      disabled={loading || disabled}
      className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-lg shadow-indigo-100 dark:shadow-none"
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <RefreshCcw className="w-5 h-5" />
      )}
      Reprocessar Erros
    </Button>
  );
}
