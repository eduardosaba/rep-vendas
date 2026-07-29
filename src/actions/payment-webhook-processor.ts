'use server';

/**
 * src/actions/payment-webhook-processor.ts
 *
 * Server Action para processar a fila de webhooks do Mercado Pago
 * com retry logic e exponential backoff.
 *
 * Fluxo:
 * 1. Webhook enfileira payment_id em webhook_queue
 * 2. Background job (Inngest) chama processWebhookQueue()
 * 3. Busca payment na API do MP
 * 4. Atualiza payment_transactions + orders
 * 5. Se erro, agenda retry com exponential backoff
 */

import { createClient } from '@supabase/supabase-js';

type QueueProcessingResult =
  | { ok: true; reason?: string }
  | { ok: false; error: string };

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * 1. PROCESSAR UM ITEM DA FILA
 *
 * Chamado pelo Inngest a cada 5 segundos
 * (ou você pode chamar manualmente via API endpoint)
 */
export async function processWebhookQueue(): Promise<QueueProcessingResult> {
  try {
    // Buscar primeiro item pendente
    const { data: queueItem, error: fetchError } = await supabaseAdmin
      .from('webhook_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        // Sem items pendentes (normal)
        return { ok: true, reason: 'queue_empty' };
      }
      throw fetchError;
    }

    if (!queueItem) {
      return { ok: true, reason: 'queue_empty' };
    }

    // Processar este item
    return await processPaymentWebhook(
      queueItem.id,
      queueItem.provider_payment_id
    );
  } catch (error) {
    console.error('[processWebhookQueue] Error:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 2. PROCESSAR UM PAGAMENTO ESPECÍFICO
 */
async function processPaymentWebhook(
  queueItemId: string,
  paymentId: string
): Promise<QueueProcessingResult> {
  try {
    console.log(`[PaymentWebhookProcessor] Processing payment: ${paymentId}`);

    // 1. Marcar como "processando"
    await supabaseAdmin
      .from('webhook_queue')
      .update({ status: 'processing' })
      .eq('id', queueItemId);

    // 2. Buscar dados do pagamento no Mercado Pago
    const mpPaymentData = await getMercadoPagoPayment(paymentId);

    if (!mpPaymentData) {
      throw new Error('Failed to fetch payment from Mercado Pago');
    }

    // 3. Buscar a transação no nosso banco
    const { data: transaction, error: txError } = await supabaseAdmin
      .from('payment_transactions')
      .select('*')
      .eq('provider_transaction_id', paymentId)
      .single();

    if (txError) {
      console.error(
        '[PaymentWebhookProcessor] Transaction not found:',
        txError
      );
      throw new Error(`Transaction not found for payment ${paymentId}`);
    }

    if (!transaction) {
      throw new Error(`Transaction record missing for payment ${paymentId}`);
    }

    // 4. Mapear status
    const newStatus = mapMercadoPagoStatus(mpPaymentData.status);
    const oldStatus = transaction.status;

    // 5. Atualizar transação
    const { error: updateTxError } = await supabaseAdmin
      .from('payment_transactions')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        approved_at: newStatus === 'approved' ? new Date().toISOString() : null,
        metadata: {
          ...(transaction.metadata || {}),
          last_webhook_processed: new Date().toISOString(),
          mp_status_transition: `${oldStatus} → ${newStatus}`,
          mp_payment_data: {
            status: mpPaymentData.status,
            payer_email: mpPaymentData.payer?.email,
            payment_method_id: mpPaymentData.payment_method_id,
            payment_type_id: mpPaymentData.payment_type_id,
          },
        },
      })
      .eq('id', transaction.id);

    if (updateTxError) {
      console.error(
        '[PaymentWebhookProcessor] Error updating transaction:',
        updateTxError
      );
      throw updateTxError;
    }

    // 6. Atualizar status do pedido (ATÔMICA - Idempotente)
    let orderNewStatus = 'Pendente';
    if (newStatus === 'approved') {
      orderNewStatus = 'Pagamento Confirmado';
    } else if (newStatus === 'failed') {
      orderNewStatus = 'Pagamento Recusado';
    } else if (newStatus === 'refunded') {
      orderNewStatus = 'Reembolsado';
    }

    // ⚡ QUERY ATÔMICA: Só atualiza se ainda não foi pago
    // Isso garante idempotência - se o webhook chegar 2x, só processa 1x
    const { data: updatedOrders, error: updateOrderError } = await supabaseAdmin
      .from('orders')
      .update({
        status: orderNewStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transaction.order_id)
      .neq('status', 'Pagamento Confirmado')
      .select('id');

    if (updateOrderError) {
      console.error(
        '[PaymentWebhookProcessor] Error updating order:',
        updateOrderError
      );
      // Não lançar erro aqui - a transação foi atualizada, só o pedido que falhou
    }

    // Verificar se foi realmente atualizado (idempotência)
    if ((updatedOrders?.length ?? 0) === 0 && newStatus === 'approved') {
      console.warn(
        `[PaymentWebhookProcessor] Order ${transaction.order_id} foi atualizado anteriormente (webhook duplicado)`
      );
    }

    // 7. Marcar fila como completada
    const { error: completeError } = await supabaseAdmin
      .from('webhook_queue')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', queueItemId);

    if (completeError) {
      console.error(
        '[PaymentWebhookProcessor] Error marking as completed:',
        completeError
      );
    }

    console.log(
      `[PaymentWebhookProcessor] ✅ Payment ${paymentId} processed successfully`
    );
    console.log(`  Order ${transaction.order_id} status: ${orderNewStatus}`);

    return { ok: true };
  } catch (error) {
    console.error(
      `[PaymentWebhookProcessor] Error processing ${paymentId}:`,
      error
    );

    // Implementar retry com exponential backoff
    await handleWebhookError(queueItemId, error);

    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 3. LIDAR COM ERROS E RETRY LOGIC
 */
async function handleWebhookError(queueItemId: string, error: any) {
  try {
    // Buscar item atual
    const { data: queueItem } = await supabaseAdmin
      .from('webhook_queue')
      .select('*')
      .eq('id', queueItemId)
      .single();

    if (!queueItem) return;

    const attempts = (queueItem.attempts || 0) + 1;
    const maxAttempts = queueItem.max_attempts || 5;

    // Exponential backoff: 2^attempts segundos
    const delaySeconds = Math.pow(2, Math.min(attempts, 5));
    const nextRetryAt = new Date(
      Date.now() + delaySeconds * 1000
    ).toISOString();

    if (attempts >= maxAttempts) {
      // Máximo de tentativas atingido
      console.error(
        `[PaymentWebhookProcessor] Max retries reached for ${queueItem.provider_payment_id}`
      );

      await supabaseAdmin
        .from('webhook_queue')
        .update({
          status: 'failed',
          attempts,
          error_message: `Max retries (${maxAttempts}) reached: ${error instanceof Error ? error.message : String(error)}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', queueItemId);

      // TODO: Enviar notificação ao admin
      return;
    }

    // Agendar retry
    console.log(
      `[PaymentWebhookProcessor] Scheduling retry ${attempts}/${maxAttempts} for ${queueItem.provider_payment_id}`,
      `in ${delaySeconds}s`
    );

    await supabaseAdmin
      .from('webhook_queue')
      .update({
        status: 'pending',
        attempts,
        error_message: error instanceof Error ? error.message : String(error),
        next_retry_at: nextRetryAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', queueItemId);
  } catch (err) {
    console.error(
      '[PaymentWebhookProcessor] Error handling webhook error:',
      err
    );
  }
}

/**
 * 4. BUSCAR PAGAMENTO NO MERCADO PAGO
 */
async function getMercadoPagoPayment(paymentId: string): Promise<any> {
  try {
    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      throw new Error('MERCADO_PAGO_ACCESS_TOKEN not configured');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `MP API error: ${response.status} - ${JSON.stringify(errorData)}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error('[getMercadoPagoPayment] Error:', error);
    throw error;
  }
}

/**
 * 5. MAPEAR STATUS DO MP PARA NOSSO SCHEMA
 */
function mapMercadoPagoStatus(
  mpStatus: string
): 'pending' | 'approved' | 'failed' | 'refunded' | 'cancelled' {
  const normalized = mpStatus?.toLowerCase() || 'pending';

  switch (normalized) {
    case 'approved':
    case 'authorized':
      return 'approved';
    case 'rejected':
    case 'charge_back':
      return 'failed';
    case 'refunded':
      return 'refunded';
    case 'cancelled':
      return 'cancelled';
    case 'pending':
    case 'in_process':
    default:
      return 'pending';
  }
}

/**
 * 6. PROCESSAR TODA A FILA (para teste/admin)
 *
 * Endpoint: POST /api/admin/webhook/process-queue
 */
export async function processEntireWebhookQueue(): Promise<{
  ok: boolean;
  processed: number;
  failed: number;
  error?: string;
}> {
  try {
    let processed = 0;
    let failed = 0;

    // Processar até 100 items pendentes
    for (let i = 0; i < 100; i++) {
      const result = await processWebhookQueue();

      if (!result.ok) {
        break;
      }

      if (result.reason === 'queue_empty') {
        break;
      }

      processed++;
    }

    console.log(`[processEntireWebhookQueue] Processed ${processed} items`);

    return { ok: true, processed, failed };
  } catch (error) {
    console.error('[processEntireWebhookQueue] Error:', error);
    return {
      ok: false,
      processed: 0,
      failed: 1,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
