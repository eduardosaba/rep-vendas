import { NotificationChannelType, NotificationIntent } from './notification-types'

export interface RawEventPayload {
  event_type: string
  order_id: string
  order_version: number
  payload: {
    actor_name?: string
    reason?: string
    customer_phone?: string
    customer_email?: string
    representative_phone?: string
    [key: string]: any
  }
}

export const EventMapper = {
  /**
   * Converte eventos brutos de domínio em Intenções de Notificação agnósticas (Templates e Metadados).
   * O Dispatcher ou o Rendering Engine futuro montará a string final.
   */
  mapEventToIntent(rawEvent: RawEventPayload): NotificationIntent[] {
    const eventType = rawEvent.event_type;
    const intents: NotificationIntent[] = [];

    // Dependendo do evento, decidimos gerar intenções para Canais diferentes.
    // O texto final não fica aqui, apenas o Template.
    
    if (eventType === 'APPROVED') {
      // Intenção 1: WhatsApp para o Representante
      if (rawEvent.payload?.representative_phone) {
        intents.push({
          channel: NotificationChannelType.WHATSAPP,
          provider: 'ZAPI',
          destination: rawEvent.payload.representative_phone,
          template: 'tpl_order_approved_rep',
          priority: 5,
          variables: {
            order_id: rawEvent.order_id,
            order_version: rawEvent.order_version,
            actor: rawEvent.payload.actor_name || 'Sistema'
          }
        });
      }

      // Intenção 2: E-mail para o Cliente
      if (rawEvent.payload?.customer_email) {
        intents.push({
          channel: NotificationChannelType.EMAIL,
          provider: 'RESEND',
          destination: rawEvent.payload.customer_email,
          template: 'tpl_order_approved_customer',
          priority: 5,
          variables: {
            order_id: rawEvent.order_id
          }
        });
      }
    } else if (eventType === 'REJECTED') {
      // Intenção: WhatsApp URGENTE para Representante
      if (rawEvent.payload?.representative_phone) {
        intents.push({
          channel: NotificationChannelType.WHATSAPP,
          provider: 'ZAPI',
          destination: rawEvent.payload.representative_phone,
          template: 'tpl_order_rejected_rep',
          priority: 8, // Prioridade mais alta
          variables: {
            order_id: rawEvent.order_id,
            reason: rawEvent.payload.reason || 'Não informado',
            actor: rawEvent.payload.actor_name || 'Sistema'
          }
        });
      }
    } else if (eventType === 'INVOICED') {
      // Faturamento costuma gerar um e-mail com XML/PDF
      if (rawEvent.payload?.customer_email) {
        intents.push({
          channel: NotificationChannelType.EMAIL,
          provider: 'RESEND',
          destination: rawEvent.payload.customer_email,
          template: 'tpl_order_invoiced_customer',
          priority: 10,
          variables: {
            order_id: rawEvent.order_id,
            access_key: rawEvent.payload.access_key || ''
          }
        });
      }
    }

    return intents;
  }
};
