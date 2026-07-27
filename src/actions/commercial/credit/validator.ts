'use server'

import { createClient } from '@/lib/supabase/server'
import { OrderStatus } from '@/domain/orders/constants'

/**
 * Calcula o Crédito Disponível de um Cliente com base no risco real em aberto.
 * 
 * Crédito Disponível = Limite de Crédito Total - (Pedidos Pendentes + Pedidos Aprovados + Faturados Não Pagos)
 */
export async function calculateAvailableCredit(clientId: string): Promise<number> {
  const supabase = await createClient()
  
  // 1. Busca o limite de crédito total concedido ao cliente
  const { data: clientData } = await supabase
    .from('clients')
    .select('credit_limit')
    .eq('id', clientId)
    .single()

  const creditLimit = parseFloat(clientData?.credit_limit as any || 0)
  
  if (creditLimit <= 0) return 0

  // 2. Calcula o risco em aberto (Pedidos que ainda não foram liquidados financeiramente)
  // Status que consomem crédito: Pendente, Aprovado, Aguardando Aprovação, Faturado.
  const { data: openOrders, error } = await supabase
    .from('orders')
    .select('total_value')
    .eq('client_id', clientId)
    .in('status', [
      OrderStatus.PENDING, 
      OrderStatus.APPROVED, 
      OrderStatus.WAITING_FINANCE, 
      OrderStatus.BILLED
    ])

  if (error || !openOrders) {
    return 0 // Em caso de erro na consulta, bloqueia por segurança
  }

  const consumedCredit = openOrders.reduce((acc, order) => acc + parseFloat(order.total_value || 0), 0)
  const availableCredit = creditLimit - consumedCredit

  return availableCredit > 0 ? availableCredit : 0
}
