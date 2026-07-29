// src/lib/observability/state-machine.ts

export type PaymentState =
  | 'draft'
  | 'pending'
  | 'pending_payment'
  | 'processing'
  | 'approved'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'chargeback';

// Definição matemática e explícita do grafo de transição
const VALID_TRANSITIONS: Record<PaymentState, PaymentState[]> = {
  draft: ['pending'],
  pending: ['pending_payment'],
  pending_payment: ['processing', 'pending_payment', 'cancelled', 'failed'],
  processing: ['approved', 'failed', 'cancelled', 'pending_payment'],
  approved: ['paid'],
  paid: ['refunded', 'chargeback'], // Estados terminais do fluxo feliz
  failed: ['pending_payment'], // Permite nova tentativa se o cartão for recusado
  cancelled: [], // Terminal
  refunded: [], // Terminal
  chargeback: [], // Terminal
};

interface ValidateTransitionInput {
  currentStatus: PaymentState;
  nextStatus: PaymentState;
  contextId: string;
}

/**
 * Pure State Machine (Zero I/O, Zero SDKs).
 * Proteção matemática contra race conditions e corrupção de fluxo.
 */
export function validateStateTransition({
  currentStatus,
  nextStatus,
  contextId,
}: ValidateTransitionInput): { valid: boolean; error?: string } {
  // Se o estado não mudar, é um No-Op idempotente válido
  if (currentStatus === nextStatus) {
    return { valid: true };
  }

  const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];

  if (!allowedTransitions.includes(nextStatus)) {
    return {
      valid: false,
      error: `[Máquina de Estados] Transição inválida para o contexto ${contextId}: Não é permitido mudar de '${currentStatus}' para '${nextStatus}'.`,
    };
  }

  return { valid: true };
}

/**
 * Normalizador Único e Centralizado de Webhooks do Mercado Pago.
 * Elimina os fantasmas de variação de payloads da API externa.
 */
export function normalizeMPWebhook(payload: any) {
  const externalId = payload?.data?.id ?? payload?.id ?? payload?.resource;
  const type = payload?.type ?? payload?.action ?? 'unknown';
  const orderId =
    payload?.data?.external_reference ??
    payload?.external_reference ??
    payload?.metadata?.order_id;

  return {
    externalId: externalId ? String(externalId) : null,
    eventType: String(type),
    orderId: orderId ? String(orderId) : null,
  };
}
