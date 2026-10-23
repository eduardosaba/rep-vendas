'use server';

import { createClient } from '@/lib/supabase/server';
import { isGlobalAdmin } from '@/lib/auth/roles';
import { getGatewayConfig } from '@/lib/payments/config';

async function requireMasterRole() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!isGlobalAdmin(profile?.role) && profile?.role !== 'master') {
    throw new Error('Acesso negado: Requer privilégios Master');
  }

  return user;
}

export async function getTestUsers() {
  await requireMasterRole();
  const supabase = await createClient();

  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, status, trial_ends_at')
    .order('created_at', { ascending: false })
    .limit(25);

  if (error) throw error;
  return { success: true, data: users || [] };
}

export async function simulateWebhookEvent(params: {
  userId: string;
  event: 'PAYMENT_RECEIVED' | 'PAYMENT_CONFIRMED' | 'PAYMENT_OVERDUE' | 'SUBSCRIPTION_DELETED' | 'PAYMENT_REFUNDED';
  billingType?: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  value?: number;
  testIdempotency?: boolean;
}) {
  try {
    await requireMasterRole();
    const supabase = await createClient();
    const config = await getGatewayConfig();

    const { userId, event, billingType = 'PIX', value = 97.0, testIdempotency = false } = params;

    // 1. Snapshot do estado antes do teste
    const [subBefore, profBefore] = await Promise.all([
      supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('profiles').select('id, status, is_active, trial_ends_at').eq('id', userId).maybeSingle(),
    ]);

    // 2. Construir payload sintético compatível com Asaas v3
    const syntheticPaymentId = `pay_test_${Date.now()}`;
    const syntheticEventId = `evt_test_${Date.now()}`;

    const syntheticPayload = {
      id: syntheticEventId,
      event,
      dateCreated: new Date().toISOString(),
      payment: {
        id: syntheticPaymentId,
        customer: `cus_synthetic_${userId.slice(0, 8)}`,
        subscription: `sub_synthetic_${userId.slice(0, 8)}`,
        value,
        netValue: value - 1.99,
        billingType,
        status:
          event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED'
            ? 'RECEIVED'
            : event === 'PAYMENT_OVERDUE'
            ? 'OVERDUE'
            : event === 'PAYMENT_REFUNDED'
            ? 'REFUNDED'
            : 'PENDING',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        paymentDate: new Date().toISOString().split('T')[0],
        externalReference: userId,
        description: `Simulação RepVendas — Teste Sintético ${event}`,
      },
    };

    // 3. Determinar URL pública/local do webhook
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const webhookEndpoint = `${appUrl}/api/webhooks/asaas`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (config.asaasWebhookSecret) {
      headers['asaas-access-token'] = config.asaasWebhookSecret;
    }

    // 4. Disparo 1: Requisição primária do webhook
    const resp1 = await fetch(webhookEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(syntheticPayload),
    });

    const body1 = await resp1.json().catch(() => null);

    let idempotencyResult = null;

    // 5. Se testIdempotency estiver ativo, disparar 2ª vez com o MESMO payload e ID
    if (testIdempotency) {
      const resp2 = await fetch(webhookEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(syntheticPayload),
      });

      const body2 = await resp2.json().catch(() => null);

      idempotencyResult = {
        tested: true,
        secondStatus: resp2.status,
        secondBody: body2,
        isIdempotent: body2?.already_processed === true,
      };
    }

    // 6. Snapshot do estado depois do teste
    const [subAfter, profAfter] = await Promise.all([
      supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('profiles').select('id, status, is_active, trial_ends_at').eq('id', userId).maybeSingle(),
    ]);

    return {
      success: resp1.ok,
      httpStatus: resp1.status,
      event,
      payloadSent: syntheticPayload,
      responseBody: body1,
      idempotency: idempotencyResult,
      dbDiff: {
        subscription: {
          before: subBefore.data,
          after: subAfter.data,
        },
        profile: {
          before: profBefore.data,
          after: profAfter.data,
        },
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Falha ao executar simulação sintética de webhook',
    };
  }
}
