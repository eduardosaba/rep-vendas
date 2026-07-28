import { InvoiceState, InvoiceStatus } from './types'

export class InvoicePolicy {
  
  /**
   * Valida se uma nota fiscal pode ser submetida para o provedor fiscal.
   */
  static canSubmitToProvider(state: InvoiceState): boolean {
    if (state.status !== InvoiceStatus.DRAFT && state.status !== InvoiceStatus.REJECTED) {
      return false
    }
    
    // Deve ter os snapshots capturados
    if (!state.customer_snapshot || !state.items_snapshot || state.items_snapshot.length === 0) {
      return false
    }

    if (state.total_amount <= 0) {
      return false
    }

    return true
  }

  /**
   * Valida se a nota pode ser cancelada por um usuário (regras comerciais/fiscais)
   */
  static canBeCancelled(state: InvoiceState): boolean {
    // Se já estiver cancelada
    if (state.status === InvoiceStatus.CANCELLED) return false
    
    return true
  }
}
