export type OrganizationRole = 'owner' | 'admin' | 'sales_rep' | 'buyer' | 'operator';

export type OrganizationType = 
  | 'independent_representative' 
  | 'catalog_template' 
  | 'distributor' 
  | 'optical_store';

export interface UserOrganizationSummary {
  id: string;
  name: string;
  slug: string;
  organization_type: OrganizationType;
  role: OrganizationRole;
  status: 'active' | 'inactive' | 'invited' | 'blocked';
  logo_url?: string | null;
}

export interface ActiveOrganizationContext {
  id: string;
  name: string;
  slug: string;
  organization_type: OrganizationType;
  role: OrganizationRole;
  is_active: boolean;
  
  // Capabilities & Commercial Rules (Validated Server-Side)
  is_public: boolean;
  can_sell: boolean;
  can_buy: boolean;
  can_receive_orders: boolean;
  is_template_catalog: boolean;
}

export interface OrganizationMembershipValidationResult {
  isValid: boolean;
  organization?: ActiveOrganizationContext | null;
  reason?: string;
}
