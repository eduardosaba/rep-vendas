import { PricingContext } from './dto/pricing-context'
import { PricingResult } from './dto/pricing-result'

export enum DraftOrderEventType {
  ADD_ITEM = 'ADD_ITEM',
  REMOVE_ITEM = 'REMOVE_ITEM',
  UPDATE_QUANTITY = 'UPDATE_QUANTITY',
  UPDATE_NOTES = 'UPDATE_NOTES',
  APPLY_CAMPAIGN = 'APPLY_CAMPAIGN',
  APPLY_DISCOUNT = 'APPLY_DISCOUNT',
  RECALCULATE_PRICING = 'RECALCULATE_PRICING',
  CHECKOUT = 'CHECKOUT',
  SUBMIT = 'SUBMIT',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  CONVERT_ORDER = 'CONVERT_ORDER'
}

export interface PricingEngineModule {
  priority: number;
  applies(context: PricingContext): boolean;
  execute(context: PricingContext): Partial<PricingResult>;
}

export interface CommercialExtrato extends PricingResult {}
