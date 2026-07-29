import { PricingContext } from './dto/pricing-context'
import { PricingResult } from './dto/pricing-result'
import { PricingEngineModule } from './pricing-types'

export class PricingEngine {
  private pipeline: PricingEngineModule[] = [];

  constructor(modules: PricingEngineModule[]) {
    // Ordena os módulos por prioridade estrita de execução fiscal/comercial
    this.pipeline = modules.sort((a, b) => a.priority - b.priority);
  }

  public execute(initialContext: PricingContext): PricingResult {
    let result: Partial<PricingResult> = {
      subtotal: initialContext.subtotal,
      campaignDiscount: 0,
      repDiscount: 0,
      discountTotal: 0,
      taxValue: 0,
      freightValue: 0,
      marginValue: 0,
      marginPercent: 0,
      grandTotal: initialContext.subtotal
    };

    let mergedContext: PricingContext & Partial<PricingResult> = { ...initialContext, ...result };

    // Processamento progressivo do objeto de contexto
    for (const engine of this.pipeline) {
      if (engine.applies(mergedContext)) {
        const engineResult = engine.execute(mergedContext);
        
        // Merge imutável
        result = { ...result, ...engineResult };
        mergedContext = { ...mergedContext, ...engineResult };
      }
    }

    return result as PricingResult;
  }
}
