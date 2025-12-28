import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = await createClient();

    const event = body.event || body.eventType || body.type;

    // Eventos de pagamento confirmados no Asaas
    const isPaid = ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'].includes(event);

    if (isPaid) {
      const payment = body.payment || body.data || body;
      const userId = payment?.externalReference;
      const asaasCustomerId = payment?.customer;
      const subscriptionId = payment?.subscription;
      const paymentMethod = payment?.billingType || payment?.paymentMethod || null;

      if (userId) {
        await supabase.from('subscriptions').upsert({
          user_id: userId,
          asaas_customer_id: asaasCustomerId,
          asaas_subscription_id: subscriptionId,
          payment_method: paymentMethod,
          status: 'active',
          current_period_end: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      }
    }

    return new NextResponse('OK', { status: 200 });
  } catch (err) {
    console.error('Asaas webhook error', err);
    return new NextResponse('err', { status: 500 });
  }
}
