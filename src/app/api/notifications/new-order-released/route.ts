import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();
    if (!orderId) return new Response(JSON.stringify({ success: false, error: 'missing orderId' }), { status: 400 });

    const supabase = await createClient();

    // Fetch order and representative (profile) info
    const { data: order } = await (supabase as any)
      .from('orders')
      .select(`id, display_id, total_value, seller_id, company_id, created_at, profiles!orders_seller_id_fkey(full_name, email)`)
      .eq('id', orderId)
      .maybeSingle();

    // Optionally you could call an external e-mail/push service here.
    // For now we just log and return success so the caller can proceed.
    // eslint-disable-next-line no-console
    console.info('notification:new-order-released', { orderId, order });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('notification:new-order-released error', e);
    return new Response(JSON.stringify({ success: false, error: e?.message || 'error' }), { status: 500 });
  }
}
