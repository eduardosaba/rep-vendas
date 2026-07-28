/**
 * src/inngest/payment-webhook-job.ts
 *
 * Inngest Job para processar fila de webhooks do Mercado Pago
 * Executa a cada 5 segundos para buscar e processar items pendentes
 *
 * Inngest é essencial para background jobs confiáveis
 */

import { processWebhookQueue } from '@/actions/payment-webhook-processor';
import { inngest } from '@/inngest/client';

/**
 * Job: Processar um item da fila de webhooks
 * Executado a cada 5 segundos
 */
export const processPaymentWebhookJob = inngest.createFunction(
  {
    id: 'payment-webhook-processor',
    name: 'Process Payment Webhook Queue',
    description: 'Processa itens pendentes da fila de webhooks do Mercado Pago',
  },
  { cron: '*/5 * * * * *' }, // A cada 5 segundos
  async ({ logger }) => {
    try {
      logger.info('🔄 Starting webhook queue processor...');

      const result = await processWebhookQueue();

      if (result.ok) {
        logger.info('✅ Webhook processed successfully', { result });
      } else {
        logger.warn('⚠️ Webhook processing failed', { error: result.error });
      }

      return {
        ok: result.ok,
        timestamp: new Date().toISOString(),
        ...(result.ok ? { reason: result.reason } : { error: result.error }),
      };
    } catch (error) {
      logger.error('❌ Error in webhook processor:', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }
);

/**
 * Event: Trigger manual para processar webhook
 * (para testes ou processamento urgente)
 */
export const paymentWebhookReceived = inngest.createFunction(
  {
    id: 'payment-webhook-received',
    name: 'Payment Webhook Received',
  },
  { event: 'payment/webhook.received' },
  async ({ event, logger }) => {
    logger.info('📨 Processing webhook event:', {
      paymentId: event.data.paymentId,
    });

    const result = await processWebhookQueue();

    return {
      ok: result.ok,
      event: event.data,
    };
  }
);
