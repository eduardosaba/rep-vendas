import { SupabaseClient } from '@supabase/supabase-js'
import { EventMapper, RawEventPayload } from './event-mapper'

/**
 * Mapeia um evento de pedido/domínio para intenções de notificação
 * e as insere na tabela notification_outbox transacionalmente.
 */
export async function notifyEvent(
  supabase: SupabaseClient,
  eventId: string,
  eventType: string,
  payload: any
): Promise<void> {
  try {
    // 1. Busca os metadados do evento
    const { data: eventData, error: eventError } = await supabase
      .from('order_events')
      .select('order_id')
      .eq('id', eventId)
      .single()

    if (eventError || !eventData) {
      console.warn(`[OutboxService] Evento ${eventId} não encontrado para processamento do outbox:`, eventError?.message)
      return
    }

    // 2. Busca o pedido para extrair contatos de destino (cliente e representante)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id, 
        version,
        client_contact_phone,
        client_contact_email,
        customer:customers(phone, email),
        representative:profiles!representative_id(phone, full_name)
      `)
      .eq('id', eventData.order_id)
      .single()

    if (orderError || !order) {
      console.warn(`[OutboxService] Pedido ${eventData.order_id} não encontrado para processamento do outbox:`, orderError?.message)
      return
    }

    const customer = order.customer as any
    const representative = order.representative as any

    // 3. Monta o payload do evento no formato esperado pelo mapeador
    const rawEvent: RawEventPayload = {
      event_type: eventType,
      order_id: order.id,
      order_version: order.version || 1,
      payload: {
        ...payload,
        customer_phone: customer?.phone || order.client_contact_phone,
        customer_email: customer?.email || order.client_contact_email,
        representative_phone: representative?.phone,
        actor_name: 'Sistema'
      }
    }

    // 4. Mapeia o evento bruto para intenções de notificação específicas por canal
    const intents = EventMapper.mapEventToIntent(rawEvent)

    if (intents.length === 0) {
      return
    }

    // 5. Salva na fila de outbox
    const outboxRows = intents.map(intent => ({
      event_id: eventId,
      channel: intent.channel,
      provider: intent.provider,
      destination: intent.destination,
      priority: intent.priority,
      payload: {
        template: intent.template,
        variables: intent.variables
      }
    }))

    const { error: insertError } = await supabase
      .from('notification_outbox')
      .insert(outboxRows)

    if (insertError) {
      console.error(`[OutboxService] Falha ao persistir notificações no outbox:`, insertError.message)
    }
  } catch (err: any) {
    console.error(`[OutboxService] Erro inesperado no outbox:`, err.message)
  }
}
