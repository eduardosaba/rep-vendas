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
    const { orderId } = body;
    if (!orderId) return NextResponse.json({ success: false, error: 'orderId required' }, { status: 400 });

    // try by id or display_id
    let { data: order } = await supabaseAdmin.from('orders').select('*').eq('id', orderId).maybeSingle();
    if (!order) {
      const { data: byDisplay } = await supabaseAdmin.from('orders').select('*').eq('display_id', Number(orderId)).maybeSingle();
      order = byDisplay;
    }
    if (!order) return NextResponse.json({ success: false, error: 'Pedido não encontrado' }, { status: 404 });

    if (!order.company_id) return NextResponse.json({ success: false, error: 'Pedido não vinculado a company' }, { status: 400 });
    if (order.customer_id) return NextResponse.json({ success: false, error: 'Pedido já vinculado a cliente' }, { status: 400 });

    const { data: created } = await supabaseAdmin
      .from('customers')
      .insert({
        company_id: order.company_id,
        name: order.client_name_guest,
        email: order.client_email_guest || null,
        phone: order.client_phone_guest || null,
        document: order.client_cnpj_guest || null,
      })
      .select()
      .maybeSingle();

    const newCustomerId = (created as any)?.id;
    if (!newCustomerId) throw new Error('Erro ao criar cliente');

    await supabaseAdmin.from('orders').update({ customer_id: newCustomerId, status: mapToDbStatus('awaiting_billing') }).eq('id', order.id);

    // registrar no audit log (atividade)
    try {
      await createAuditLog(
        'approve_pending_customer',
        `Aprovado pré-cadastro e criado cliente ${newCustomerId} para pedido ${order.id}`,
        {
          order_id: order.id,
          customer_id: newCustomerId,
          guest: {
            name: order.client_name_guest,
            email: order.client_email_guest || null,
            phone: order.client_phone_guest || null,
          },
        }
      );
    } catch (err) {
      // não bloquear fluxo principal se falhar
      console.warn('createAuditLog failed', (err as any)?.message || err);
    }

    return NextResponse.json({ success: true, customerId: newCustomerId });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 });
  }
}
