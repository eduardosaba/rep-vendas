import { PricingContext } from '../dto/pricing-context'
import { PricingResult } from '../dto/pricing-result'
import { PricingEngineModule } from '../pricing-types'

export interface CampaignRule {
  id: string;
  brand_id?: string;
  min_quantity?: number;
  discount_per_item?: number;
  // Outras regras
}

// Simulando um repositório interno ou recebendo as regras de fora
export class CampaignEngine implements PricingEngineModule {
  priority = 10;
  
  private activeCampaigns: CampaignRule[] = [];

  constructor(rules: CampaignRule[]) {
    this.activeCampaigns = rules;
  }

  applies(context: PricingContext): boolean {
    return this.activeCampaigns.length > 0;
  }

  execute(context: PricingContext): Partial<PricingResult> {
    let campaignDiscount = 0;

    for (const item of context.items) {
      for (const campaign of this.activeCampaigns) {
        if (campaign.brand_id && item.brand_id === campaign.brand_id) {
          if (campaign.min_quantity && item.quantity >= campaign.min_quantity) {
            campaignDiscount += (item.quantity * (campaign.discount_per_item || 0));
          }
        }
      }
    }

    return { campaignDiscount: Number(campaignDiscount.toFixed(2)) };
  }
}
