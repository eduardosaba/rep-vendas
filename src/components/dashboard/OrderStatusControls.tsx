'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ThumbsUp, CheckCircle, XCircle, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

type OrderStatus =
  | 'pending'
  | 'pending_review'
  | 'awaiting_billing'
  | 'confirmed'
  | 'delivered'
  | 'cancelled'
  | (string & {});

type TargetStatus = 'pending' | 'confirmed' | 'delivered' | 'cancelled';

interface Props {
  orderId: string | number;
  statusKey: OrderStatus;
  /** Deve ser calculado no servidor usando o vínculo real do pedido, não só o papel do usuário logado. */
  distributorApprovalRequired?: boolean;
  /** Somente o responsável autorizado pela distribuidora vinculada pode aprovar. */
  canApproveDistributorOrder?: boolean;
  /** Autorização calculada no servidor para gerenciar este pedido. */
  canManageOrder?: boolean;
}

export default function OrderStatusControls({
  orderId,
  statusKey,
  distributorApprovalRequired = false,
  canApproveDistributorOrder = false,
  canManageOrder = false,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<TargetStatus | null>(null);
  const [currentStatus, setCurrentStatus] = useState<OrderStatus>(statusKey);

  useEffect(() => {
    setCurrentStatus(statusKey);
  }, [statusKey, orderId]);

  // Regras de Transição e Bloqueio de Aprovação Antecipada:
  // 1. Representante Independente: pode confirmar diretamente quando em pending ou pending_review.
  // 2. Distribuidora Vinculada: SÓ pode confirmar após a liberação do representante (status === 'pending').
  const canConfirm =
    canManageOrder &&
    ((!distributorApprovalRequired &&
      (currentStatus === 'pending' || currentStatus === 'pending_review')) ||
      (distributorApprovalRequired &&
        canApproveDistributorOrder &&
        currentStatus === 'pending'));

  // Liberação: representante vinculado com pedido em revisão
  const canRelease =
    canManageOrder &&
    distributorApprovalRequired &&
    !canApproveDistributorOrder &&
    currentStatus === 'pending_review';

  // Entrega:
  const canDeliver =
    canManageOrder &&
    (!distributorApprovalRequired || canApproveDistributorOrder) &&
    currentStatus === 'confirmed';

  // Cancelamento:
  const canCancel =
    canManageOrder &&
    currentStatus !== 'cancelled' &&
    currentStatus !== 'delivered';

  // Alertas de Espera:
  const waitingForDistributor =
    distributorApprovalRequired &&
    !canApproveDistributorOrder &&
    (currentStatus === 'pending' || currentStatus === 'pending_review');

  const waitingForRepresentativeRelease =
    distributorApprovalRequired &&
    canApproveDistributorOrder &&
    currentStatus === 'pending_review';

  async function updateStatus(target: TargetStatus) {
    if (loading) return;
    if (
      (target === 'pending' && !canRelease) ||
      (target === 'confirmed' && !canConfirm) ||
      (target === 'delivered' && !canDeliver) ||
      (target === 'cancelled' && !canCancel)
    )
      return;

    if (target === 'cancelled') {
      if (!window.confirm('Deseja realmente cancelar este pedido?')) return;
    }

    setLoading(target);
    try {
      const res = await fetch('/api/orders/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, newStatus: target }),
      });
      const data: { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data.error || 'Não foi possível atualizar o pedido.');

      setCurrentStatus(target);
      toast.success(
        target === 'pending'
          ? 'Pedido enviado para a distribuidora'
          : target === 'confirmed'
            ? 'Pedido confirmado com sucesso'
            : target === 'delivered'
              ? 'Pedido marcado como entregue'
              : 'Pedido cancelado com sucesso'
      );
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Erro inesperado ao atualizar o pedido.'
      );
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-2">
      {/* Aviso para o Representante Vinculado */}
      {waitingForDistributor && (
        <p
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {currentStatus === 'pending_review'
            ? 'Aguardando liberação do representante para envio à distribuidora.'
            : 'Pedido em análise e faturamento pela distribuidora vinculada.'}
        </p>
      )}

      {/* Aviso para a Distribuidora caso o pedido ainda não tenha sido liberado pelo representante */}
      {waitingForRepresentativeRelease && (
        <p
          role="status"
          className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900"
        >
          Aguardando liberação do representante para que a distribuidora possa aprovar e faturar.
        </p>
      )}

      {/* Botão de Liberação para o Representante */}
      {canRelease && (
        <button
          type="button"
          onClick={() => void updateStatus('pending')}
          disabled={loading !== null}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-300 bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50 shadow-sm"
        >
          {loading === 'pending' ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
          {loading === 'pending'
            ? 'Enviando...'
            : 'Liberar e Enviar para Distribuidora'}
        </button>
      )}

      {/* Botão de Confirmação/Aprovação */}
      {canConfirm && (
        <button
          type="button"
          onClick={() => void updateStatus('confirmed')}
          disabled={loading !== null}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-bold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
        >
          {loading === 'confirmed' ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <ThumbsUp size={16} />
          )}
          {loading === 'confirmed'
            ? 'Processando...'
            : distributorApprovalRequired
              ? 'Aprovar Pedido'
              : 'Confirmar Pedido'}
        </button>
      )}

      {/* Botão de Entrega */}
      {canDeliver && (
        <button
          type="button"
          onClick={() => void updateStatus('delivered')}
          disabled={loading !== null}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-bold text-green-700 transition-colors hover:bg-green-100 disabled:opacity-50"
        >
          {loading === 'delivered' ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <CheckCircle size={16} />
          )}
          {loading === 'delivered' ? 'Processando...' : 'Marcar Entregue'}
        </button>
      )}

      {/* Botão de Cancelamento */}
      {canCancel && (
        <button
          type="button"
          onClick={() => void updateStatus('cancelled')}
          disabled={loading !== null}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
        >
          {loading === 'cancelled' ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <XCircle size={16} />
          )}
          {loading === 'cancelled' ? 'Processando...' : 'Cancelar Pedido'}
        </button>
      )}
    </div>
  );
}
