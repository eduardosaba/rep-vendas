import { OrderStateMachine } from '@/domain/orders/order-state-machine';
import { CommercialStatus, OperationalStatus } from '@/domain/orders/types';

describe('OrderStateMachine - Regras da Máquina de Estados B2B', () => {
  describe('Transições Comerciais', () => {
    it('deve permitir fluxo normal: draft -> submitted -> under_review -> approved', () => {
      expect(OrderStateMachine.isValidCommercialMove(CommercialStatus.DRAFT, CommercialStatus.SUBMITTED)).toBe(true);
      expect(OrderStateMachine.isValidCommercialMove(CommercialStatus.SUBMITTED, CommercialStatus.UNDER_REVIEW)).toBe(true);
      expect(OrderStateMachine.isValidCommercialMove(CommercialStatus.UNDER_REVIEW, CommercialStatus.APPROVED)).toBe(true);
    });

    it('deve permitir cancelamento a partir de draft, submitted e under_review', () => {
      expect(OrderStateMachine.isValidCommercialMove(CommercialStatus.DRAFT, CommercialStatus.CANCELLED)).toBe(true);
      expect(OrderStateMachine.isValidCommercialMove(CommercialStatus.SUBMITTED, CommercialStatus.CANCELLED)).toBe(true);
      expect(OrderStateMachine.isValidCommercialMove(CommercialStatus.UNDER_REVIEW, CommercialStatus.CANCELLED)).toBe(true);
    });

    it('deve rejeitar transição direta de draft para approved sem submissão/análise', () => {
      expect(OrderStateMachine.isValidCommercialMove(CommercialStatus.DRAFT, CommercialStatus.APPROVED)).toBe(false);
      expect(() =>
        OrderStateMachine.transitionCommercial(CommercialStatus.DRAFT, CommercialStatus.APPROVED, 1)
      ).toThrow('Transição comercial inválida: draft → approved');
    });

    it('não deve permitir transições a partir de estados terminais (rejected, cancelled)', () => {
      expect(OrderStateMachine.isValidCommercialMove(CommercialStatus.REJECTED, CommercialStatus.SUBMITTED)).toBe(false);
      expect(OrderStateMachine.isValidCommercialMove(CommercialStatus.CANCELLED, CommercialStatus.DRAFT)).toBe(false);
      expect(OrderStateMachine.isCommercialTerminal(CommercialStatus.REJECTED)).toBe(true);
      expect(OrderStateMachine.isCommercialTerminal(CommercialStatus.CANCELLED)).toBe(true);
    });
  });

  describe('Transições Operacionais Logísticas', () => {
    it('deve proibir avanço operacional se o status comercial não for APPROVED', () => {
      expect(
        OrderStateMachine.isValidOperationalMove(
          OperationalStatus.PENDING_FULFILLMENT,
          OperationalStatus.PROCESSING,
          CommercialStatus.SUBMITTED
        )
      ).toBe(false);

      expect(() =>
        OrderStateMachine.transitionOperational(
          OperationalStatus.PENDING_FULFILLMENT,
          OperationalStatus.PROCESSING,
          CommercialStatus.SUBMITTED,
          1
        )
      ).toThrow(/requer commercial_status=approved/);
    });

    it('deve permitir avanço operacional completo quando comercial for APPROVED', () => {
      expect(
        OrderStateMachine.isValidOperationalMove(
          OperationalStatus.PENDING_FULFILLMENT,
          OperationalStatus.PROCESSING,
          CommercialStatus.APPROVED
        )
      ).toBe(true);

      expect(
        OrderStateMachine.isValidOperationalMove(
          OperationalStatus.PROCESSING,
          OperationalStatus.SHIPPED,
          CommercialStatus.APPROVED
        )
      ).toBe(true);

      expect(
        OrderStateMachine.isValidOperationalMove(
          OperationalStatus.SHIPPED,
          OperationalStatus.DELIVERED,
          CommercialStatus.APPROVED
        )
      ).toBe(true);
    });

    it('não deve permitir retroceder de delivered', () => {
      expect(
        OrderStateMachine.isValidOperationalMove(
          OperationalStatus.DELIVERED,
          OperationalStatus.PROCESSING,
          CommercialStatus.APPROVED
        )
      ).toBe(false);
      expect(OrderStateMachine.isOperationalTerminal(OperationalStatus.DELIVERED)).toBe(true);
    });
  });
});
