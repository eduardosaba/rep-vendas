'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidateTag } from 'next/cache'

interface ExecuteCheckoutInput {
  draftId: string
  paymentMethodId: string // Alterado para UUID de payment_method
  notes?: string
}

/**
 * Server Action unificada de Fechamento de Pré-venda B2B
 * Valida a sessão, executa a persistência de lock e converte o carrinho.
 */
export async function executeB2BCheckout(input: ExecuteCheckoutInput) {
  const supabase = await createClient()

  try {
    // 1. Resolve a sessão do representante/operador
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Sessão expirada. Faça login novamente.', code: 'UNAUTHORIZED' }

    // 2. Invoca a RPC de conversão atômica com reserva de estoque interna no Postgres
    const { data: rpcResult, error: rpcError } = await supabase.rpc('convert_draft_to_order', {
      p_draft_id: input.draftId,
      p_user_id: user.id,
      p_payment_method_id: input.paymentMethodId,
      p_notes: input.notes || null
    })

    if (rpcError) {
      console.error('[Checkout RPC Error]:', rpcError.message)
      // Mapeamento simples de códigos para o front-end
      return { success: false, error: rpcError.message, code: rpcError.code || 'UNKNOWN_RPC_ERROR' }
    }

    const response = rpcResult as { success: boolean; order_id?: string; error?: string; code?: string; message?: string }
    
    // Tratamento de sucesso (mesmo idempotente)
    if (response.success && response.order_id) {
      // 4. Purga as tags de cache do App Router para atualizar a gaveta e os totais
      revalidateTag('draft-cart')
      
      return { 
        success: true, 
        orderId: response.order_id,
        message: response.message
      }
    } else {
      // Tratamento de falhas levantadas pelo 'RAISE EXCEPTION' capturado internamente ou 'RETURN jsonb_build_object(success: false)'
      return { 
        success: false, 
        error: response.error || 'Falha na persistência transacional da ordem.',
        code: response.code || 'UNKNOWN_ERROR'
      }
    }

  } catch (error: any) {
    console.error('[Checkout Server Action Crash]:', error.message)
    return { success: false, error: 'Erro interno ao processar o fechamento comercial.', code: 'SERVER_CRASH' }
  }
}
