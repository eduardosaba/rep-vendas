'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getOrderService } from '@/domain/orders/OrderService'

interface DispatchInput {
  orderId: string
  trackingCode: string
  estimatedDelivery?: string
}

export async function dispatchContextOrder(input: DispatchInput) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Sessão expirada.' }

    if (!input.trackingCode.trim()) {
      return { success: false, error: 'O código de rastreamento é obrigatório para despachar.' }
    }

    // Busca o pedido para capturar a versão atual (OCC)
    const { data: currentOrder, error: fetchErr } = await supabase
      .from('orders')
      .select('id, version')
      .eq('id', input.orderId)
      .single()

    if (fetchErr || !currentOrder) {
      return { success: false, error: 'Pedido não encontrado.' }
    }

    const version = currentOrder.version || 1
    const service = getOrderService()

    await service.shipOrder(
      user.id,
      input.orderId,
      version,
      input.trackingCode.trim(),
      'Mercadoria despachada na esteira logística'
    )

    revalidatePath('/distribuidora/expedicao')
    revalidatePath('/distribuidora/pedidos')
    return { success: true }
  } catch (error: any) {
    console.error('[Dispatch Order Error]:', error.message)
    const isConcurrency = error.message?.includes('CONFLICT_VERSION')
    return {
      success: false,
      error: isConcurrency
        ? 'O pedido foi atualizado por outro operador. Por favor, recarregue a página.'
        : error.message || 'Falha ao registrar despacho do pedido.'
    }
  }
}

export async function deliverContextOrder(orderId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Sessão expirada.' }

    // Busca o pedido para capturar a versão atual (OCC)
    const { data: currentOrder, error: fetchErr } = await supabase
      .from('orders')
      .select('id, version')
      .eq('id', orderId)
      .single()

    if (fetchErr || !currentOrder) {
      return { success: false, error: 'Pedido não encontrado.' }
    }

    const version = currentOrder.version || 1
    const service = getOrderService()

    await service.deliverOrder(
      user.id,
      orderId,
      version,
      'Confirmação de entrega ao destinatário'
    )

    revalidatePath('/distribuidora/expedicao')
    revalidatePath('/distribuidora/pedidos')
    return { success: true }
  } catch (error: any) {
    console.error('[Deliver Order Error]:', error.message)
    const isConcurrency = error.message?.includes('CONFLICT_VERSION')
    return {
      success: false,
      error: isConcurrency
        ? 'O pedido foi atualizado por outro operador. Por favor, recarregue a página.'
        : error.message || 'Falha ao registrar entrega do pedido.'
    }
  }
}
