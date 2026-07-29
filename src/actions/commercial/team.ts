// src/actions/commercial/team.ts
'use server'

import { createClient } from '@supabase/supabase-js'
import { resolveUserScope } from '@/lib/permissions'
import { randomBytes } from 'crypto'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface CreateInviteInput {
  operatorUserId: string
  role?: 'user' | 'pdv' | 'operador'
  maxUses?: number
}

/**
 * GERA UM LINK DE CONVITE EXCLUSIVO PARA A DISTRIBUIDORA
 */
export async function createTeamInvite({
  operatorUserId,
  role = 'user',
  maxUses = 5
}: CreateInviteInput) {
  try {
    const scope = await resolveUserScope(operatorUserId)

    if (!scope.isCompanyScope || !scope.companyId) {
      return { success: false, error: 'Acesso negado. Apenas administradores geram convites.' }
    }

    const token = randomBytes(16).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // Expira em 7 dias

    const { data, error } = await supabaseAdmin
      .from('organization_invites')
      .insert({
        organization_id: scope.companyId,
        token,
        role,
        max_uses: maxUses,
        expires_at: expiresAt.toISOString()
      })
      .select('token')
      .single()

    if (error) throw error

    // Retorna o link completo para o admin copiar
    const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.repvendas.com.br'}/join/${data.token}`

    return { success: true, inviteUrl }

  } catch (error: any) {
    console.error('[Create Invite Error]:', error.message)
    return { success: false, error: 'Falha ao gerar link de convite.' }
  }
}

/**
 * VINCOLA O USUÁRIO ATUAL À DISTRIBUIDORA ATRAVÉS DO TOKEN DE CONVITE
 */
export async function acceptTeamInvite(token: string, userId: string) {
  try {
    // 1. Busca o convite e valida
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('organization_invites')
      .select('*')
      .eq('token', token)
      .single()

    if (inviteError || !invite) {
      return { success: false, error: 'Link de convite inválido ou expirado.' }
    }

    if (new Date(invite.expires_at) < new Date()) {
      return { success: false, error: 'Este convite já expirou.' }
    }

    if (invite.used_count >= invite.max_uses) {
      return { success: false, error: 'O limite de utilizações deste convite foi atingido.' }
    }

    // 2. Vincula o perfil do usuário à organização no seu schema real
    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({
        organization_id: invite.organization_id,
        role: invite.role, // Respeita a constraint de roles permitidas
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateProfileError) throw updateProfileError

    // 3. Incrementa o contador de uso do token
    await supabaseAdmin
      .from('organization_invites')
      .update({ used_count: invite.used_count + 1 })
      .eq('id', invite.id)

    return { success: true, organizationId: invite.organization_id }

  } catch (error: any) {
    console.error('[Accept Invite Error]:', error.message)
    return { success: false, error: 'Falha ao aceitar o convite.' }
  }
}

/**
 * LISTA OS VENDEDORES/REPRESENTANTES VINCULADOS À DISTRIBUIDORA
 */
export async function getOrganizationTeam(adminUserId: string) {
  try {
    const scope = await resolveUserScope(adminUserId)

    if (!scope.isCompanyScope || !scope.companyId) {
      throw new Error('Apenas administradores podem ver a equipe.')
    }

    const { data: team, error } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, role, created_at, whatsapp')
      .eq('organization_id', scope.companyId)
      .order('name', { ascending: true })

    if (error) throw error
    return { success: true, team }

  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
