import { CommercialStatus, OperationalStatus, OrderEventType, OrderTransitionResult } from './types'
import { OrderStateMachine } from './order-state-machine'

export class OrderAggregate {
  private id: string;
  private commercialStatus: CommercialStatus;
  private operationalStatus: OperationalStatus;
  private version: number;

  constructor(id: string, commercialStatus: CommercialStatus, operationalStatus: OperationalStatus, version: number) {
    this.id = id;
    this.commercialStatus = commercialStatus;
    this.operationalStatus = operationalStatus;
    this.version = version;
  }

  /**
   * COMANDO: Aprovar Ordem de Venda (Liberação por Gerente/Diretoria)
   */
  public approve(): OrderTransitionResult {
    const targetCommercial = CommercialStatus.APPROVED;
    
    if (!OrderStateMachine.isValidCommercialMove(this.commercialStatus, targetCommercial)) {
      throw new Error(`Transição ilegal: Impossível mover pedido de '${this.commercialStatus}' para '${targetCommercial}'.`);
    }

    return {
      commercialStatus: targetCommercial,
      operationalStatus: this.operationalStatus, // Mantém o status logístico corrente
      eventType: OrderEventType.APPROVED,
      expectedVersion: this.version
    };
  }

  /**
   * COMANDO: Rejeitar Ordem de Venda (Derrubada por Risco/Comercial com Motivação)
   */
  public reject(reason: string): OrderTransitionResult {
    const targetCommercial = CommercialStatus.REJECTED;
    const targetOperational = OperationalStatus.CANCELLED;

    if (!reason || reason.trim().length === 0) {
      throw new Error('Operação negada: É obrigatório justificar o motivo da rejeição comercial.');
    }

    if (!OrderStateMachine.isValidCommercialMove(this.commercialStatus, targetCommercial)) {
      throw new Error(`Transição ilegal: Não é permitido rejeitar um pedido com status '${this.commercialStatus}'.`);
    }

    return {
      commercialStatus: targetCommercial,
      operationalStatus: targetOperational,
      eventType: OrderEventType.REJECTED,
      expectedVersion: this.version,
      reason: reason.trim()
    };
  }
}
