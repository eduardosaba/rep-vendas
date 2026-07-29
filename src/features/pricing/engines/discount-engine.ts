import { PricingContext } from '../dto/pricing-context'
import { PricingResult } from '../dto/pricing-result'
import { PricingEngineModule } from '../pricing-types'

export class DiscountEngine implements PricingEngineModule {
  priority = 20;

  private manualRepDiscountPercent: number;

  constructor(manualRepDiscountPercent: number = 0) {
    this.manualRepDiscountPercent = manualRepDiscountPercent;
  }

  applies(context: PricingContext): boolean {
    return this.manualRepDiscountPercent > 0;
  }

  execute(context: PricingContext): Partial<PricingResult> {
    // Calculado a partir da base que o orquestrador já tem somada: subtotal.
    // E o discount_engine depende do campaign_discount se ele foi processado?
    // O PricingContext no engine só tem o estado INICIAL do pipeline.
    // Espera, se a arquitetura manda que a engine retorne Partial<PricingResult>, 
    // a engine precisa ter acesso aos resultados das engines anteriores.
    // Então, na verdade, o contexto passado pelo orquestrador vai sendo enriquecido a cada passo.

    // A base de desconto é o subtotal menos o desconto de campanha.
    const campaignDiscount = (context as any)._accumulated_campaignDiscount || 0;
    const baseCalculo = context.subtotal - campaignDiscount;
    const repDiscount = baseCalculo * (this.manualRepDiscountPercent / 100);

    return { 
      repDiscount: Number(repDiscount.toFixed(2)),
      discountTotal: Number((campaignDiscount + repDiscount).toFixed(2))
    };
  }
}
