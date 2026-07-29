export interface FeaturesConfig {
  fulfillment: {
    auto_create_invoice: boolean
    auto_create_shipment: boolean
  }
  fiscal: {
    mode: 'manual' | 'assisted' | 'automatic'
  }
  notifications: {
    notify_customer_invoice: boolean
    notify_customer_shipment: boolean
  }
}

export interface OrganizationSettings {
  id: string
  organization_id: string
  blind_picking_enabled: boolean
  require_barcode_scan: boolean
  allow_manual_quantity: boolean
  auto_create_invoice_on_picking_completed: boolean
  auto_create_shipment_on_invoice_issued: boolean
  fiscal_mode: 'manual' | 'assisted' | 'automatic'
  features_config: FeaturesConfig
  created_at: string
  updated_at: string
}

export const DEFAULT_FEATURES_CONFIG: FeaturesConfig = {
  fulfillment: {
    auto_create_invoice: true,
    auto_create_shipment: true,
  },
  fiscal: {
    mode: 'manual',
  },
  notifications: {
    notify_customer_invoice: true,
    notify_customer_shipment: true,
  },
};

export const DEFAULT_ORGANIZATION_SETTINGS = (organizationId: string): Partial<OrganizationSettings> => ({
  organization_id: organizationId,
  blind_picking_enabled: true,
  require_barcode_scan: false,
  allow_manual_quantity: true,
  auto_create_invoice_on_picking_completed: true,
  auto_create_shipment_on_invoice_issued: true,
  fiscal_mode: 'manual',
  features_config: DEFAULT_FEATURES_CONFIG,
});
