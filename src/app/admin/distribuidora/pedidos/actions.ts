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

export async function linkOrderClient(input: {
  orderId: string;
  clientId?: string | null;
  newClientData?: {
    name: string;
    phone?: string | null;
    email?: string | null;
    document?: string | null;
  } | null;
}) {
  try {
    const { orderId, clientId, newClientData } = input;
    if (!orderId) return { success: false, error: 'orderId é obrigatório' };

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, company_id, organization_id, client_name_guest, client_phone_guest, client_email_guest, client_cnpj_guest, sales_rep_id')
      .eq('id', orderId)
      .maybeSingle();

    if (!order) return { success: false, error: 'Pedido não encontrado' };

    let targetClientId = clientId || null;
    const orgId = order.organization_id || order.company_id;

    // Se nenhum clientId foi informado mas newClientData foi fornecido (ou via dados guest do pedido)
    if (!targetClientId) {
      const clientName = newClientData?.name || order.client_name_guest || 'Cliente Guest';
      const clientPhone = newClientData?.phone || order.client_phone_guest || null;
      const clientEmail = newClientData?.email || order.client_email_guest || null;
      const clientDocument = newClientData?.document || order.client_cnpj_guest || null;

      // 1. Tentar encontrar cliente existente por documento, e-mail ou telefone
      let matchedClient: any = null;

      if (clientDocument && orgId) {
        const { data: byDoc } = await supabaseAdmin
          .from('clients')
          .select('id')
          .or(`organization_id.eq.${orgId},company_id.eq.${orgId}`)
          .eq('document', clientDocument)
          .maybeSingle();
        if (byDoc) matchedClient = byDoc;
      }

      if (!matchedClient && clientPhone && orgId) {
        const { data: byPhone } = await supabaseAdmin
          .from('clients')
          .select('id')
          .or(`organization_id.eq.${orgId},company_id.eq.${orgId}`)
          .eq('phone', clientPhone)
          .maybeSingle();
        if (byPhone) matchedClient = byPhone;
      }

      if (matchedClient) {
        targetClientId = matchedClient.id;
      } else {
        // 2. Criar novo cliente
        const { data: createdClient, error: createErr } = await supabaseAdmin
          .from('clients')
          .insert({
            name: clientName,
            phone: clientPhone,
            email: clientEmail,
            document: clientDocument,
            organization_id: orgId,
            company_id: orgId,
            status: 'active',
          })
          .select('id')
          .single();

        if (createErr || !createdClient) {
          throw new Error(`Falha ao criar cadastro de cliente: ${createErr?.message || 'erro desconhecido'}`);
        }
        targetClientId = createdClient.id;
      }
    }

    // 3. Atualizar o pedido com client_id e customer_link_status = 'linked'
    // PRESERVANDO ESTRITAMENTE sales_rep_id INTOCADO!
    const { error: updateErr } = await supabaseAdmin
      .from('orders')
      .update({
        client_id: targetClientId,
        customer_link_status: 'linked',
      })
      .eq('id', orderId);

    if (updateErr) throw updateErr;

    revalidatePath('/admin/distribuidora/pedidos');
    revalidatePath(`/dashboard/orders/${orderId}`);
    return { success: true, clientId: targetClientId };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

