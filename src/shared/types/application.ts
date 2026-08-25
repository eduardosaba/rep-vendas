import type { OrganizationType, MemberRole, MemberStatus, Organization, OrganizationMember } from '@/domain/organizations/types';

export interface OrganizationContext {
  id: string;
  slug: string;
  name: string;
}

export interface RepresentativeContext {
  id: string;
  slug: string | null;
  name: string;
  email: string;
  whatsapp: string | null;
}

export interface BrandingContext {
  primaryColor: string | null;
  secondaryColor: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
}

export interface TenantContext {
  id: string;
  type: 'distributor' | 'brand';
}

export interface PlanContext {
  id?: string;
  name: string;
}

// Novo contexto organizacional completo (Phase 1)
export interface OrganizationContextV2 {
  organizationId: string | null;
  organization: Organization | null;
  organizationType: OrganizationType | null;
  memberRole: MemberRole | null;
  memberStatus: MemberStatus | null;
  permissions: string[];
  memberships: OrganizationMember[];
  fallback: 'membership' | 'profile_org' | 'legacy_company' | 'none';
}

export interface ApplicationContext {
  tenant: TenantContext | null;
  organization: OrganizationContext | null;
  organizationV2: OrganizationContextV2 | null;
  branding: BrandingContext | null;
  modules: string[];
  features: string[];
  permissions: string[];
  plan: PlanContext | null;
  representative: RepresentativeContext | null;
  
  client: any | null;
  priceTable: any | null;
  currency: string;
  locale: string;
}