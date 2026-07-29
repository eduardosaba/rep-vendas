export type DraftOrderStatus = 'draft' | 'submitted' | 'approved' | 'converted' | 'cancelled' | 'expired';

export interface DraftOrder {
  id: string;
  organization_id: string;
  company_id?: string | null;
  customer_id?: string | null;
  created_by: string;
  status: DraftOrderStatus;
  notes?: string | null;
  total_items: number;
  total_value: number;
  created_at: string;
  updated_at: string;
}

export interface DraftOrderItem {
  id: string;
  draft_order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  notes?: string | null;
  created_at: string;
}
