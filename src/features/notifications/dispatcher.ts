import { createClient } from '@/lib/supabase/server'
import { NotificationChannelType } from './notification-types'
import { WhatsAppChannel } from './channels/whatsapp'
import { EmailChannel } from './channels/email'
import { NotificationChannel } from './channels'

export async function processNotificationOutboxQueue() {
  const supabase = await createClient()

  try {
    // 1. claimBatch usando FOR UPDATE SKIP LOCKED
    // Supabase JS não possui SKIP LOCKED nativo no fluent builder (.select()), precisamos invocar via RPC para usar a feature avançada do Postgres.
    const { data: outboxItems, error: claimError } = await supabase.rpc('claim_pending_notifications', { p_limit: 50 })

    if (claimError) {
      console.error('[Notification Dispatcher] Error claiming batch:', claimError.message)
      return { success: false, error: claimError.message }
    }

    if (!outboxItems || outboxItems.length === 0) {
      return { success: true, processed: 0 }
    }

    let processedCount = 0;

    // 2. Process each claimed item
    for (const item of outboxItems) {
      try {
        const channelInstance = resolveChannel(item.channel as NotificationChannelType);
        if (!channelInstance) {
          throw new Error(`Canal não suportado: ${item.channel}`);
        }

        // 3. channel.send()
        const intent = {
          channel: item.channel as NotificationChannelType,
          provider: item.provider,
          destination: item.destination,
          template: item.payload?.template || 'default',
          variables: item.payload?.variables || {},
          priority: item.priority
        }

        const result = await channelInstance.send(intent)

        if (!result.success) {
          throw new Error(result.error || 'Falha silenciosa no canal');
        }

        // 4. markSent()
        await supabase
          .from('notification_outbox')
          .update({ 
            status: 'SENT', 
            processed_at: new Date().toISOString() 
          })
          .eq('id', item.id);
          
        processedCount++;
      } catch (err: any) {
        // markFailed()
        await markFailed(supabase, item, err.message)
      }
    }

    return { success: true, processed: processedCount }
  } catch (error: any) {
    console.error('[Notification Dispatcher Crash]:', error.message)
    return { success: false, error: error.message }
  }
}

function resolveChannel(channel: NotificationChannelType): NotificationChannel | null {
  switch (channel) {
    case NotificationChannelType.WHATSAPP:
      return new WhatsAppChannel();
    case NotificationChannelType.EMAIL:
      return new EmailChannel();
    default:
      return null;
  }
}

async function markFailed(supabase: any, item: any, errorMessage: string) {
  const newAttempts = item.attempts + 1;
  const isFinalFailure = newAttempts >= 5;
  
  // Backoff exponencial simples: 30s, 2m, 10m, 1h
  let delayMinutes = 0;
  if (newAttempts === 1) delayMinutes = 0.5;
  else if (newAttempts === 2) delayMinutes = 2;
  else if (newAttempts === 3) delayMinutes = 10;
  else if (newAttempts === 4) delayMinutes = 60;

  const nextRetryAt = new Date();
  nextRetryAt.setMinutes(nextRetryAt.getMinutes() + delayMinutes);

  await supabase
    .from('notification_outbox')
    .update({
      status: isFinalFailure ? 'FAILED' : 'PENDING',
      attempts: newAttempts,
      last_error: errorMessage,
      next_retry_at: isFinalFailure ? item.next_retry_at : nextRetryAt.toISOString()
    })
    .eq('id', item.id);
}
