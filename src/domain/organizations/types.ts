export type OrganizationType = 
  | 'independent_representative' 
  | 'distributor' 
  | 'optical_store' 
  | 'catalog_template';

export type MemberRole = 'owner' | 'admin' | 'sales_rep' | 'buyer' | 'operator';

export type MemberStatus = 'active' | 'invited' | 'suspended';

export type OrganizationStatus = 'active' | 'suspended' | 'inactive';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  organization_type: OrganizationType;
  status: OrganizationStatus;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  contact_whatsapp: string | null;
  custom_domain: string | null;
  banner_url: string | null;
  is_active: boolean;
  is_public: boolean;
  can_sell: boolean;
  can_buy: boolean;
  can_receive_orders: boolean;
  owner_user_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string | null;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: MemberRole;
  status: MemberStatus;
  joined_at: string;
  created_at: string;
  updated_at: string | null;
  // Joins
  organization?: Organization;
  user?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export interface OrganizationContext {
  organizationId: string | null;
  organization: Organization | null;
  organizationType: OrganizationType | null;
  memberRole: MemberRole | null;
  memberStatus: MemberStatus | null;
  permissions: string[];
  memberships: OrganizationMember[];
  fallback: 'membership' | 'profile_org' | 'legacy_company' | 'none';
}

export interface FeatureFlag {
  organization_id: string;
  feature_key: string;
  enabled: boolean;
  activated_at: string | null;
  activated_by: string | null;
}

export type FeatureKey = 
  | 'organization_context_enabled'
  | 'distributor_portal_enabled'
  | 'optical_store_enabled'
  | 'b2b_relationships_enabled'
  | 'organization_products_enabled'
  | 'dual_order_status_enabled'
  | 'catalog_template_clone_enabled';

export const FEATURE_KEYS: FeatureKey[] = [
  'organization_context_enabled',
  'distributor_portal_enabled',
  'optical_store_enabled',
  'b2b_relationships_enabled',
  'organization_products_enabled',
  'dual_order_status_enabled',
  'catalog_template_clone_enabled',
];

export const ORGANIZATION_TYPES: OrganizationType[] = [
  'independent_representative',
  'distributor',
  'optical_store',
  'catalog_template',
];

export const MEMBER_ROLES: MemberRole[] = [
  'owner',
  'admin',
  'sales_rep',
  'buyer',
  'operator',
];

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  sales_rep: 'Representante de Vendas',
  buyer: 'Comprador',
  operator: 'Operador',
};

export const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, string> = {
  independent_representative: 'Representante Independente',
  distributor: 'Distribuidora',
  optical_store: 'Ótica',
  catalog_template: 'Catálogo Modelo',
};