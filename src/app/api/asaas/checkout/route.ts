import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGatewayConfig, getAsaasClientFromConfig } from '@/lib/payments/config';
import type { AsaasCycle } from '@/lib/payments/asaas';

// Tabela de preços base mensais e identificação
const BASE_PLAN_PRICING: Record<string, { monthlyPrice: number; name: string }> = {
  Fundador: { monthlyPrice: 50.0, name: 'Plano Fundador' },
  Pro: { monthlyPrice: 97.0, name: 'Plano Pro' },
  Premium: { monthlyPrice: 97.0, name: 'Plano Premium' },
  Distribuidora: { monthlyPrice: 149.9, name: 'Plano Distribuidora' },
};

// Multiplicadores e descontos por ciclo
const CYCLE_DISCOUNTS: Record<
  AsaasCycle,
  { months: number; discountPercent: number; label: string }
> = {
  MONTHLY: { months: 1, discountPercent: 0, label: 'Mensal' },
  QUARTERLY: { months: 3, discountPercent: 0.05, label: 'Trimestral (5% OFF)' },
  SEMIANNUALLY: { months: 6, discountPercent: 0.10, label: 'Semestral (10% OFF)' },
  YEARLY: { months: 12, discountPercent: 0.20, label: 'Anual (20% OFF)' },
  WEEKLY: { months: 0.25, discountPercent: 0, label: 'Semanal' },
  BIWEEKLY: { months: 0.5, discountPercent: 0, label: 'Quinzenal' },
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const planKey = String(body.planName || body.planId || 'Fundador');
    const rawCycle = String(body.cycle || 'MONTHLY').toUpperCase() as AsaasCycle;
    const cycle: AsaasCycle = ['MONTHLY', 'QUARTERLY', 'SEMIANNUALLY', 'YEARLY'].includes(rawCycle)
      ? rawCycle
      : 'MONTHLY';

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: 'Usuário não autenticado.' }, { status: 401 });
    }

    // 1. Verificar se o Asaas está configurado no sistema
    const gatewayConfig = await getGatewayConfig();
    if (!gatewayConfig.isConfigured || !gatewayConfig.asaasApiKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'O gateway Asaas ainda não foi configurado pela administração do RepVendas. Entre em contato com o suporte para concluir a ativação.',
          notConfigured: true,
        },
        { status: 503 }
      );
    }

    // 2. Buscar perfil detalhado do usuário para dados de cobrança
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, cpf_cnpj, company_name')
      .eq('id', user.id)
      .maybeSingle();

    // 3. Obter ou calcular valor conforme o ciclo escolhido
    const planInfo =
      BASE_PLAN_PRICING[planKey] ||
      BASE_PLAN_PRICING['Fundador'];

    const cycleInfo = CYCLE_DISCOUNTS[cycle] || CYCLE_DISCOUNTS.MONTHLY;
    const rawTotal = planInfo.monthlyPrice * cycleInfo.months;
    const discountedTotal = rawTotal * (1 - cycleInfo.discountPercent);
    const finalValue = Math.round(discountedTotal * 100) / 100;

    const asaas = await getAsaasClientFromConfig();

    // 4. Criar ou localizar cliente no Asaas
    const customerRes = await asaas.findOrCreateCustomer({
      name: profile?.full_name || profile?.company_name || user.email || 'Cliente RepVendas',
      email: user.email || '',
      phone: profile?.phone || undefined,
      mobilePhone: profile?.phone || undefined,
      cpfCnpj: profile?.cpf_cnpj || undefined,
      externalReference: user.id,
    });

    if (!customerRes.ok || !customerRes.data?.id) {
      console.error('[Asaas Checkout] Falha ao criar/localizar cliente:', customerRes);
      return NextResponse.json(
        {
          ok: false,
          error: customerRes.error || 'Erro ao registrar cliente no gateway Asaas.',
        },
        { status: 400 }
      );
    }

    const asaasCustomerId = customerRes.data.id;

    // 5. Próximo vencimento: amanhã para cobrança inicial
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextDueDate = tomorrow.toISOString().split('T')[0];

    // 6. Criar assinatura recorrente com ciclo no Asaas
    const subscriptionRes = await asaas.createSubscription({
      customer: asaasCustomerId,
      billingType: 'UNDEFINED', // Permite PIX, Cartão e Boleto na mesma fatura
      value: finalValue,
      nextDueDate,
      cycle,
      description: `Assinatura RepVendas — ${planInfo.name} (${cycleInfo.label})`,
      externalReference: user.id,
    });

    if (!subscriptionRes.ok || !subscriptionRes.data?.id) {
      console.error('[Asaas Checkout] Falha ao criar assinatura:', subscriptionRes);
      return NextResponse.json(
        {
          ok: false,
          error: subscriptionRes.error || 'Erro ao gerar assinatura no Asaas.',
        },
        { status: 400 }
      );
    }

    const asaasSub = subscriptionRes.data;
    const asaasSubscriptionId = asaasSub.id;

    // 7. Obter a primeira fatura da assinatura recém-criada
    let invoiceUrl = asaasSub.invoiceUrl || null;
    let paymentId: string | null = null;
    let pixQrCodeData: any = null;

    try {
      const paymentsRes = await asaas.getSubscriptionPayments(asaasSubscriptionId);
      if (paymentsRes.ok && paymentsRes.data?.data?.length > 0) {
        const firstPayment = paymentsRes.data.data[0];
        paymentId = firstPayment.id;
        invoiceUrl = firstPayment.invoiceUrl || firstPayment.bankSlipUrl || invoiceUrl;

        // Se tiver paymentId, tenta gerar dados de PIX instantâneo
        if (paymentId) {
          const pixRes = await asaas.getPaymentPixQrCode(paymentId);
          if (pixRes.ok && pixRes.data) {
            pixQrCodeData = pixRes.data;
          }
        }
      }
    } catch (payErr) {
      console.warn('[Asaas Checkout] Aviso ao recuperar cobrança inicial:', payErr);
    }

    // 8. Salvar referências na tabela subscriptions local de forma resiliente
    try {
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const subPayload = {
        user_id: user.id,
        plan_name: planInfo.name,
        status: 'pending',
        price: finalValue,
        asaas_customer_id: asaasCustomerId,
        asaas_subscription_id: asaasSubscriptionId,
        updated_at: new Date().toISOString(),
      };

      if (existingSub?.id) {
        await supabase
          .from('subscriptions')
          .update(subPayload)
          .eq('id', existingSub.id);
      } else {
        await supabase
          .from('subscriptions')
          .insert({
            ...subPayload,
            created_at: new Date().toISOString(),
          });
      }
    } catch (dbErr) {
      console.warn('[Asaas Checkout] Falha ao sincronizar subscription local:', dbErr);
    }

    return NextResponse.json({
      ok: true,
      url: invoiceUrl,
      invoiceUrl,
      paymentId,
      asaasSubscriptionId,
      planName: planInfo.name,
      cycle,
      cycleLabel: cycleInfo.label,
      totalValue: finalValue,
      pix: pixQrCodeData
        ? {
            encodedImage: pixQrCodeData.encodedImage,
            payload: pixQrCodeData.payload,
            expirationDate: pixQrCodeData.expirationDate,
          }
        : null,
    });
  } catch (error: any) {
    console.error('[Asaas Checkout] Erro crítico no checkout:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro inesperado no servidor.' },
      { status: 500 }
    );
  }
}
