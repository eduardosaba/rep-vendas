'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function billContextOrder(orderId: string) {
  try {
    const supabase = await createClient()

    // 1. Resolve a sessão do usuário operador
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Sessão expirada. Faça login novamente.' }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'master', 'operador'].includes(profile.role)) {
      return { success: false, error: 'Acesso negado. Apenas administradores podem faturar pedidos.' }
    }

    // 2. Dispara a RPC atômica que gerencia a transação segura (BEGIN/COMMIT/ROLLBACK) direto no banco
    const { data, error } = await supabase.rpc('process_order_billing', {
      p_order_id: orderId,
      p_user_id: user.id
    })

    if (error) {
      console.error('[RPC Error]:', error)
      return { success: false, error: error.message }
    }

    // O retorno da RPC vem mapeado no objeto JSONB que desenhamos
    const response = data as { success: boolean; error?: string }
    
    if (!response.success) {
      return { success: false, error: response.error || 'Falha ao faturar a ordem.' }
    }

    // 3. Revalida o cache do Next.js para atualizar as contagens instantaneamente
    revalidatePath('/distribuidora/pedidos')
    revalidatePath(`/distribuidora/pedidos/detalhes/${orderId}`)
    revalidatePath('/distribuidora/estoque')

    return { success: true }

  } catch (error: any) {
    console.error('[Billing Action Crash]:', error.message)
    return { success: false, error: 'Erro interno ao processar a requisição de faturamento.' }
  }
}
