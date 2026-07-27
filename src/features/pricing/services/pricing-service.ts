import { createClient } from '@/lib/supabase/server'
import { PricingContext } from '../dto/pricing-context'
import { PricingEngine } from '../pricing-engine'
import { CampaignEngine } from '../engines/campaign-engine'
import { DiscountEngine } from '../engines/discount-engine'
import { FreightEngine } from '../engines/freight-engine'
import { TaxEngine } from '../engines/tax-engine'
import { MarginEngine } from '../engines/margin-engine'
import { persistCommercialPricing } from '../repositories/pricing-repository'
import { DraftOrderEventType } from '../pricing-types'

export async function computeAndPersistCommercialPricing(
  draftId: string, 
  userId: string,
  eventType: DraftOrderEventType,
  payload: any = {}
) {
  const supabase = await createClient();

  // 1. Coleta os dados do draft e itens
  const { data: draft } = await supabase
    .from('draft_orders')
    .select('*, items:draft_order_items(*, product:products(brand_id, name))')
    .eq('id', draftId)
    .single();

  if (!draft) {
    return { success: false, error: 'Draft não encontrado.' };
  }

  // Se não tem itens, podemos zerar tudo.
  if (!draft.items || draft.items.length === 0) {
    await persistCommercialPricing(draftId, userId, {
      subtotal: 0,
      campaignDiscount: 0,
      repDiscount: 0,
      discountTotal: 0,
      taxValue: 0,
      freightValue: 0,
      marginValue: 0,
      marginPercent: 0,
      grandTotal: 0
    }, eventType, payload);
    return { success: true };
  }

  // 2. Monta o Contexto
  let subtotal = 0;
  const items = draft.items.map((item: any) => {
    subtotal += (item.quantity * item.unit_price);
    return {
      id: item.id,
      product_id: item.product_id,
      brand_id: item.product?.brand_id,
      quantity: item.quantity,
      unit_price: item.unit_price
    };
  });

  const context: PricingContext = {
    tenantId: draft.organization_id,
    customerId: draft.customer_id,
    draftId: draft.id,
    items,
    subtotal: Number(subtotal.toFixed(2)),
    currencyCode: draft.currency_code,
    pricingVersion: draft.pricing_version,
    campaignVersion: draft.campaign_version,
    taxVersion: draft.tax_version,
    discountVersion: draft.discount_version,
    metadata: draft.metadata
  };

  // 3. Obtém as regras configuradas (Mocked para MVP, mas deveria vir do DB ou Repositories)
  const campaigns: any[] = [
    // ex: { id: 'c1', brand_id: 'algum-uuid', min_quantity: 10, discount_per_item: 15 }
  ];
  
  // 4. Instancia as Engines
  const engine = new PricingEngine([
    new CampaignEngine(campaigns),
    new DiscountEngine(0), // Sem desconto manual por enquanto
    new FreightEngine(0), // Frete CIF
    new TaxEngine({ aliquota: 0.04 }), // 4% IPI
    new MarginEngine(0.45) // Custo estimado de 45%
  ]);

  // 5. Executa Orquestração Pura
  const extrato = engine.execute(context);

  // 6. Persiste Transacionalmente
  const result = await persistCommercialPricing(draftId, userId, extrato, eventType, payload);

  return result;
}
