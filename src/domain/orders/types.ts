export enum CommercialStatus {
  DRAFT = 'draft',
  SUBMITTED = 'pending_approval',
  UNDER_REVIEW = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum OperationalStatus {
  PENDING_FULFILLMENT = 'pending',
  PROCESSING = 'picking',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum OrderEventType {
  // Commercial events
  ORDER_CREATED = 'ORDER_CREATED',
  SUBMITTED_FOR_APPROVAL = 'SUBMITTED_FOR_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  COMMERCIAL_STATUS_CHANGED = 'COMMERCIAL_STATUS_CHANGED',

  // Operational events
  OPERATIONAL_STATUS_CHANGED = 'OPERATIONAL_STATUS_CHANGED',
  FULFILLMENT_STARTED = 'FULFILLMENT_STARTED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',

  // Fulfillment & Picking events
  PICKING_ASSIGNED = 'PICKING_ASSIGNED',
  PICKING_STARTED = 'PICKING_STARTED',
  ITEM_PICKED = 'ITEM_PICKED',
  PICKING_EXCEPTION_CREATED = 'PICKING_EXCEPTION_CREATED',
  PICKING_EXCEPTION_APPROVED = 'PICKING_EXCEPTION_APPROVED',
  PICKING_COMPLETED = 'PICKING_COMPLETED',

  // Invoice & Shipment events
  INVOICE_CREATED = 'INVOICE_CREATED',
  INVOICE_SUBMITTED_TO_PROVIDER = 'INVOICE_SUBMITTED_TO_PROVIDER',
  INVOICE_ISSUED = 'INVOICE_ISSUED',
  INVOICE_REJECTED = 'INVOICE_REJECTED',
  SHIPMENT_READY = 'SHIPMENT_READY',
}

export interface OrderTransitionResult {
  commercialStatus: CommercialStatus | null;
  operationalStatus: OperationalStatus | null;
  eventType: OrderEventType;
  expectedVersion: number;
  reason?: string;
}

export interface OrderStatusHistoryEntry {
  id: string;
  order_id: string;
  status_domain: 'commercial' | 'operational';
  from_status: string | null;
  to_status: string;
  changed_by_user_id: string;
  organization_id: string | null;
  order_version: number;
  reason: string | null;
  metadata: Record<string, any>;
  created_at: string;
}