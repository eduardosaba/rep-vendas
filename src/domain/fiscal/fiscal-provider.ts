import { IssueInvoiceRequest, IssueInvoiceResponse, CancelInvoiceRequest, CancelInvoiceResponse } from './fiscal-types'

export interface FiscalProvider {
  get name(): string
  issueInvoice(request: IssueInvoiceRequest): Promise<IssueInvoiceResponse>
  cancelInvoice(request: CancelInvoiceRequest): Promise<CancelInvoiceResponse>
}
