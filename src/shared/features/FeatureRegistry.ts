import { TenantContext } from '../types/application';

export interface ResolveFeaturesOptions {
  tenant: TenantContext | null;
  plan: any; // Can be PlanContext | null
  modules: string[];
  flags?: Record<string, boolean>;
}

export class FeatureRegistry {
  static resolve({ tenant, plan, modules, flags = {} }: ResolveFeaturesOptions): string[] {
    const features = new Set<string>();

    // For every module enabled, we push its underlying features
    modules.forEach(module => {
      switch(module) {
        case 'catalog':
          features.add('view_catalog');
          features.add('search_products');
          features.add('view_product_details');
          break;
        case 'crm':
          features.add('manage_customers');
          features.add('view_customer_history');
          break;
        case 'orders':
          features.add('create_order');
          features.add('view_orders');
          break;
        case 'stock':
          features.add('view_stock');
          features.add('manage_inventory');
          break;
        case 'pricing':
          features.add('manage_price_tables');
          features.add('view_discounts');
          break;
        case 'ecommerce':
          features.add('checkout');
          features.add('payment_gateway');
          break;
        case 'team':
          features.add('manage_users');
          features.add('assign_roles');
          break;
        case 'appointments':
          features.add('schedule_appointments');
          break;
        case 'patients':
          features.add('manage_patients');
          features.add('manage_prescriptions');
          break;
      }
    });

    // Plan specific features
    if (plan?.name?.toLowerCase() === 'enterprise') {
      features.add('advanced_reports');
      features.add('white_label');
    }

    // Apply manual flags overrides
    Object.keys(flags).forEach(flag => {
      if (flags[flag]) features.add(flag);
      else features.delete(flag);
    });

    return Array.from(features);
  }
}
