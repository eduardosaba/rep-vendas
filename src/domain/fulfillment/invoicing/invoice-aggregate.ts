import { InvoiceState, InvoiceStatus, FiscalStatus } from './types'
import { InvoiceStateMachine } from './invoice-state-machine'
import { InvoicePolicy } from './invoice-policy'

export class InvoiceAggregate {
  private state: InvoiceState

  private constructor(state: InvoiceState) {
    this.state = state
  }

  static load(state: InvoiceState): InvoiceAggregate {
    return new InvoiceAggregate(state)
  }

  static createDraft(
    invoiceId: string, 
    orderId: string, 
    orgId: string, 
    customerSnapshot: any, 
    itemsSnapshot: any[], 
    totalsSnapshot: any
  ): InvoiceAggregate {
    return new InvoiceAggregate({
      id: invoiceId,
      order_id: orderId,
      organization_id: orgId,
      status: InvoiceStatus.DRAFT,
      fiscal_status: FiscalStatus.WAITING_PROVIDER,
      total_amount: totalsSnapshot.total || 0,
      customer_snapshot: customerSnapshot,
      items_snapshot: itemsSnapshot,
      totals_snapshot: totalsSnapshot
    })
  }

  getState(): InvoiceState {
    return this.state
  }

  submitToProvider(actorId: string, providerName: string): void {
    if (!InvoicePolicy.canSubmitToProvider(this.state)) {
      throw new Error('A fatura não está em estado válido para ser submetida ao provedor fiscal.')
    }
    
    InvoiceStateMachine.assertTransition(this.state.status, InvoiceStatus.GENERATED)
    
    this.state.status = InvoiceStatus.GENERATED
    this.state.fiscal_status = FiscalStatus.PROCESSING
    this.state.fiscal_provider = providerName
    this.state.created_by = actorId // Quem enviou a ação
  }

  processFiscalResponse(fiscalStatus: FiscalStatus, providerResponse: any, invoiceNumber?: string, xmlUrl?: string, pdfUrl?: string, actorId?: string): void {
    const nextStatus = InvoiceStateMachine.getNextStatusFromFiscal(fiscalStatus)
    
    if (nextStatus) {
       InvoiceStateMachine.assertTransition(this.state.status, nextStatus)
       this.state.status = nextStatus
    }
    
    this.state.fiscal_status = fiscalStatus
    this.state.provider_response = providerResponse

    if (fiscalStatus === FiscalStatus.AUTHORIZED) {
      this.state.invoice_number = invoiceNumber
      this.state.xml_url = xmlUrl
      this.state.pdf_url = pdfUrl
      this.state.issued_at = new Date().toISOString()
      if (actorId) this.state.issued_by = actorId
    }
  }

  cancel(actorId: string, reason: string): void {
    if (!InvoicePolicy.canBeCancelled(this.state)) {
      throw new Error('A fatura não pode ser cancelada neste momento.')
    }

    InvoiceStateMachine.assertTransition(this.state.status, InvoiceStatus.CANCELLED)
    
    this.state.status = InvoiceStatus.CANCELLED
    this.state.cancelled_by = actorId
    this.state.cancel_reason = reason
  }
}
