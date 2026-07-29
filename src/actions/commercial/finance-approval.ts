'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { OrderStatus } from '@/domain/orders/constants'

export async function approveCreditOverride(orderId: string, action: 'APPROVE' | 'REJECT') {
  try {
    const supabase = await createClient()

    // 1. Valida a sessão e se o usuário é da retaguarda administrativa
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Sessão expirada.' }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, company_id, role, name')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'master', 'financeiro'].includes(profile.role)) {
      return { success: false, error: 'Acesso negado. Permissão exclusiva do financeiro.' }
    }

    const tenantId = profile.organization_id || profile.company_id

    // 2. Validação de Estado Seguro: busca a ordem e garante que está em estado de aprovação
    const { data: currentOrder, error: orderError } = await supabase
      .from('orders')
      .select('status, notes')
      .eq('id', orderId)
      .single()

    if (orderError || !currentOrder) {
      return { success: false, error: 'Ordem não encontrada.' }
    }

    if (currentOrder.status !== OrderStatus.WAITING_FINANCE) {
      return { success: false, error: 'A ordem não está aguardando aprovação financeira. O status atual é ' + currentOrder.status }
    }

    // 3. Determina o novo status e anexa (append) a nota de auditoria
    const nextStatus = action === 'APPROVE' ? OrderStatus.APPROVED : OrderStatus.CANCELLED
    const logMessage = action === 'APPROVE' 
      ? `[CRÉDITO LIBERADO] Forçado por ${profile.name} em ${new Date().toLocaleString('pt-BR')}`
      : `[CRÉDITO REJEITADO] Cancelado pelo financeiro em ${new Date().toLocaleString('pt-BR')}`

    // Anexando a nota de log de forma não-destrutiva
    const newNotes = currentOrder.notes 
      ? `${currentOrder.notes}\n\n${logMessage}` 
      : logMessage

    // 4. Update otimista com blindagem de estado (Optimistic Concurrency Control)
    let updateQuery = supabase
      .from('orders')
      .update({
        status: nextStatus,
        notes: newNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .eq('status', OrderStatus.WAITING_FINANCE)

    // Multi-tenancy: a diretoria financeira só aprova pedidos do seu próprio tenant
    if (tenantId) {
      // Como o legado pode ter organization_id ou company_id, e o supabase RPC update simples precisa de or,
      // usaremos company_id porque o Order Engine já lê do company_id conforme auditado.
      updateQuery = updateQuery.eq('company_id', tenantId)
    }

    const { error: updateError } = await updateQuery

    if (updateError) throw updateError

    revalidatePath('/distribuidora/financeiro/aprovacoes')
    revalidatePath('/distribuidora/pedidos')
    return { success: true }

  } catch (error: any) {
    console.error('[Credit Override Failure]:', error.message)
    return { success: false, error: 'Erro ao processar a liberação do pedido.' }
  }
}
