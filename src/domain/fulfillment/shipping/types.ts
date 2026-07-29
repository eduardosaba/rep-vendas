export enum ShipmentStatus {
  WAITING = 'WAITING',
  READY = 'READY',
  DISPATCHED = 'DISPATCHED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  RETURNED = 'RETURNED'
}

export interface ShipmentState {
  id: string
  order_id: string
  invoice_id: string
  organization_id: string
  status: ShipmentStatus
  carrier_id?: string
  tracking_code?: string
  tracking_url?: string
  estimated_delivery_date?: string
  shipped_at?: string
  delivery_confirmed_at?: string
  delivery_proof_url?: string
  created_by?: string
}
