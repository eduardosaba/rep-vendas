import { NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL
  ? createSupabaseAdmin(String(process.env.NEXT_PUBLIC_SUPABASE_URL), String(process.env.SUPABASE_SERVICE_ROLE_KEY), { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

async function getRequester() {
  const supabase = await createClient();
  const authRes: any = await supabase.auth.getUser();
  const user = authRes?.data?.user;
  if (!user) return { error: NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 }) };

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, company_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) return { error: NextResponse.json({ success: false, error: 'Profile not found' }, { status: 403 }) };
  const role = String(profile.role || '');
  const isAdminCompany = role === 'admin_company' || role === 'master';
  if (!isAdminCompany) return { error: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }) };

  if (!profile.company_id) return { error: NextResponse.json({ success: false, error: 'No company linked' }, { status: 400 }) };

  return { user, profile };
}

export async function POST(req: Request) {
  try {
    const requester = await getRequester();
    if ('error' in requester) return requester.error;
    const { user, profile } = requester;
    const body = await req.json();
    const start = String(body?.start || '');
    const end = String(body?.end || '');

    const startDt = start ? new Date(start) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDt = end ? new Date(end) : new Date();

    if (!supabaseAdmin) return NextResponse.json({ success: false, error: 'Server misconfigured' }, { status: 500 });

    // statuses considered paid/final
    const statuses = ['paid', 'Pago', 'confirmado', 'Confirmado', 'Finalizado', 'Entregue'];

    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('id,total_value,seller_id,created_at,profiles:seller_id(id,full_name,commission_rate,slug)')
      .eq('company_id', profile.company_id)
      .gte('created_at', startDt.toISOString())
      .lte('created_at', endDt.toISOString())
      .in('status', statuses);

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

    // Aggregate per seller
    const bySeller: Record<string, { seller_id: string; seller_name: string; commission_rate: number; total_sales: number; order_ids: string[] }> = {};
    (orders || []).forEach((o: any) => {
      const sid = o.seller_id || 'direct';
      const seller = o.profiles || null;
      const name = seller?.full_name || 'Venda Direta';
      const rate = Number(seller?.commission_rate ?? 0);
      if (!bySeller[sid]) bySeller[sid] = { seller_id: sid, seller_name: name, commission_rate: rate, total_sales: 0, order_ids: [] } as any;
      bySeller[sid].total_sales += Number(o.total_value || 0);
      bySeller[sid].order_ids.push(String(o.id));
    });

    const rowsToInsert: any[] = Object.values(bySeller).map((s) => ({
      company_id: profile.company_id,
      seller_id: s.seller_id === 'direct' ? null : s.seller_id,
      period_start: startDt.toISOString(),
      period_end: endDt.toISOString(),
      total_sales: Number(s.total_sales.toFixed(2)),
      commission_rate: Number(s.commission_rate || 0),
      amount: Number(((s.total_sales * (s.commission_rate || 0)) / 100).toFixed(2)),
      order_ids: JSON.stringify(s.order_ids || []),
      created_by: user.id,
    }));

    // Insert records for audit/history
    const { data: inserted, error: insertError } = await supabaseAdmin.from('commissions').insert(rowsToInsert).select('*');
    if (insertError) {
      // continue but log
      console.warn('commissions insert error', insertError.message);
    }

    // Build CSV
    const header = ['seller_id','seller_name','commission_rate','total_sales','amount','order_ids'].join(',') + '\n';
    const lines = Object.values(bySeller).map((s) => {
      const seller_id = s.seller_id === 'direct' ? '' : s.seller_id;
      const seller_name = String(s.seller_name || '').replace(/\"/g, '');
      const rate = Number(s.commission_rate || 0).toFixed(2);
      const total = Number(s.total_sales || 0).toFixed(2);
      const amount = Number(((s.total_sales * (s.commission_rate || 0)) / 100) || 0).toFixed(2);
      const orderIds = JSON.stringify(s.order_ids || []);
      return [seller_id, `"${seller_name}"`, rate, total, amount, `"${orderIds}"`].join(',');
    });

    const csv = header + lines.join('\n');

    const fileName = `commissions_${startDt.toISOString().slice(0,10)}_${endDt.toISOString().slice(0,10)}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 });
  }
}
