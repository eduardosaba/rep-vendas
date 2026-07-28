import { PricingContext } from '../dto/pricing-context'
import { PricingResult } from '../dto/pricing-result'
import { PricingEngineModule } from '../pricing-types'

export interface TaxRule {
  aliquota: number; // ex: 0.04
}

export class TaxEngine implements PricingEngineModule {
  priority = 40;

  private taxRule: TaxRule;

  constructor(rule: TaxRule) {
    this.taxRule = rule;
  }

  applies(context: PricingContext): boolean {
    return this.taxRule.aliquota > 0;
  }

  execute(context: PricingContext & Partial<PricingResult>): Partial<PricingResult> {
    const discountTotal = context.discountTotal || 0;
    const freightValue = context.freightValue || 0;
    
    const baseCalculo = context.subtotal - discountTotal + freightValue;
    const taxValue = baseCalculo * this.taxRule.aliquota;

    return { taxValue: Number(taxValue.toFixed(2)) };
  }
}
