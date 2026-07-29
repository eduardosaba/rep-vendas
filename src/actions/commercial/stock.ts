// src/actions/commercial/stock.ts
'use server'

import { createClient } from '@supabase/supabase-js'
import { resolveUserScope } from '@/lib/permissions'

// Instância administrativa para gerenciar alterações críticas de inventário
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface UpdateStockInput {
  productId: string
  newPhysicalQty: number
  operatorUserId: string
}

/**
 * ATUALIZAÇÃO RÁPIDA DE ESTOQUE (Distribuidora)
 * Permite que o operador ou admin da distribuidora ajuste o estoque físico real (stock_qty)
 * de forma rápida e segura com validação multi-tenant.
 */
export async function updateProductPhysicalStock({
  productId,
  newPhysicalQty,
  operatorUserId
}: UpdateStockInput) {
  try {
    // 1. Resolve o escopo do usuário operador
    const scope = await resolveUserScope(operatorUserId)

    if (!scope.isCompanyScope) {
      return { 
        success: false, 
        error: 'Acesso negado. Apenas administradores de distribuidoras podem reabastecer o inventário.' 
      }
    }

    // 2. Validação Multi-tenant estrita (o produto pertence à empresa do operador?)
    const { data: product, error: findError } = await supabaseAdmin
      .from('products')
      .select('company_id')
      .eq('id', productId)
      .single()

    if (findError || !product) {
      return { success: false, error: 'Produto não localizado.' }
    }

    if (product.company_id !== scope.companyId) {
      return { success: false, error: 'Operação ilegal: Este produto não pertence à sua distribuidora.' }
    }

    // 3. Atualiza as unidades físicas disponíveis
    const { error: updateError } = await supabaseAdmin
      .from('products')
      .update({
        stock_qty: newPhysicalQty,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)

    if (updateError) throw updateError

    return { success: true }

  } catch (error: any) {
    console.error('[Stock Action Critical Error]:', error.message)
    return { success: false, error: 'Falha interna ao processar alteração de estoque.' }
  }
}

interface OrderItem {
  productId: string
  quantity: number
}

/**
 * ENGINE DE SOFT LOCK (RESERVA DE ESTOQUE B2B)
 * Tenta realizar a reserva atômica para cada um dos itens do pedido.
 * Caso ocorra indisponibilidade em qualquer produto, reverte as reservas anteriores.
 */
export async function applySoftLockReservation(orderId: string, items: OrderItem[]): Promise<{ success: boolean; error?: string }> {
  const reservedItems: OrderItem[] = []

  try {
    for (const item of items) {
      const { data, error } = await supabaseAdmin.rpc('v3_reserve_stock', {
        p_product_id: item.productId,
        p_quantity: item.quantity
      })

      if (error || !data?.success) {
        // Se falhar a reserva de um item (estoque insuficiente ou erro de ID), dispara rollback manual das reservas feitas neste laço
        for (const reserved of reservedItems) {
          await supabaseAdmin.rpc('v3_release_stock', {
            p_product_id: reserved.productId,
            p_quantity: reserved.quantity
          })
        }
        return { 
          success: false, 
          error: data?.error || `Estoque esgotado ou indisponível para o produto ID ${item.productId}` 
        }
      }

      // Registra que a reserva deste item foi bem-sucedida para o caso de eventual rollback
      reservedItems.push(item)
    }

    return { success: true }

  } catch (error: any) {
    console.error('[SoftLock Processor Error]:', error.message)
    return { success: false, error: 'Falha catastrófica ao processar as reservas de estoque.' }
  }
}
