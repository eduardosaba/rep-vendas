import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getGatewayConfig } from '@/lib/payments/config';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Webhook Idempotente do Asaas
 * Suporta confirmação de pagamentos, renovações, inadimplência e cancelamento
 */
export async function POST(req: Request) {
  const startedAt = new Date().toISOString();

  try {
    const rawBody = await req.text();
    let body: any = null;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Payload JSON inválido' },
        { status: 400 }
      );
    }

    // 1. Obter configurações ativas de gateway
    const config = await getGatewayConfig();

    // 2. Validação de Token de Segurança (asaas-access-token)
    const tokenHeader =
      req.headers.get('asaas-access-token') ||
      req.headers.get('x-webhook-token') ||
      req.headers.get('x-hook-token');

    if (config.asaasWebhookSecret) {
      if (!tokenHeader || tokenHeader !== config.asaasWebhookSecret) {
        console.warn('[Webhook Asaas] Token de acesso não autorizado:', {
          provided: tokenHeader ? '***' : 'ausente',
        });
        return NextResponse.json(
          { ok: false, error: 'Token de webhook não autorizado' },
          { status: 401 }
        );
      }
    }

    // 3. Extrair Evento e Objeto de Pagamento
    const event = body.event || body.eventType || body.type;
    const payment = body.payment || body.data || body;
    const eventId =
      body.id ||
      (payment?.id ? `${payment.id}_${event}` : null) ||
      `evt_${Date.now()}`;

    if (!event) {
      return NextResponse.json(
        { ok: false, error: 'Evento não especificado' },
        { status: 400 }
      );
    }

    // 4. Verificação de Idempotência (usa webhook_events que já existe no Supabase)
    try {
      const { data: existingEvent } = await (supabaseAdmin as any)
        .from('webhook_events')
        .select('id, processed')
        .eq('id', eventId)
        .maybeSingle();

      if (existingEvent && existingEvent.processed) {
        console.log(`[Webhook Asaas] Evento ${eventId} já processado anteriormente. Ignorando.`);
        return NextResponse.json({
          ok: true,
          already_processed: true,
          event,
          message: 'Evento já processado anteriormente.',
        });
      }

      await (supabaseAdmin as any).from('webhook_events').upsert(
        {
          id: eventId,
          event_type: event,
          payload: body,
          processed: false,
        },
        { onConflict: 'id' }
      );
    } catch (queueErr) {
      console.warn('[Webhook Asaas] Aviso fila de idempotência:', queueErr);
    }

    // 5. Processamento dos Tipos de Eventos
    const isPaymentConfirmed = ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'].includes(event);
    const isPaymentOverdue = ['PAYMENT_OVERDUE'].includes(event);
    const isSubscriptionDeleted = ['SUBSCRIPTION_DELETED', 'PAYMENT_DELETED'].includes(event);
    const isRefund = ['PAYMENT_REFUNDED', 'PAYMENT_CHARGEBACK_REQUESTED'].includes(event);

    const userId = payment?.externalReference;
    const asaasCustomerId = payment?.customer;
    const asaasSubscriptionId = payment?.subscription;
    const paymentMethod = payment?.billingType || payment?.paymentMethod || null;

    if (!userId && (isPaymentConfirmed || isPaymentOverdue || isSubscriptionDeleted || isRefund)) {
      console.warn(`[Webhook Asaas] Evento ${event} sem externalReference (userId):`, payment?.id);
    }

    // --- EVENTO 1: PAGAMENTO CONFIRMADO (ATIVAÇÃO / RENOVAÇÃO) ---
    if (isPaymentConfirmed && userId) {
      // Calcular nova data de validade (+30 dias)
      let baseDate = new Date();
      if (payment?.dueDate) {
        const dueDate = new Date(payment.dueDate);
        if (dueDate > baseDate) baseDate = dueDate;
      }
      baseDate.setDate(baseDate.getDate() + 30);
      const newExpiryIso = baseDate.toISOString();

      // Atualizar Subscriptions de forma resiliente (sem depender de constraint única em user_id)
      const { data: existingSub } = await (supabaseAdmin as any)
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      const subPayload = {
        user_id: userId,
        status: 'active',
        current_period_end: newExpiryIso,
        asaas_customer_id: asaasCustomerId,
        asaas_subscription_id: asaasSubscriptionId,
        payment_method: paymentMethod,
        updated_at: new Date().toISOString(),
      };

      let subErr = null;
      if (existingSub?.id) {
        const { error } = await (supabaseAdmin as any)
          .from('subscriptions')
          .update(subPayload)
          .eq('id', existingSub.id);
        subErr = error;
      } else {
        const { error } = await (supabaseAdmin as any)
          .from('subscriptions')
          .insert({
            ...subPayload,
            created_at: new Date().toISOString(),
          });
        subErr = error;
      }

      if (subErr) {
        console.error('[Webhook Asaas] Erro ao atualizar subscriptions:', subErr);
      }

      // Atualizar Profiles para liberação imediata
      const { error: profErr } = await (supabaseAdmin as any)
        .from('profiles')
        .update({
          status: 'active',
          is_active: true,
          trial_ends_at: null,
          disabled_at: null,
          disabled_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (profErr) {
        console.error('[Webhook Asaas] Erro ao atualizar profiles:', profErr);
      }

      console.log(`[Webhook Asaas] Pagamento confirmado! Usuário ${userId} ativado até ${newExpiryIso}.`);
    }

    // --- EVENTO 2: INADIMPLÊNCIA / VENCIMENTO ---
    else if (isPaymentOverdue && userId) {
      await (supabaseAdmin as any)
        .from('subscriptions')
        .update({
          status: 'past_due',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      console.log(`[Webhook Asaas] Pagamento vencido para usuário ${userId}. Status: past_due.`);
    }

    // --- EVENTO 3: CANCELAMENTO ---
    else if (isSubscriptionDeleted && userId) {
      await (supabaseAdmin as any)
        .from('subscriptions')
        .update({
          status: 'canceled',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      console.log(`[Webhook Asaas] Assinatura cancelada para usuário ${userId}.`);
    }

    // --- EVENTO 4: REEMBOLSO / ESTORNO ---
    else if (isRefund && userId) {
      await (supabaseAdmin as any)
        .from('subscriptions')
        .update({
          status: 'past_due',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      console.log(`[Webhook Asaas] Reembolso processado para usuário ${userId}.`);
    }

    // 6. Marcar Evento como Concluído
    try {
      await (supabaseAdmin as any)
        .from('webhook_events')
        .update({ processed: true })
        .eq('id', eventId);
    } catch {
      // Ignorar caso tabela não esteja presente
    }

    return NextResponse.json({
      ok: true,
      event,
      userId: userId || null,
      processed: true,
      timestamp: startedAt,
    });
  } catch (error: any) {
    console.error('[Webhook Asaas] Erro interno:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro interno no webhook' },
      { status: 500 }
    );
  }
}
