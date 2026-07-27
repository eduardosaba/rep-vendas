// src/actions/commercial/settings.ts
'use server'

import { createClient } from '@supabase/supabase-js'
import { resolveUserScope } from '@/lib/permissions'
import { revalidatePath } from 'next/cache'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface UpdateBrandingInput {
  operatorUserId: string
  logoUrl?: string | null
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  contactWhatsapp?: string | null
  bannerUrl?: string | null
}

/**
 * SALVA AS CONFIGURAÇÕES DE BRANDING DA DISTRIBUIDORA
 * Valida se o usuário é realmente administrador do tenant antes de efetuar o update.
 */
export async function updateOrganizationBranding(input: UpdateBrandingInput) {
  try {
    // 1. Resolve o escopo do usuário operador para validar as permissões
    const scope = await resolveUserScope(input.operatorUserId)

    if (!scope.isCompanyScope || !scope.companyId) {
      return { 
        success: false, 
        error: 'Acesso negado. Apenas administradores do distribuidor podem alterar as configurações.' 
      }
    }

    // 2. Prepara os dados validados para atualização
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    }

    if (input.logoUrl !== undefined) updateData.logo_url = input.logoUrl
    if (input.bannerUrl !== undefined) updateData.banner_url = input.bannerUrl
    if (input.contactWhatsapp !== undefined) updateData.contact_whatsapp = input.contactWhatsapp
    
    // Validadores simples de formato Hexadecimal para as cores
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
    
    if (input.primaryColor && hexRegex.test(input.primaryColor)) {
      updateData.primary_color = input.primaryColor
    }
    if (input.secondaryColor && hexRegex.test(input.secondaryColor)) {
      updateData.secondary_color = input.secondaryColor
    }
    if (input.accentColor && hexRegex.test(input.accentColor)) {
      updateData.accent_color = input.accentColor
    }

    // 3. Executa a atualização na tabela 'organizations' com base na segurança multi-tenant
    const { error } = await supabaseAdmin
      .from('organizations')
      .update(updateData)
      .eq('id', scope.companyId)

    if (error) throw error

    // 4. Limpa o cache das rotas do catálogo para aplicar o novo visual instantaneamente
    revalidatePath('/catalogo')
    revalidatePath(`/catalogo/${scope.companyId}`)

    return { success: true }

  } catch (error: any) {
    console.error('[Branding Update Error]:', error.message)
    return { success: false, error: 'Falha ao salvar as configurações de identidade visual.' }
  }
}
