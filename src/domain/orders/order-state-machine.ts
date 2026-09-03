import { CommercialStatus, OperationalStatus, OrderEventType, OrderTransitionResult } from './types';

/**
 * Grafo Determinístico de Transições Legais do Fluxo Comercial B2F
 * 
 * Regras:
 * - draft → submitted (pending_approval), approved, cancelled
 * - submitted / under_review (pending_approval) → approved, rejected, cancelled
 * - approved → cancelled (apenas regra administrativa)
 * - rejected → (terminal)
 * - cancelled → (terminal)
 */
const COMMERCIAL_TRANSITIONS: Record<string, CommercialStatus[]> = {
  [CommercialStatus.DRAFT]: [CommercialStatus.SUBMITTED, CommercialStatus.APPROVED, CommercialStatus.CANCELLED],
  [CommercialStatus.SUBMITTED]: [CommercialStatus.APPROVED, CommercialStatus.REJECTED, CommercialStatus.CANCELLED],
  [CommercialStatus.APPROVED]: [CommercialStatus.CANCELLED],
  [CommercialStatus.REJECTED]: [],
  [CommercialStatus.CANCELLED]: [],
};

/**
 * Grafo Determinístico de Transições Legais da Esteira Operacional Logística
 * 
 * Regras:
 * - O status operacional só deve avançar quando o comercial estiver 'approved'
 * - pending (pending_fulfillment) → picking (processing), cancelled
 * - picking (processing) → shipped, cancelled (apenas rollback operacional autorizado)
 * - shipped → delivered
 * - delivered → (terminal)
 * - cancelled → (terminal)
 */
const OPERATIONAL_TRANSITIONS: Record<string, OperationalStatus[]> = {
  [OperationalStatus.PENDING_FULFILLMENT]: [OperationalStatus.PROCESSING, OperationalStatus.CANCELLED],
  [OperationalStatus.PROCESSING]: [OperationalStatus.SHIPPED, OperationalStatus.CANCELLED],
  [OperationalStatus.SHIPPED]: [OperationalStatus.DELIVERED],
  [OperationalStatus.DELIVERED]: [],
  [OperationalStatus.CANCELLED]: [],
};

/**
 * Mapeia transição comercial para evento de domínio
 */
function getCommercialEvent(from: CommercialStatus, to: CommercialStatus): OrderEventType {
  if (from === CommercialStatus.DRAFT && to === CommercialStatus.SUBMITTED) return OrderEventType.SUBMITTED_FOR_APPROVAL;
  if (to === CommercialStatus.APPROVED) return OrderEventType.APPROVED;
  if (to === CommercialStatus.REJECTED) return OrderEventType.REJECTED;
  if (to === CommercialStatus.CANCELLED) return OrderEventType.CANCELLED;
  return OrderEventType.COMMERCIAL_STATUS_CHANGED;
}

/**
 * Mapeia transição operacional para evento de domínio
 */
function getOperationalEvent(from: OperationalStatus, to: OperationalStatus): OrderEventType {
  if (from === OperationalStatus.PENDING_FULFILLMENT && to === OperationalStatus.PROCESSING) return OrderEventType.FULFILLMENT_STARTED;
  if (to === OperationalStatus.SHIPPED) return OrderEventType.SHIPPED;
  if (to === OperationalStatus.DELIVERED) return OrderEventType.DELIVERED;
  return OrderEventType.OPERATIONAL_STATUS_CHANGED;
}

export const OrderStateMachine = {
  /**
   * Valida transição comercial
   */
  isValidCommercialMove(from: CommercialStatus, to: CommercialStatus): boolean {
    return COMMERCIAL_TRANSITIONS[from]?.includes(to) ?? false;
  },

  /**
   * Valida transição operacional
   * Requer que o status comercial seja APPROVED para avançar além de PENDING_FULFILLMENT
   */
  isValidOperationalMove(
    from: OperationalStatus, 
    to: OperationalStatus, 
    commercialStatus: CommercialStatus
  ): boolean {
    // Para qualquer avanço operacional (exceto cancelamento), o status comercial deve ser APPROVED
    if (to !== OperationalStatus.CANCELLED && commercialStatus !== CommercialStatus.APPROVED) {
      return false;
    }
    return OPERATIONAL_TRANSITIONS[from]?.includes(to) ?? false;
  },

  /**
   * Executa transição comercial com validações
   */
  transitionCommercial(
    currentStatus: CommercialStatus,
    targetStatus: CommercialStatus,
    currentVersion: number,
    reason?: string
  ): OrderTransitionResult {
    if (!this.isValidCommercialMove(currentStatus, targetStatus)) {
      throw new Error(
        `Transição comercial inválida: ${currentStatus} → ${targetStatus}`
      );
    }

    const eventType = getCommercialEvent(currentStatus, targetStatus);

    return {
      commercialStatus: targetStatus,
      operationalStatus: null,
      eventType,
      expectedVersion: currentVersion + 1,
      reason,
    };
  },

  /**
   * Executa transição operacional com validações
   */
  transitionOperational(
    currentStatus: OperationalStatus,
    targetStatus: OperationalStatus,
    commercialStatus: CommercialStatus,
    currentVersion: number,
    reason?: string
  ): OrderTransitionResult {
    if (!this.isValidOperationalMove(currentStatus, targetStatus, commercialStatus)) {
      throw new Error(
        `Transição operacional inválida: ${currentStatus} → ${targetStatus} (Comercial: ${commercialStatus})`
      );
    }

    const eventType = getOperationalEvent(currentStatus, targetStatus);

    return {
      commercialStatus: null,
      operationalStatus: targetStatus,
      eventType,
      expectedVersion: currentVersion + 1,
      reason,
    };
  },
};