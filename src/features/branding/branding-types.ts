export interface TenantBrandingColors {
  primary: string
  secondary: string
  accent: string
  background: string
  text: string
  border: string
}

export interface TenantBranding {
  portal_name: string
  logo_url?: string
  colors: TenantBrandingColors
  source: 'company' | 'organization' | 'default'
}
