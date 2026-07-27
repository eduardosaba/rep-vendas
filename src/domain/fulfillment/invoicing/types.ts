export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  GENERATED = 'GENERATED',
  ISSUED = 'ISSUED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED'
}

export enum FiscalStatus {
  WAITING_PROVIDER = 'WAITING_PROVIDER',
  PROCESSING = 'PROCESSING',
  AUTHORIZED = 'AUTHORIZED',
  DENIED = 'DENIED'
}

export interface InvoiceState {
  id: string
  order_id: string
  organization_id: string
  status: InvoiceStatus
  fiscal_status: FiscalStatus
  invoice_number?: string
  xml_url?: string
  pdf_url?: string
  total_amount: number
  customer_snapshot: any
  items_snapshot: any[]
  totals_snapshot: any
  created_by?: string
  issued_by?: string
  issued_at?: string
  cancelled_by?: string
  cancel_reason?: string
  fiscal_provider?: string
  provider_response?: any
}
