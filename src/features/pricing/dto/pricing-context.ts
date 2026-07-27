export interface PricingContextItem {
  id: string;
  product_id: string;
  brand_id?: string | null;
  quantity: number;
  unit_price: number;
}

export interface PricingContext {
  tenantId: string;
  customerId?: string | null;
  draftId: string;
  items: PricingContextItem[];
  subtotal: number;
  currencyCode: string;
  pricingVersion: string;
  campaignVersion: string;
  taxVersion: string;
  discountVersion: string;
  metadata: Record<string, unknown>;
}
