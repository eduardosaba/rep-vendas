// src/actions/commercial/branding.ts
'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface BrandConfig {
  name: string
  logoUrl: string | null
  primaryColor: string
  secondaryColor: string
  accentColor: string
  contactWhatsapp: string | null
  bannerUrl: string | null
}

/**
 * BUSCA E VALIDA O BRANDING DA DISTRIBUIDORA
 * Retorna as configurações visuais ou um fallback elegante.
 */
export async function getOrganizationBranding(organizationId: string): Promise<BrandConfig> {
  try {
    const { data: org, error } = await supabaseAdmin
      .from('organizations')
      .select('name, logo_url, primary_color, secondary_color, accent_color, contact_whatsapp, banner_url')
      .eq('id', organizationId)
      .single()

    if (error || !org) {
      throw new Error(error?.message || 'Organização não encontrada.')
    }

    return {
      name: org.name,
      logoUrl: org.logo_url,
      primaryColor: org.primary_color || '#0f172a',
      secondaryColor: org.secondary_color || '#2563eb',
      accentColor: org.accent_color || '#f59e0b',
      contactWhatsapp: org.contact_whatsapp,
      bannerUrl: org.banner_url
    }

  } catch (error) {
    console.warn('[Branding Engine Alert]: Usando identidade padrão de fallback.', error)
    return {
      name: 'RepVendas',
      logoUrl: null,
      primaryColor: '#0f172a',
      secondaryColor: '#2563eb',
      accentColor: '#f59e0b',
      contactWhatsapp: null,
      bannerUrl: null
    }
  }
}
