'use server';

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function generateSeparationPdf(orderId: string) {
  try {
    // fetch order and items
    const { data: order } = await supabaseAdmin.from('orders').select('*').eq('id', orderId).maybeSingle();
    if (!order) return { success: false, error: 'Pedido não encontrado' };
    const { data: items } = await supabaseAdmin.from('order_items').select('*').eq('order_id', orderId);

    // Build a simple HTML for separation sheet
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Separação - ${order.display_id}</title></head><body><h1>Separação Pedido ${order.display_id}</h1><p>Cliente: ${order.client_name_guest || ''}</p><table border="1" cellpadding="6"><thead><tr><th>Produto</th><th>Qtd</th></tr></thead><tbody>${(items||[]).map((it:any)=>`<tr><td>${it.product_name}</td><td>${it.quantity}</td></tr>`).join('')}</tbody></table></body></html>`;

    const filename = `order-pdfs/${orderId}_${Date.now()}.html`;
    const bucket = 'order-pdfs';
    const buf = Buffer.from(html, 'utf8');
    const { error: upErr } = await supabaseAdmin.storage.from(bucket).upload(filename, buf, { upsert: true });
    if (upErr) return { success: false, error: upErr.message };
    const { data: publicData } = supabaseAdmin.storage.from(bucket).getPublicUrl(filename);

    // save pdf_url (html url) to orders
    const { error: updErr } = await supabaseAdmin.from('orders').update({ pdf_url: publicData.publicUrl }).eq('id', orderId);
    if (updErr) return { success: false, error: updErr.message };

    revalidatePath('/admin/distribuidora/pedidos');
    return { success: true, url: publicData.publicUrl };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

export async function markOrderFaturado(orderId: string) {
  try {
    // 1) set status to Confirmado (faturado)
    const now = new Date().toISOString();
    const { error: updErr } = await supabaseAdmin.from('orders').update({ status: 'Confirmado', faturado_at: now }).eq('id', orderId);
    if (updErr) throw updErr;

    // 2) fetch order to calculate commission
    try {
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('id, total, total_value, seller_id, company_id')
        .eq('id', orderId)
        .maybeSingle();
      if (order && order.seller_id) {
        const { data: existingCommission } = await supabaseAdmin
          .from('commissions')
          .select('id')
          .eq('order_id', order.id)
          .maybeSingle();
        if (existingCommission?.id) {
          revalidatePath('/admin/distribuidora/pedidos');
          return { success: true };
        }

        // fetch seller commission_rate
        const { data: seller } = await supabaseAdmin.from('profiles').select('id, commission_rate').eq('id', order.seller_id).maybeSingle();
        const rate = (seller as any)?.commission_rate ?? 5;
        const baseTotal = Number((order as any).total_value ?? (order as any).total ?? 0);
        const commissionAmount = (baseTotal * Number(rate)) / 100;

        // insert commission record
        await supabaseAdmin.from('commissions').insert({
          order_id: order.id,
          company_id: order.company_id,
          seller_id: order.seller_id,
          amount: commissionAmount,
          status: 'pending'
        });
      }
    } catch (calcErr) {
      // swallow commission errors but log
      console.warn('commission generation failed', (calcErr as any)?.message || calcErr);
    }

    revalidatePath('/admin/distribuidora/pedidos');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}
