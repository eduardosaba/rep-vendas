'use server';

import { createClient } from '@supabase/supabase-js';

// Client administrativo para garantir a gravação dos logs de auditoria mesmo sob RLS restrito
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface TraceInput {
  orderId: string;
  companyId: string;
  step:
    | 'webhook_received'
    | 'inngest_triggered'
    | 'mp_api_fetch'
    | 'order_updated'
    | 'transaction_confirmed'
    | 'error_occurred';
  status: 'success' | 'failed' | 'pending';
  message?: string | null;
  payload?: Record<string, any>;
}

/**
 * Telemetry Core Engine (RepVendas Financial Observability)
 * Registra o rastreamento linear de eventos para auditoria e streaming em tempo real.
 */
export async function tracePaymentEvent({
  orderId,
  companyId,
  step,
  status,
  message = null,
  payload = {},
}: TraceInput) {
  try {
    // Garante que chaves nulas ou IDs vazios não passem, evitando sujeira no trace ledger
    if (!orderId || !companyId) {
      console.warn(
        `[Telemetry Blank Context Warning]: Omitido trace para order:${orderId} | company:${companyId}`
      );
      return;
    }

    const { error } = await supabaseAdmin.from('payment_event_traces').insert({
      order_id: orderId,
      company_id: companyId,
      step,
      status,
      message,
      payload: {
        ...payload,
        timestamp_local: new Date().toISOString(),
      },
    });

    if (error) {
      // Se falhar a gravação do log, jogamos no console do servidor para não derrubar o fluxo core de pagamentos
      console.error('[Telemetry Database Error]:', error.message);
    }
  } catch (err: any) {
    console.error(
      '[Telemetry Critical Failure]: Unhandled exception inside telemetry engine',
      err.message
    );
  }
}
