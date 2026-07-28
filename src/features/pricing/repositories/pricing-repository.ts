import { createClient } from '@/lib/supabase/server'
import { PricingResult } from '../dto/pricing-result'
import { DraftOrderEventType } from '../pricing-types'

export async function persistCommercialPricing(
  draftId: string, 
  userId: string, 
  result: PricingResult, 
  eventType: DraftOrderEventType, 
  payload: any = {}
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    const { error } = await supabase.rpc('persist_commercial_pricing', {
      p_draft_id: draftId,
      p_subtotal: result.subtotal,
      p_campaign_discount: result.campaignDiscount,
      p_rep_discount: result.repDiscount,
      p_discount_total: result.discountTotal,
      p_tax_value: result.taxValue,
      p_freight_value: result.freightValue,
      p_margin_value: result.marginValue,
      p_margin_percent: result.marginPercent,
      p_grand_total: result.grandTotal,
      p_user_id: userId,
      p_event_type: eventType,
      p_payload: payload
    });

    if (error) {
      console.error('[Pricing Repository RPC Error]:', error);
      throw error;
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: 'Falha ao persistir extrato comercial no banco.' };
  }
}
