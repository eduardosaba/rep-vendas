import { createClient } from '@/lib/supabase/server'
import { InvoiceAggregate } from '@/domain/fulfillment/invoicing/invoice-aggregate'
import { OrderEventType } from '@/domain/orders/types'
import { notifyEvent } from '@/features/notifications/outbox-service'
import { FeatureService } from '@/domain/settings/feature-service'

export async function handleCreateDraftInvoiceOnPickingCompleted(pickListId: string): Promise<void> {
  const supabase = await createClient()
  
  // 1. Obter a Pick List completa com items para o Snapshot
  const { data: pickList, error: pickListError } = await supabase
    .from('pick_lists')
    .select('*, items:pick_list_items(*)')
    .eq('id', pickListId)
    .single()

  if (pickListError || !pickList) {
    throw new Error(`Falha ao carregar PickList ${pickListId} no Handler fiscal: ${pickListError?.message}`)
  }

  // 1.5. Verificar se a flag de criação automática de faturamento está ativada
  const autoCreateEnabled = await FeatureService.isAutoCreateInvoiceEnabled(pickList.organization_id)
  if (!autoCreateEnabled) {
    console.log(`⚠️ [Handler] Criação automática de faturamento desativada para a organização ${pickList.organization_id}`)
    return
  }

  // 2. Obter os dados do Pedido e Cliente
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*, customer:customers(*), items:order_items(*)')
    .eq('id', pickList.order_id)
    .single()

  if (orderError || !order) {
    throw new Error(`Pedido não encontrado para PickList ${pickListId}: ${orderError?.message}`)
  }

  // 3. Montar Snapshots da Nota Fiscal
  const customerSnapshot = order.customer
  const totalsSnapshot = {
    total: order.total_amount,
    subtotal: order.subtotal_amount,
    discount: order.discount_amount
  }
  
  // No mundo real, aqui o sistema cruzaria o pedido original com o que realmente foi separado 
  // no pickList.items (já que pode ter faltado algo e afetado o valor da NF).
  // Para MVP, vamos assumir que o invoice usa os order items como base.
  const itemsSnapshot = order.items

  const invoiceId = crypto.randomUUID()
  
  // 4. Instanciar o Aggregate do Invoice
  const invoiceAggregate = InvoiceAggregate.createDraft(
    invoiceId,
    order.id,
    order.organization_id,
    customerSnapshot,
    itemsSnapshot,
    totalsSnapshot
  )

  const state = invoiceAggregate.getState()

  // 5. Salvar Invoice no Banco
  const { error: insertError } = await supabase
    .from('invoices')
    .insert({
      id: state.id,
      order_id: state.order_id,
      organization_id: state.organization_id,
      status: state.status,
      fiscal_status: state.fiscal_status,
      total_amount: state.total_amount,
      customer_snapshot: state.customer_snapshot,
      items_snapshot: state.items_snapshot,
      totals_snapshot: state.totals_snapshot
    })

  if (insertError) {
    throw new Error(`Falha ao salvar a Invoice DRAFT no BD: ${insertError.message}`)
  }

  // 6. Gerar Evento INVOICE_CREATED
  const eventPayload = {
    order_id: state.order_id,
    type: OrderEventType.INVOICE_CREATED,
    actor_id: null, // Sistema gerou
    aggregate_type: 'FULFILLMENT',
    aggregate_id: state.id,
    metadata: { source: 'PICKING_COMPLETED', pick_list_id: pickListId }
  }

  const { data: eventData } = await supabase
    .from('order_events')
    .insert(eventPayload)
    .select('id')
    .single()

  if (eventData) {
    await notifyEvent(supabase, eventData.id, OrderEventType.INVOICE_CREATED, { invoiceId: state.id })
  }
  
  console.log(`✅ [Handler] Invoice DRAFT ${state.id} gerada automaticamente pelo término do Picking ${pickListId}`)

  // 7. Se o modo fiscal for Automático, dispara emissão imediata
  const fiscalMode = await FeatureService.getFiscalMode(pickList.organization_id)
  if (fiscalMode === 'automatic') {
    console.log(`⚡ [Handler] Modo Fiscal AUTOMÁTICO detectado. Emitindo nota fiscal ${state.id} automaticamente...`)
    const { issueInvoice } = await import('@/actions/fulfillment/issue-invoice')
    await issueInvoice(state.id).catch(err => {
      console.error(`❌ [Handler] Falha ao emitir nota fiscal ${state.id} automaticamente:`, err)
    })
  }
}

