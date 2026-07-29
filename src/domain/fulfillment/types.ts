export enum PickingStatus {
  CREATED = 'CREATED',
  ASSIGNED = 'ASSIGNED',
  PICKING = 'PICKING',
  CHECKING = 'CHECKING',
  COMPLETED = 'COMPLETED',
  BLOCKED = 'BLOCKED',
  CANCELLED = 'CANCELLED'
}

export enum PickingExceptionType {
  MISSING_STOCK = 'MISSING_STOCK',
  DAMAGED = 'DAMAGED',
  WRONG_ITEM = 'WRONG_ITEM',
  OTHER = 'OTHER'
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  ISSUED = 'issued',
  CANCELLED = 'cancelled'
}

export enum ShipmentStatus {
  PENDING = 'pending',
  PACKED = 'packed',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  RETURNED = 'returned'
}

export interface PickListItem {
  id: string
  pick_list_id: string
  order_item_id: string
  product_id?: string
  product_name_snapshot: string
  sku_snapshot?: string
  color_snapshot?: string
  size_snapshot?: string
  quantity_requested: number
  quantity_picked: number
  location_code?: string
  status: 'pending' | 'picked' | 'missing'
  barcode_snapshot?: string
}

export interface PickListException {
  id: string
  product_id?: string
  type: PickingExceptionType
  description?: string
  created_by?: string
  status: 'pending' | 'approved' | 'rejected'
  approved_by?: string
  approved_at?: string
}

export interface PickingSession {
  id: string
  pick_list_id: string
  operator_id: string
  organization_id: string
  started_at: string
  finished_at?: string
  last_activity_at: string
  device_info: any
}

export interface PickList {
  id: string
  order_id: string
  organization_id: string
  status: PickingStatus
  locked_by?: string
  locked_at?: string
  assigned_to?: string
  items: PickListItem[]
  exceptions: PickListException[]
}
