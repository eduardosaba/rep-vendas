'use server'

import { createClient } from '@/lib/supabase/server'
import { TenantBranding } from '@/features/branding/branding-types'
import { getTenantBranding } from '@/features/branding/branding-resolver'

export interface ApplicationContext {
  userId: string
  tenantId: string
  organizationId: string
  companyId?: string
  role: string
  branding: TenantBranding
}

/**
 * Hub central de contexto B2B.
 * Chamado no Layout ou em sub-telas para carregar 1 única vez 
 * o tenant atual e suas configurações visuais e regras de negócio.
 */
export async function getApplicationContext(): Promise<ApplicationContext | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Para garantir flexibilidade multi-tenant, lemos o perfil para descobrir a hierarquia atual
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  const organizationId = profile.organization_id || ''
  const companyId = profile.company_id || undefined
  const tenantId = companyId || organizationId

  // Resolve as cores e logotipo
  const branding = await getTenantBranding({ organizationId, companyId })

  return {
    userId: user.id,
    tenantId,
    organizationId,
    companyId,
    role: profile.role,
    branding
  }
}
