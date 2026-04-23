import { NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { mapToDbStatus } from '@/lib/orderStatus';
import { createAuditLog } from '@/lib/audit-service';

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, reason } = body;
    if (!orderId) return NextResponse.json({ success: false, error: 'orderId required' }, { status: 400 });

    const { data: order } = await supabaseAdmin.from('orders').select('*').eq('id', orderId).maybeSingle();
    if (!order) return NextResponse.json({ success: false, error: 'Pedido não encontrado' }, { status: 404 });

    await supabaseAdmin.from('orders').update({ status: mapToDbStatus('cancelled') }).eq('id', order.id);

    // registrar no audit log (atividade)
    try {
      await createAuditLog(
        'reject_pending_customer',
        `Reprovado pré-cadastro para pedido ${order.id}`,
        { order_id: order.id, reason: reason || null }
      );
    } catch (err) {
      console.warn('createAuditLog failed', (err as any)?.message || err);
    }

    // fallback: manter compatibilidade com admin_audit_logs caso exista
    try {
      await supabaseAdmin.from('admin_audit_logs').insert({ action: 'reject_pending_customer', payload: { order_id: order.id, reason: reason || null } });
    } catch (_) {
      // ignore
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 });
  }
}
