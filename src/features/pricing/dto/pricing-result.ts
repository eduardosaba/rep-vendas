export interface PricingResult {
  subtotal: number;
  campaignDiscount: number;
  repDiscount: number;
  discountTotal: number;
  taxValue: number;
  freightValue: number;
  marginValue: number;
  marginPercent: number;
  grandTotal: number;
}
