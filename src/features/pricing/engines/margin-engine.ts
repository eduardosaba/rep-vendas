import { PricingContext } from '../dto/pricing-context'
import { PricingResult } from '../dto/pricing-result'
import { PricingEngineModule } from '../pricing-types'

export class MarginEngine implements PricingEngineModule {
  priority = 50; // A última na fila

  // Custo médio em percentual (ex: 0.45 para 45%) ou poderia ler um custo unitário item a item.
  private customCostPercent: number;

  constructor(customCostPercent: number = 0.45) {
    this.customCostPercent = customCostPercent;
  }

  applies(context: PricingContext): boolean {
    return true;
  }

  execute(context: PricingContext & Partial<PricingResult>): Partial<PricingResult> {
    const discountTotal = context.discountTotal || 0;
    const freightValue = context.freightValue || 0;
    const taxValue = context.taxValue || 0;

    const grandTotal = context.subtotal - discountTotal + freightValue + taxValue;
    
    // Custo estimado para fins de BI. O ideal é o produto ter `cost_price` mapeado.
    const custoEstimadoMercadoria = context.subtotal * this.customCostPercent;
    
    const marginValue = grandTotal - custoEstimadoMercadoria;
    const marginPercent = grandTotal > 0 ? (marginValue / grandTotal) * 100 : 0;

    return { 
      grandTotal: Number(grandTotal.toFixed(2)),
      marginValue: Number(marginValue.toFixed(2)),
      marginPercent: Number(marginPercent.toFixed(2))
    };
  }
}
