import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mapToDbStatus } from '@/lib/orderStatus';
import { revalidatePath } from 'next/cache';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, newStatus } = body;
    if (!orderId || !newStatus) {
      return NextResponse.json(
        { error: 'orderId and newStatus are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const normalized = mapToDbStatus(newStatus);

    const { error } = await supabase
      .from('orders')
      .update({ status: normalized })
      .eq('id', orderId)
      .eq('user_id', user.id);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    // get display_id to revalidate the detail page
    const { data: orderRow } = await supabase
      .from('orders')
      .select('display_id')
      .eq('id', orderId)
      .maybeSingle();

    revalidatePath('/dashboard/orders');
    if (orderRow?.display_id)
      revalidatePath(`/dashboard/orders/${orderRow.display_id}`);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
