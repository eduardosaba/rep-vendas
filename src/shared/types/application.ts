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

export interface ApplicationContext {
  tenant: TenantContext | null;
  organization: OrganizationContext | null;
  branding: BrandingContext | null;
  modules: string[];
  features: string[]; // Resolved via FeatureRegistry
  permissions: string[]; // List of permission keys the current user has based on their role and features
  plan: PlanContext | null;
  representative: RepresentativeContext | null;
  
  // Future use placeholders
  client: any | null; 
  priceTable: any | null; 
  currency: string;
  locale: string;
}
