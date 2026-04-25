import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { resolveContext } from '@/lib/resolve-context';
import OrderReceipt from '@/components/checkout/OrderReceipt';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function SuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; repSlug: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedParams = await params;
  const resolvedSearch = searchParams ? await searchParams : undefined;
  const orderIdParam = Array.isArray(resolvedSearch?.id)
    ? resolvedSearch?.id[0]
    : resolvedSearch?.id;

  const supabase = await createClient();
  const context = await resolveContext([resolvedParams.slug, resolvedParams.repSlug], supabase as any);

  if (!context || context.type !== 'distributor' || !context.company?.id || !context.representative?.id) {
    return notFound();
  }

  let orderDisplayId: string | null = null;
  let receiptOrder: {
    id: string;
    total_amount: number;
    payment_terms?: string;
    signature_data?: string | null;
    metadata?: {
      ip_location?: string;
      timestamp?: string;
    };
    items: Array<{ id: string; name: string; quantity: number; subtotal: number }>;
  } | null = null;
  let receiptCustomer: { name?: string; phone?: string } = {};
  let whatsappHref: string | null = null;

  if (orderIdParam) {
    const { data: order } = await supabase
      .from('orders')
      .select('id, display_id, total_value, notes, created_at, client_name_guest, client_phone_guest')
      .eq('id', orderIdParam)
      .eq('company_id', context.company.id)
      .eq('seller_id', context.representative.id)
      .maybeSingle();

    if (order) {
      orderDisplayId = String((order as any).display_id || (order as any).id || '');

      const { data: orderItems } = await supabase
        .from('order_items')
        .select('id, product_name, quantity, total_price')
        .eq('order_id', (order as any).id)
        .order('created_at', { ascending: true });

      const notes = String((order as any).notes || '');
      const signatureMatch = notes.match(/Assinatura:\s*(https?:\/\/\S+)/i);
      const paymentMatch = notes.match(/Condição:\s*([^|]+)/i);

      const items = (orderItems || []).map((item: any) => ({
        id: String(item.id || item.product_name || ''),
        name: String(item.product_name || 'Item'),
        quantity: Number(item.quantity || 0),
        subtotal: Number(item.total_price || 0),
      }));

      const customerPhone = String((order as any).client_phone_guest || '').replace(/\D/g, '');
      const customerName = String((order as any).client_name_guest || 'Cliente');

      receiptOrder = {
        id: orderDisplayId,
        total_amount: Number((order as any).total_value || 0),
        payment_terms: paymentMatch?.[1]?.trim() || undefined,
        signature_data: signatureMatch?.[1] || null,
        metadata: {
          ip_location: 'N/A',
          timestamp: String((order as any).created_at || new Date().toISOString()),
        },
        items,
      };

      receiptCustomer = {
        name: customerName,
        phone: (order as any).client_phone_guest || '',
      };

      if (customerPhone) {
        const text = encodeURIComponent(
          `Pedido confirmado - ${context.company.name}\n\n` +
            `Pedido: #${orderDisplayId}\n` +
            `Total: R$ ${Number((order as any).total_value || 0).toFixed(2)}\n` +
            `${paymentMatch?.[1]?.trim() ? `Condição: ${paymentMatch[1].trim()}\n` : ''}\n` +
            `Atendimento: ${context.representative.full_name || context.representative.slug}`
        );
        whatsappHref = `https://wa.me/${customerPhone}?text=${text}`;
      }
    }
  }

  const basePath = `/catalogo/${resolvedParams.slug}/${resolvedParams.repSlug}`;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 size={28} />
        </div>

        <h1 className="text-center text-2xl font-black text-slate-900">Pedido confirmado</h1>
        <p className="mt-2 text-center text-sm text-slate-500">
          Atendimento finalizado no contexto de {context.company.name} com {context.representative.full_name || context.representative.slug}.
        </p>

        {orderDisplayId ? (
          <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Número do pedido</p>
            <p className="mt-1 text-xl font-black text-slate-900">#{orderDisplayId}</p>
          </div>
        ) : null}

        {receiptOrder ? (
          <div className="mt-6">
            <OrderReceipt
              order={receiptOrder}
              company={{
                name: context.company.name,
                logo_url: context.company.logo_url || undefined,
              }}
              representative={{
                full_name: context.representative.full_name || context.representative.slug,
                phone: context.representative.phone || undefined,
              }}
              customer={receiptCustomer}
            />
          </div>
        ) : null}

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            href="/admin/distribuidora/pedidos"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700"
          >
            Ir para fila
          </Link>
          <Link
            href={`${basePath}/venda-direta`}
            className="inline-flex h-12 items-center justify-center rounded-xl bg-slate-900 px-4 font-semibold text-white"
          >
            Novo atendimento
          </Link>
        </div>

        {whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-xl bg-emerald-600 px-4 font-semibold text-white"
          >
            Enviar comprovante no WhatsApp
          </a>
        ) : null}
      </div>
    </div>
  );
}
