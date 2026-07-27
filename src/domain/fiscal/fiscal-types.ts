export interface IssueInvoiceRequest {
  invoiceId: string
  organizationId: string
  orderId: string
  totalAmount: number
  customerData: any
  itemsData: any[]
}

export interface IssueInvoiceResponse {
  status: 'AUTHORIZED' | 'DENIED' | 'PROCESSING'
  invoiceNumber?: string
  xmlUrl?: string
  pdfUrl?: string
  providerMessage?: string
  rawResponse?: any
}

export interface CancelInvoiceRequest {
  invoiceId: string
  organizationId: string
  reason: string
}

export interface CancelInvoiceResponse {
  success: boolean
  providerMessage?: string
  rawResponse?: any
}
