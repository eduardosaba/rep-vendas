import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { planId, cycle } = await req.json(); // cycle: 'MONTHLY' ou 'YEARLY'
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return new NextResponse('Unauthorized', { status: 401 });

    // 1. Criar cliente no Asaas (ou tentar criar)
    const customerResp = await fetch(`${process.env.ASAAS_API_URL}/customers`, {
      method: 'POST',
      headers: {
        access_token: process.env.ASAAS_API_KEY || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: user.email,
        email: user.email,
        externalReference: user.id,
      }),
    });
    const customer = await customerResp.json();

    // 2. Criar assinatura no Asaas
    const value = planId === 'pro' ? 97.0 : 197.0;
    const subscriptionResp = await fetch(
      `${process.env.ASAAS_API_URL}/subscriptions`,
      {
        method: 'POST',
        headers: {
          access_token: process.env.ASAAS_API_KEY || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer: customer.id,
          billingType: 'UNDEFINED',
          value,
          nextDueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          cycle: cycle || 'MONTHLY',
          description: `Assinatura RepVendas - Plano ${planId}`,
          externalReference: user.id,
        }),
      }
    );
    const subscription = await subscriptionResp.json();

    // 3. Persistir IDs Asaas na tabela subscriptions local (parcial)
    try {
      await supabase.from('subscriptions').upsert(
        {
          user_id: user.id,
          plan_id: planId,
          status: 'pending',
          asaas_customer_id: customer.id,
          asaas_subscription_id: subscription.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    } catch (err) {
      console.warn('Could not persist subscription meta', err);
    }

    // Retornar link para checkout/fatura
    const url =
      subscription.invoiceUrl ||
      subscription.invoice?.invoiceUrl ||
      subscription.pdf ||
      null;
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Asaas checkout error', error);
    return new NextResponse('Erro interno', { status: 500 });
  }
}
