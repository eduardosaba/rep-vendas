import { PricingContext } from '../dto/pricing-context'
import { PricingResult } from '../dto/pricing-result'
import { PricingEngineModule } from '../pricing-types'

export class FreightEngine implements PricingEngineModule {
  priority = 30;

  private fixedFreightValue: number;

  constructor(fixedFreightValue: number = 0) {
    this.fixedFreightValue = fixedFreightValue;
  }

  applies(context: PricingContext): boolean {
    return this.fixedFreightValue > 0;
  }

  execute(context: PricingContext & Partial<PricingResult>): Partial<PricingResult> {
    return { freightValue: Number(this.fixedFreightValue.toFixed(2)) };
  }
}
