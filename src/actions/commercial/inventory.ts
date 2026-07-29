'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface StockMovementInput {
  productId: string
  quantity: number
  type: 'ENTRY' | 'SALE' | 'RESERVE' | 'CANCEL' | 'ADJUSTMENT'
  reason?: string
  referenceId?: string
}

export async function registerStockMovement(input: StockMovementInput) {
  try {
    const supabase = await createClient()

    // 1. Identifica o usuário da sessão ativa e resolve seu perfil
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Sessão expirada. Faça login novamente.' }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) return { success: false, error: 'Perfil não localizado.' }

    // 2. Garante que apenas contexto BUSINESS pode operar este nível (ou ajusta conforme a regra)
    const isCorporate = ['admin', 'master', 'operador'].includes(profile.role)
    const orgId = isCorporate ? profile.organization_id : user.id

    if (!orgId) return { success: false, error: 'Organização não definida.' }

    // 3. Executa a função transacional RPC no Supabase
    const { error } = await supabase.rpc('register_inventory_movement', {
      p_product_id: input.productId,
      p_organization_id: orgId,
      p_performed_by: user.id,
      p_movement_type: input.type,
      p_quantity: input.quantity,
      p_reason: input.reason || null,
      p_reference_id: input.referenceId || null
    })

    if (error) {
      console.error('[RPC Inventory Error]:', error.message)
      return { success: false, error: error.message || 'Falha ao registrar movimento de estoque.' }
    }

    // 4. Invalida os caches necessários
    revalidatePath('/distribuidora/estoque')
    revalidatePath(`/distribuidora/produtos/editar/${input.productId}`)

    return { success: true }
  } catch (error: any) {
    console.error('[Inventory Action Error]:', error.message)
    return { success: false, error: 'Erro interno ao processar movimento de estoque.' }
  }
}
