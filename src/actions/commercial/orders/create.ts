'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'node:crypto'
import { OrderStatus } from '@/domain/orders/constants'
import { calculateAvailableCredit } from '../credit/validator'
import { freezeOrderDraft } from './draft'

interface CartItemInput {
  productId: string
  quantity: number
}

interface CreateOrderInput {
  clientId: string
  items: CartItemInput[]
  paymentMethod: string
  notes?: string
}

export async function checkoutCommercialOrder(input: CreateOrderInput) {
  console.log('[ORDER ENGINE]', {
    clientId: input.clientId,
    items: input.items.length,
    timestamp: new Date().toISOString()
  });

  try {
    const supabase = await createClient()

    // 1. Identifica o usuário operador, tenant e gera chave de idempotência
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Sessão expirada. Faça login novamente.' }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, company_id')
      .eq('id', user.id)
      .single()

    if (!profile) return { success: false, error: 'Vínculo organizacional não localizado.' }
    const companyId = profile.company_id || profile.organization_id

    // Gera um request ID resiliente para evitar dupla submissão em casos de timeout (Idempotência segura)
    const idempotencyKey = randomUUID()

    // 2. CONGELAMENTO DE PREÇOS NO NODE
    // Resolve as regras comerciais e amarra o preço no milissegundo do fechamento
    const draft = await freezeOrderDraft(input.clientId, input.items)

    // 3. VALIDAÇÃO DINÂMICA DE CRÉDITO (Risco Vivo)
    // Calcula o crédito disponível real
    const availableCredit = await calculateAvailableCredit(input.clientId)
    const isOverLimit = draft.totalValue > availableCredit
    
    // Status não regride, nasce na etapa correta baseado no limite financeiro
    const determinedStatus = isOverLimit 
      ? OrderStatus.WAITING_FINANCE 
      : OrderStatus.PENDING 

    const autoNotes = isOverLimit 
      ? `[RETENÇÃO DE CRÉDITO] Limite disponível (R$ ${availableCredit.toFixed(2)}) é inferior ao valor do pedido (R$ ${draft.totalValue.toFixed(2)}).` 
      : null

    const finalNotes = [input.notes, autoNotes].filter(Boolean).join('\n\n')

    // 4. MONTAGEM DO CONTRATO DE PAYLOAD ÚNICO JSONB
    const orderPayload = {
      header: {
        client_id: input.clientId,
        company_id: companyId,
        user_id: user.id,
        status: determinedStatus,
        total_value: draft.totalValue,
        payment_method: input.paymentMethod,
        notes: finalNotes || null,
        idempotency_key: idempotencyKey
      },
      items: draft.items
    }

    // 5. ATOMICIDADE PURA: Invoca a gravação no Postgres
    const { data: rpcData, error: rpcError } = await supabase.rpc('commit_commercial_order', {
      p_payload: orderPayload
    })

    if (rpcError) {
      console.error('[Postgres Transaction Failed]:', rpcError)
      throw new Error('Falha de validação transacional no banco de dados.')
    }

    const response = rpcData as { success: boolean; order_id?: string; error?: string; message?: string }
    if (!response.success) {
      return { success: false, error: response.error || 'Erro na persistência da ordem.' }
    }

    revalidatePath('/distribuidora/pedidos')
    revalidatePath('/distribuidora/financeiro/aprovacoes')
    
    return { 
      success: true, 
      orderId: response.order_id, 
      status: determinedStatus,
      message: response.message
    }

  } catch (error: any) {
    console.error('[Checkout Orchestrator Crash]:', error.message)
    return { success: false, error: error.message || 'Falha interna ao processar o fechamento do carrinho B2B.' }
  }
}
