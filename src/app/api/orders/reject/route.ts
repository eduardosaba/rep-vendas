import { createClient } from '@/lib/supabase/server';
import { mapToDbStatus } from '@/lib/orderStatus';

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();
    if (!orderId) return new Response(JSON.stringify({ success: false, error: 'missing orderId' }), { status: 400 });

    const supabase = await createClient();
    const { data: sessionUser } = await supabase.auth.getUser();
    const userId = (sessionUser as any)?.user?.id || null;
    if (!userId) return new Response(JSON.stringify({ success: false, error: 'unauthenticated' }), { status: 401 });

    // Verify order belongs to seller
    const { data: order } = await (supabase as any)
      .from('orders')
      .select('id, seller_id, company_id')
      .eq('id', orderId)
      .maybeSingle();

    if (!order) return new Response(JSON.stringify({ success: false, error: 'order not found' }), { status: 404 });
    if (String(order.seller_id) !== String(userId)) return new Response(JSON.stringify({ success: false, error: 'not allowed' }), { status: 403 });

    const { error } = await (supabase as any)
      .from('orders')
      .update({ status: mapToDbStatus('cancelled') })
      .eq('id', orderId);

    if (error) return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('orders/reject error', e);
    return new Response(JSON.stringify({ success: false, error: e?.message || 'error' }), { status: 500 });
  }
}
