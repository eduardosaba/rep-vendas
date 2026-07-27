import { ShipmentState, ShipmentStatus } from './types'
import { InvoiceStatus } from '../invoicing/types'

export class ShipmentPolicy {
  /**
   * Não criar envio sem NF válida
   */
  static canCreateShipment(invoiceStatus: InvoiceStatus): boolean {
    return invoiceStatus === InvoiceStatus.ISSUED
  }

  /**
   * Não despachar sem transportadora
   */
  static canDispatch(state: ShipmentState): boolean {
    if (state.status !== ShipmentStatus.READY) return false
    if (!state.carrier_id) return false
    return true
  }

  /**
   * Não marcar como entregue sem evidência (comprovante/assinatura)
   */
  static canMarkAsDelivered(state: ShipmentState, proofUrl?: string): boolean {
    if (state.status !== ShipmentStatus.IN_TRANSIT && state.status !== ShipmentStatus.DISPATCHED) {
      return false
    }
    
    // Regra obrigatória: evidência de entrega
    if (!proofUrl && !state.delivery_proof_url) return false
    
    return true
  }
}
