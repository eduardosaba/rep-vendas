import { tracePaymentEvent } from '@/actions/commercial/telemetry';
import { inngest } from '@/inngest/client';
import { normalizeMPWebhook } from '@/lib/observability/state-machine';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Instância administrativa para garantir que a gravação do log bruto ignore travas de RLS na borda
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * WEBHOOK INGRESS LAYER (Stateless, Fast & Async)
 * Recebe a notificação do provedor, garante persistência imediata e delega para a fila do Inngest.
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // 1. NORMALIZAÇÃO: Limpa e padroniza as variações de payload do Mercado Pago
    const { externalId, eventType, orderId } = normalizeMPWebhook(payload);

    if (!externalId) {
      return NextResponse.json(
        {
          error:
            'Payload inválido: Identificador externo (externalId) ausente.',
        },
        { status: 400 }
      );
    }

    // 2. IDEMPOTÊNCIA DE INGESTÃO: Evita sobrecarga ou logs duplicados para a mesma requisição
    const { data: existingLog } = await supabaseAdmin
      .from('payment_webhook_logs')
      .select('id, processed')
      .eq('external_id', String(externalId))
      .maybeSingle();

    let logId = existingLog?.id;

    if (!existingLog) {
      // "Write-First": Registra a verdade nua e crua do evento antes de avaliar regras de negócio
      const { data: insertedLog, error: insertError } = await supabaseAdmin
        .from('payment_webhook_logs')
        .insert({
          external_id: String(externalId),
          payload,
          processed: false,
          retry_count: 0,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      logId = insertedLog.id;
    }

    // Se o log já foi completamente liquidado e processado pelo banco no passado, encerra com No-Op veloz
    if (existingLog?.processed) {
      return NextResponse.json({
        success: true,
        message:
          'Idempotência na borda: Notificação já processada anteriormente pelo Ledger.',
      });
    }

    // 3. DISPARO EVENT-DRIVEN PARA O INNGEST
    if (logId) {
      const companyId = payload?.metadata?.company_id || 'unknown';

      // Telemetria defensiva em modo fire-and-forget (não bloqueia o HTTP se o trace oscilar)
      if (orderId) {
        tracePaymentEvent({
          orderId,
          companyId,
          step: 'webhook_received',
          status: 'success',
          payload: { event_type: eventType, external_id: externalId },
        }).catch((err) =>
          console.error(
            '[Telemetry Drop Warning]: Failed to log webhook ingestion',
            err.message
          )
        );
      }

      // Despacha o sinal para o barramento assíncrono trabalhar
      await inngest.send({
        name: 'payment/mercadopago.received',
        data: {
          log_id: logId,
          external_id: String(externalId),
          event_type: eventType,
        },
      });
    }

    return NextResponse.json({ success: true, log_id: logId });
  } catch (error: any) {
    console.error('[Webhook MP Boundary Critical Error]:', error.message);
    return NextResponse.json(
      {
        success: false,
        error: 'Falha interna na persistência do payload do provedor.',
      },
      { status: 500 }
    );
  }
}
