'use server'

import { createClient } from '@/lib/supabase/server'
import { FeatureService } from '@/domain/settings/feature-service'
import { OrganizationSettings } from '@/domain/settings/organization-settings'
import { revalidatePath } from 'next/cache'

/**
 * Obtém as configurações da organização do usuário logado.
 */
export async function getMyOrganizationSettings() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autorizado.')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    throw new Error('Organização não encontrada para o usuário.')
  }

  return await FeatureService.getSettings(profile.organization_id)
}

/**
 * Atualiza as configurações da organização do usuário logado.
 */
export async function updateMyOrganizationSettings(settings: Partial<OrganizationSettings>) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autorizado.')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    throw new Error('Organização não encontrada para o usuário.')
  }

  // Apenas master e admin_company podem gerenciar configurações
  const isAuthorized = ['master', 'admin_company'].includes(profile.role || '')
  if (!isAuthorized) {
    throw new Error('Acesso negado: Apenas administradores podem gerenciar configurações.')
  }

  const result = await FeatureService.updateSettings(profile.organization_id, settings)
  
  if (result.success) {
    revalidatePath('/distribuidora/configuracoes')
    revalidatePath('/distribuidora/operacao')
  }

  return result
}
