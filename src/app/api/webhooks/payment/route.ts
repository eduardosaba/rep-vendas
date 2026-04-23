import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Webhook skeleton for payment providers (Asaas / Stripe / others).
 * Expected: provider, provider_invoice_id, status, amount
 * Security: check `x-webhook-secret` header against env `WEBHOOK_SECRET`.
 */
export async function POST(req: Request) {
  try {
    const secret = req.headers.get('x-webhook-secret') || req.headers.get('x-hook-secret');
    if (!process.env.WEBHOOK_SECRET || secret !== process.env.WEBHOOK_SECRET) {
      console.warn('[webhooks/payment] invalid secret');
      return NextResponse.json({ ok: false, error: 'invalid_secret' }, { status: 401 });
    }

    const body = await req.json();
    const provider = body.provider || body.provider_name || 'unknown';
    const providerInvoiceId = body.provider_invoice_id || body.id || null;
    const status = (body.status || body.payment_status || '').toString().toLowerCase();
    const amount = body.amount || body.value || null;

    if (!providerInvoiceId) {
      console.warn('[webhooks/payment] missing provider invoice id', body);
      return NextResponse.json({ ok: false, error: 'missing_provider_invoice_id' }, { status: 400 });
    }

    const supabase = await createClient();

    // Find invoice by provider_invoice_id
    const { data: invRows, error: invErr } = await supabase
      .from('invoices')
      .select('*')
      .eq('provider_invoice_id', providerInvoiceId)
      .limit(1)
      .maybeSingle();

    if (invErr) {
      console.error('[webhooks/payment] db lookup error', invErr);
      return NextResponse.json({ ok: false, error: 'db_error' }, { status: 500 });
    }

    if (!invRows) {
      console.warn('[webhooks/payment] invoice not found for provider id', providerInvoiceId);
      return NextResponse.json({ ok: false, error: 'invoice_not_found' }, { status: 404 });
    }

    const invoice = invRows as any;

    // Map provider status -> internal status
    let newStatus = invoice.status;
    if (status.includes('paid') || status === 'succeeded' || status === 'completed') newStatus = 'paid';
    else if (status.includes('failed') || status === 'cancelled') newStatus = 'failed';

    // Update invoice record
    const upd: any = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'paid') upd.paid_at = new Date().toISOString();

    const { error: updateErr } = await supabase.from('invoices').update(upd).eq('id', invoice.id);
    if (updateErr) {
      console.error('[webhooks/payment] failed to update invoice', updateErr);
      return NextResponse.json({ ok: false, error: 'update_failed' }, { status: 500 });
    }

    // If paid, extend company subscription / mark profiles active as necessary
    if (newStatus === 'paid' && invoice.company_id) {
      try {
        // Example: set company trial_ends_at far in the future or set status active on company admins
        await supabase.from('companies').update({ updated_at: new Date().toISOString() }).eq('id', invoice.company_id);

        // Optional: set all profiles under company to status 'active' if they were blocked/expired
        await supabase.from('profiles').update({ status: 'active' }).eq('company_id', invoice.company_id).in('status', ['blocked','expired','trial']);
      } catch (e) {
        console.error('[webhooks/payment] post-payment company update failed', e);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[webhooks/payment] handler error', e);
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 });
  }
}
