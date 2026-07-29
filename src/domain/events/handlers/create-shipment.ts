import { createClient } from '@/lib/supabase/server'
import { ShipmentAggregate } from '@/domain/fulfillment/shipping/shipment-aggregate'
import { OrderEventType } from '@/domain/orders/types'
import { notifyEvent } from '@/features/notifications/outbox-service'
import { InvoiceStatus } from '@/domain/fulfillment/invoicing/types'
import { FeatureService } from '@/domain/settings/feature-service'

export async function handleCreateShipmentOnInvoiceIssued(invoiceId: string): Promise<void> {
  const supabase = await createClient()
  
  // 1. Obter a Invoice Autorizada
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single()

  if (invoiceError || !invoice) {
    throw new Error(`Falha ao carregar Invoice ${invoiceId} no Handler de Expedição: ${invoiceError?.message}`)
  }

  // 1.5. Verificar se a flag de criação automática de envio está ativada
  const autoCreateShipment = await FeatureService.isAutoCreateShipmentEnabled(invoice.organization_id)
  if (!autoCreateShipment) {
    console.log(`⚠️ [Handler] Criação automática de envio desativada para a organização ${invoice.organization_id}`)
    return
  }

  const shipmentId = crypto.randomUUID()
  
  // 2. Instanciar o Aggregate do Shipment (Isso vai validar se a NF está ISSUED)
  const shipmentAggregate = ShipmentAggregate.create(
    shipmentId,
    invoice.order_id,
    invoice.id,
    invoice.organization_id,
    invoice.status as InvoiceStatus
  )

  const state = shipmentAggregate.getState()

  // 3. Salvar Shipment no Banco
  const { error: insertError } = await supabase
    .from('shipments')
    .insert({
      id: state.id,
      order_id: state.order_id,
      invoice_id: state.invoice_id,
      organization_id: state.organization_id,
      status: state.status
    })

  if (insertError) {
    throw new Error(`Falha ao criar o Shipment no BD: ${insertError.message}`)
  }

  // 4. Gerar Evento SHIPMENT_READY
  const eventPayload = {
    order_id: state.order_id,
    type: OrderEventType.SHIPMENT_READY,
    actor_id: null, // Sistema gerou
    aggregate_type: 'FULFILLMENT',
    aggregate_id: state.id,
    metadata: { source: 'INVOICE_ISSUED', invoice_id: invoiceId }
  }

  const { data: eventData } = await supabase
    .from('order_events')
    .insert(eventPayload)
    .select('id')
    .single()

  if (eventData) {
    await notifyEvent(supabase, eventData.id, OrderEventType.SHIPMENT_READY, { shipmentId: state.id })
  }
  
  console.log(`🚚 [Handler] Shipment ${state.id} (READY) gerado automaticamente pela NF Autorizada ${invoiceId}`)
}

