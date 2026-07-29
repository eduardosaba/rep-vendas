import { tracePaymentEvent } from '@/actions/commercial/telemetry';
import { deserializeAndDecrypt } from '@/lib/encryption';
import { normalizeMPWebhook } from '@/lib/observability/state-machine';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { inngest } from '../client';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MAX_RETRIES = 10;

export const processMercadoPagoWebhook = inngest.createFunction(
  { id: 'process-mercadopago-webhook', name: 'Processar Webhook Mercado Pago' },
  { event: 'payment/mercadopago.received' },
  async ({ event, step }) => {
    const { log_id, external_id } = event.data;

    // 1. LEITURA DO LOG DE INGESTÃO (TRUTH LAYER INTERNO)
    const log = await step.run('load-webhook-log', async () => {
      const { data } = await supabaseAdmin
        .from('payment_webhook_logs')
        .select('*')
        .eq('id', log_id)
        .single();
      return data;
    });

    if (!log || log.processed)
      return { message: 'No-Op: Log já processado ou inexistente.' };

    // Proteção estrita contra loops infinitos de retry (Dead Letter Queue)
    if (log.retry_count >= MAX_RETRIES) {
      await step.run('dead-letter-lock', async () => {
        await supabaseAdmin
          .from('payment_webhook_logs')
          .update({
            error_message: `Excedeu o teto de ${MAX_RETRIES} retentativas. Travado para auditoria manual.`,
          })
          .eq('id', log_id);
      });
      return { message: 'Requires manual review (Dead Letter).' };
    }

    // Normaliza o payload para garantir consistência de propriedades
    const { externalId, eventType, orderId } = normalizeMPWebhook(log.payload);
    if (!orderId)
      throw new Error(
        'Inconsistência: external_reference (orderId) ausente no payload.'
      );

    // 2. CORTE RÁPIDO INTERNO: IDEMPOTÊNCIA DO LEDGER
    const isAlreadyCompleted = await step.run(
      'check-ledger-idempotency',
      async () => {
        const { data } = await supabaseAdmin
          .from('payment_transactions')
          .select('status')
          .eq('provider_transaction_id', external_id)
          .limit(1);
        return data && data[0]?.status === 'completed';
      }
    );

    if (isAlreadyCompleted) {
      await step.run('close-log-as-idempotent', async () => {
        await supabaseAdmin
          .from('payment_webhook_logs')
          .update({ processed: true })
          .eq('id', log_id);
      });
      return {
        message: 'Idempotência acionada. Transação já constava como concluída.',
      };
    }

    try {
      // 3. HANDSHAKE COM O DOMÍNIO: Busca o estado atual do Pedido
      const order = await step.run('fetch-order-state', async () => {
        const { data } = await supabaseAdmin
          .from('orders')
          .select('company_id, status, total_value')
          .eq('id', orderId)
          .single();
        return data;
      });

      if (!order)
        throw new Error(
          `Pedido ${orderId} não localizado na base do RepVendas.`
        );

      // Se o negócio já foi faturado e liquidado (paid), encerra o processo sem reexecutar infra técnica
      if (order.status === 'paid') {
        await supabaseAdmin
          .from('payment_webhook_logs')
          .update({ processed: true })
          .eq('id', log_id);
        return { message: 'Idempotência de negócio: Pedido já faturado.' };
      }

      const companyId = order.company_id;

      // 4. HANDSHAKE COM AS CREDENCIAIS: Busca o token criptografado da Ótica
      const gateway = await step.run('fetch-tenant-gateway', async () => {
        const { data } = await supabaseAdmin
          .from('payment_gateways')
          .select('id, api_key_encrypted')
          .eq('company_id', companyId)
          .eq('provider', 'mercadopago')
          .eq('is_active', true)
          .single();
        return data;
      });

      if (!gateway)
        throw new Error(
          `Gateway ativo indisponível para o tenant ${companyId}`
        );
      const accessToken = deserializeAndDecrypt(gateway.api_key_encrypted);

      // Carimba o início da análise técnica de infraestrutura
      await tracePaymentEvent({
        orderId,
        companyId,
        step: 'inngest_triggered',
        status: 'pending',
      }).catch(() => {});

      // 5. CONSULTA OFICIAL À API DO PROVEDOR (Handshake cego contra fraudes de payload)
      const paymentData = await step.run('fetch-provider-truth', async () => {
        const mpClient = new MercadoPagoConfig({ accessToken });
        const mpPayment = new Payment(mpClient);
        return await mpPayment.get({ id: Number(external_id) });
      });

      // 6. EXECUÇÃO SOBERANA NO LEDGER (RPC ATÔMICA POSTGRESQL)
      // Passamos o status oficial retornado pela API para a RPC julgar as máquinas de estado
      const responseSummary = {
        date_approved: paymentData.date_approved,
        payment_method_id: paymentData.payment_method_id,
        installments: paymentData.installments,
      };

      const rpcResult = await step.run(
        'commit-transaction-ledger',
        async () => {
          const { data, error } = await supabaseAdmin.rpc(
            'v2_confirm_payment',
            {
              p_order_id: orderId,
              p_company_id: companyId,
              p_provider_transaction_id: String(external_id),
              p_amount_cents: order.total_value,
              p_mp_status: paymentData.status,
              p_response_summary: responseSummary,
            }
          );
          if (error) throw error;
          return data as { success: boolean; action?: string; error?: string };
        }
      );

      if (!rpcResult.success) {
        throw new Error(`RPC Abortada: ${rpcResult.error}`);
      }

      // 7. CARIMBO DE TELEMETRIA BASEADO NO SUCESSO DA TRANSICAO
      if (rpcResult.action === 'state_transition_paid_completed') {
        await tracePaymentEvent({
          orderId,
          companyId,
          step: 'transaction_confirmed',
          status: 'success',
        }).catch(() => {});
        // [Sprint 1C: Ganchos assíncronos de baixa de estoque e CRM disparam aqui]
      } else if (rpcResult.action === 'state_transition_failed_final') {
        await tracePaymentEvent({
          orderId,
          companyId,
          step: 'error_occurred',
          status: 'failed',
          message: `Pagamento negado de forma definitiva: ${paymentData.status}`,
        }).catch(() => {});
      }

      // 8. LIQUIDAÇÃO COMPLETA DO LOG DE Webhook
      await step.run('close-webhook-log', async () => {
        await supabaseAdmin
          .from('payment_webhook_logs')
          .update({
            processed: true,
            processed_at: new Date().toISOString(),
            error_message: null,
          })
          .eq('id', log_id);
      });

      return { success: true, action: rpcResult.action };
    } catch (error: any) {
      // Gerenciamento resiliente de retries com backoff linear/exponencial do Inngest
      await step.run('increment-retry-state', async () => {
        await supabaseAdmin
          .from('payment_webhook_logs')
          .update({
            retry_count: log.retry_count + 1,
            last_attempt_at: new Date().toISOString(),
            error_message: error.message,
          })
          .eq('id', log_id);
      });
      throw error; // Lança a exceção para o Inngest agendar o reprocessamento correto
    }
  }
);
