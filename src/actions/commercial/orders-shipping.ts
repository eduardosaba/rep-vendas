'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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

    // Atualiza o status para Despachado e grava o timestamp e tracking
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'Despachado',
        tracking_code: input.trackingCode.trim(),
        despachado_at: new Date().toISOString(),
        estimated_delivery: input.estimatedDelivery || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', input.orderId)

    if (error) throw error

    revalidatePath('/distribuidora/expedicao')
    revalidatePath('/distribuidora/pedidos')
    return { success: true }
  } catch (error: any) {
    console.error('[Dispatch Order Error]:', error.message)
    return { success: false, error: 'Falha ao registrar despacho do pedido.' }
  }
}

export async function deliverContextOrder(orderId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Sessão expirada.' }

    // Finaliza a esteira marcando como Entregue
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'Entregue',
        entregue_at: new Date().toISOString(),
        actual_delivery: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (error) throw error

    revalidatePath('/distribuidora/expedicao')
    return { success: true }
  } catch (error: any) {
    console.error('[Deliver Order Error]:', error.message)
    return { success: false, error: 'Falha ao registrar entrega do pedido.' }
  }
}
