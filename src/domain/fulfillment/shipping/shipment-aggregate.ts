import { ShipmentState, ShipmentStatus } from './types'
import { ShipmentStateMachine } from './shipment-state-machine'
import { ShipmentPolicy } from './shipment-policy'
import { InvoiceStatus } from '../invoicing/types'

export class ShipmentAggregate {
  private state: ShipmentState

  private constructor(state: ShipmentState) {
    this.state = state
  }

  static load(state: ShipmentState): ShipmentAggregate {
    return new ShipmentAggregate(state)
  }

  static create(
    shipmentId: string, 
    orderId: string, 
    invoiceId: string, 
    orgId: string,
    invoiceStatus: InvoiceStatus
  ): ShipmentAggregate {
    if (!ShipmentPolicy.canCreateShipment(invoiceStatus)) {
      throw new Error('Não é possível gerar expedição para um pedido sem Nota Fiscal emitida.')
    }
    
    return new ShipmentAggregate({
      id: shipmentId,
      order_id: orderId,
      invoice_id: invoiceId,
      organization_id: orgId,
      status: ShipmentStatus.READY // Já nasce pronto para a transportadora
    })
  }

  getState(): ShipmentState {
    return this.state
  }

  assignCarrier(carrierId: string): void {
    // Permite trocar transportadora apenas se ainda não saiu
    if (this.state.status === ShipmentStatus.DISPATCHED || this.state.status === ShipmentStatus.IN_TRANSIT || this.state.status === ShipmentStatus.DELIVERED) {
       throw new Error('Não é possível trocar a transportadora de um pedido que já saiu da base.')
    }
    this.state.carrier_id = carrierId
  }

  dispatch(trackingCode?: string, trackingUrl?: string, estimatedDate?: string): void {
    if (!ShipmentPolicy.canDispatch(this.state)) {
      throw new Error('Expedição não está pronta ou falta transportadora vinculada.')
    }

    ShipmentStateMachine.assertTransition(this.state.status, ShipmentStatus.DISPATCHED)
    
    this.state.status = ShipmentStatus.DISPATCHED
    this.state.shipped_at = new Date().toISOString()
    if (trackingCode) this.state.tracking_code = trackingCode
    if (trackingUrl) this.state.tracking_url = trackingUrl
    if (estimatedDate) this.state.estimated_delivery_date = estimatedDate
  }

  markInTransit(): void {
    ShipmentStateMachine.assertTransition(this.state.status, ShipmentStatus.IN_TRANSIT)
    this.state.status = ShipmentStatus.IN_TRANSIT
  }

  markDelivered(proofUrl: string): void {
    if (!ShipmentPolicy.canMarkAsDelivered(this.state, proofUrl)) {
      throw new Error('Evidência de entrega (URL do comprovante) é obrigatória para marcar como entregue.')
    }
    
    ShipmentStateMachine.assertTransition(this.state.status, ShipmentStatus.DELIVERED)
    
    this.state.status = ShipmentStatus.DELIVERED
    this.state.delivery_proof_url = proofUrl
    this.state.delivery_confirmed_at = new Date().toISOString()
  }

  markFailed(): void {
    ShipmentStateMachine.assertTransition(this.state.status, ShipmentStatus.FAILED)
    this.state.status = ShipmentStatus.FAILED
  }
}
