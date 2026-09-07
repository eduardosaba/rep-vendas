import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mapToDbStatus } from '@/lib/orderStatus';
import { revalidatePath } from 'next/cache';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, newStatus, review } = body;
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .maybeSingle();

    const role = String(profile?.role || '');
    const companyId = profile?.company_id || null;
    const isElevatedRole = role === 'master' || role === 'admin_company' || role === 'representative' || role === 'rep';

    let existingOrder: any = null;
    let existingOrderError: any = null;

    const { data: userOrder, error: userOrderErr } = await supabase
      .from('orders')
      .select('id, user_id, seller_id, company_id, notes, status')
      .eq('id', orderId)
      .maybeSingle();

    existingOrder = userOrder;
    existingOrderError = userOrderErr;

    if (!existingOrder && isElevatedRole) {
      try {
        const { createAdminClient } = await import('@/lib/supabase/admin');
        const adminClient = createAdminClient();
        const { data: adminOrder } = await adminClient
          .from('orders')
          .select('id, user_id, seller_id, company_id, notes, status')
          .eq('id', orderId)
          .maybeSingle();
        if (adminOrder) {
          existingOrder = adminOrder;
          existingOrderError = null;
        }
      } catch (e) {
        // ignore fallback failure
      }
    }

    if (existingOrderError)
      return NextResponse.json({ error: existingOrderError.message }, { status: 500 });
    if (!existingOrder)
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });

    const canUpdate =
      role === 'master' ||
      String(existingOrder.user_id) === String(user.id) ||
      String(existingOrder.seller_id || '') === String(user.id) ||
      (role === 'admin_company' && Boolean(companyId) && String(existingOrder.company_id || '') === String(companyId));

    if (!canUpdate) {
      return NextResponse.json({ error: 'Sem permissão para alterar este pedido' }, { status: 403 });
    }

    let notesPatch: string | null = null;
    if (review && typeof review === 'object') {
      const pieces: string[] = [];
      if (review.paymentLabel)
        pieces.push(`Condição: ${String(review.paymentLabel)}`);
      if (
        typeof review.discountPercent === 'number' &&
        Number(review.discountPercent) > 0
      ) {
        pieces.push(`Desconto: ${Number(review.discountPercent)}%`);
      }
      notesPatch = pieces.length > 0 ? pieces.join(' | ') : null;
    }

    const mergedNotes = notesPatch
      ? [existingOrder?.notes, notesPatch].filter(Boolean).join(' | ')
      : existingOrder?.notes || null;

    let updateError: any = null;
    const { error: userUpdateErr } = await supabase
      .from('orders')
      .update({ status: normalized, notes: mergedNotes })
      .eq('id', orderId);

    updateError = userUpdateErr;

    if (updateError && (role === 'master' || role === 'admin_company')) {
      try {
        const { createAdminClient } = await import('@/lib/supabase/admin');
        const adminClient = createAdminClient();
        const { error: adminUpdateErr } = await adminClient
          .from('orders')
          .update({ status: normalized, notes: mergedNotes })
          .eq('id', orderId);
        updateError = adminUpdateErr;
      } catch (e) {
        // fallback
      }
    }

    if (updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 });

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
