import { CommercialStatus, OperationalStatus } from './types'

/**
 * Grafo Determinístico de Transições Legais do Fluxo Comercial B2B
 */
const COMMERCIAL_TRANSITIONS: Record<CommercialStatus, CommercialStatus[]> = {
  [CommercialStatus.DRAFT]: [CommercialStatus.PENDING_APPROVAL, CommercialStatus.CANCELLED],
  [CommercialStatus.PENDING_APPROVAL]: [CommercialStatus.APPROVED, CommercialStatus.REJECTED, CommercialStatus.CANCELLED],
  [CommercialStatus.APPROVED]: [CommercialStatus.CANCELLED],
  [CommercialStatus.REJECTED]: [],
  [CommercialStatus.CANCELLED]: []
};

/**
 * Grafo Determinístico de Transições Legais da Esteira Operacional Logística
 */
const OPERATIONAL_TRANSITIONS: Record<OperationalStatus, OperationalStatus[]> = {
  [OperationalStatus.PENDING]: [OperationalStatus.PICKING, OperationalStatus.CANCELLED],
  [OperationalStatus.PICKING]: [OperationalStatus.SEPARATED, OperationalStatus.CANCELLED],
  [OperationalStatus.SEPARATED]: [OperationalStatus.INVOICED, OperationalStatus.CANCELLED],
  [OperationalStatus.INVOICED]: [OperationalStatus.SHIPPED],
  [OperationalStatus.SHIPPED]: [OperationalStatus.DELIVERED],
  [OperationalStatus.DELIVERED]: [],
  [OperationalStatus.CANCELLED]: []
};

export const OrderStateMachine = {
  isValidCommercialMove(from: CommercialStatus, to: CommercialStatus): boolean {
    return COMMERCIAL_TRANSITIONS[from]?.includes(to) ?? false;
  },

  isValidOperationalMove(from: OperationalStatus, to: OperationalStatus): boolean {
    return OPERATIONAL_TRANSITIONS[from]?.includes(to) ?? false;
  }
};
