'use server'

import { createClient } from '@/lib/supabase/server'
import { TenantBranding } from './branding-types'
import { DEFAULT_BRANDING } from './default-branding'
import { safeColor } from './color-validator'

interface GetBrandingParams {
  organizationId?: string
  companyId?: string
}

/**
 * Resolve a cascata de branding:
 * Company Override -> Organization -> Default System Theme
 */
export async function getTenantBranding(params: GetBrandingParams): Promise<TenantBranding> {
  const supabase = await createClient()

  // 1. Tenta carregar override no nível da Company
  if (params.companyId) {
    const { data: companyData } = await supabase
      .from('companies')
      .select('metadata')
      .eq('id', params.companyId)
      .single()

    const companyMeta = companyData?.metadata as any
    if (companyMeta?.branding?.override) {
      return buildBrandingPayload(companyMeta.branding, 'company')
    }
  }

  // 2. Fallback para a Organização Mestre
  if (params.organizationId) {
    const { data: orgData } = await supabase
      .from('organizations')
      .select('metadata')
      .eq('id', params.organizationId)
      .single()

    const orgMeta = orgData?.metadata as any
    if (orgMeta?.branding) {
      return buildBrandingPayload(orgMeta.branding, 'organization')
    }
  }

  // 3. Fallback Universal (Design nativo do RepVendas)
  return DEFAULT_BRANDING
}

function buildBrandingPayload(brandingData: any, source: 'company' | 'organization'): TenantBranding {
  return {
    portal_name: brandingData.portal_name || DEFAULT_BRANDING.portal_name,
    logo_url: brandingData.logo_url,
    colors: {
      primary: safeColor(brandingData.colors?.primary, DEFAULT_BRANDING.colors.primary),
      secondary: safeColor(brandingData.colors?.secondary, DEFAULT_BRANDING.colors.secondary),
      accent: safeColor(brandingData.colors?.accent, DEFAULT_BRANDING.colors.accent),
      background: safeColor(brandingData.colors?.background, DEFAULT_BRANDING.colors.background),
      text: safeColor(brandingData.colors?.text, DEFAULT_BRANDING.colors.text),
      border: safeColor(brandingData.colors?.border, DEFAULT_BRANDING.colors.border)
    },
    source
  }
}
