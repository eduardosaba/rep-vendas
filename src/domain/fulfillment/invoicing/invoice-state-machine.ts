import { InvoiceStatus, FiscalStatus } from './types'

export class InvoiceStateMachine {
  private static readonly VALID_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
    [InvoiceStatus.DRAFT]: [InvoiceStatus.GENERATED, InvoiceStatus.CANCELLED],
    [InvoiceStatus.GENERATED]: [InvoiceStatus.ISSUED, InvoiceStatus.REJECTED, InvoiceStatus.CANCELLED],
    [InvoiceStatus.ISSUED]: [InvoiceStatus.CANCELLED], // Cancelamento fiscal após emitida
    [InvoiceStatus.REJECTED]: [InvoiceStatus.GENERATED, InvoiceStatus.CANCELLED], // Pode tentar novamente
    [InvoiceStatus.CANCELLED]: [] // Estado terminal
  }

  static canTransition(current: InvoiceStatus, next: InvoiceStatus): boolean {
    return this.VALID_TRANSITIONS[current]?.includes(next) ?? false
  }

  static assertTransition(current: InvoiceStatus, next: InvoiceStatus): void {
    if (!this.canTransition(current, next)) {
      throw new Error(`Transição de faturamento inválida de ${current} para ${next}`)
    }
  }

  static getNextStatusFromFiscal(fiscal: FiscalStatus): InvoiceStatus | null {
    switch(fiscal) {
      case FiscalStatus.WAITING_PROVIDER:
      case FiscalStatus.PROCESSING:
        return InvoiceStatus.GENERATED
      case FiscalStatus.AUTHORIZED:
        return InvoiceStatus.ISSUED
      case FiscalStatus.DENIED:
        return InvoiceStatus.REJECTED
      default:
        return null
    }
  }
}
