'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getOrderService } from '@/domain/orders/OrderService'

export async function approveCreditOverride(orderId: string, action: 'APPROVE' | 'REJECT') {
  try {
    const supabase = await createClient()

    // 1. Valida a sessão e perfil
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Sessão expirada.' }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, name')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'master', 'financeiro'].includes(profile.role)) {
      return { success: false, error: 'Acesso negado. Permissão exclusiva do financeiro.' }
    }

    // 2. Busca o pedido para capturar a versão atual (OCC)
    const { data: currentOrder, error: orderError } = await supabase
      .from('orders')
      .select('id, version, status, commercial_status')
      .eq('id', orderId)
      .single()

    if (orderError || !currentOrder) {
      return { success: false, error: 'Ordem não encontrada.' }
    }

    const version = currentOrder.version || 1
    const service = getOrderService()

    // 3. Executa a transição via OrderService com auditoria e sincronização legada
    if (action === 'APPROVE') {
      await service.approveOrder(
        user.id,
        orderId,
        version,
        `[CRÉDITO LIBERADO] Aprovado por ${profile.name || user.email} via Mesa Financeira`
      )
    } else {
      await service.rejectOrder(
        user.id,
        orderId,
        version,
        `[CRÉDITO REJEITADO] Rejeitado por ${profile.name || user.email} via Mesa Financeira`
      )
    }

    revalidatePath('/distribuidora/financeiro/aprovacoes')
    revalidatePath('/distribuidora/pedidos')
    return { success: true }

  } catch (error: any) {
    console.error('[Credit Override Failure]:', error.message)
    const isConcurrency = error.message?.includes('CONFLICT_VERSION')
    return {
      success: false,
      error: isConcurrency
        ? 'O pedido foi modificado por outro operador. Atualize a página e tente novamente.'
        : error.message || 'Erro ao processar a liberação do pedido.'
    }
  }
}
