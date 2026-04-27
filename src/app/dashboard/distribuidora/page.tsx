import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Clock, Eye, MessageSquare, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getServerUserFallback } from '@/lib/supabase/getServerUserFallback';
import { getUiStatusKey } from '@/lib/orderStatus';

export const dynamic = 'force-dynamic';

type TabKey = 'pending' | 'approved';

function elapsedLabel(dateStr?: string | null) {
  if (!dateStr) return 'Sem data';
  const created = new Date(dateStr).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - created);
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h`; 
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0));
}

export default async function QuotesListPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const resolvedSearch = searchParams ? await searchParams : undefined;
  const activeTab =
    (typeof resolvedSearch?.tab === 'string' ? resolvedSearch.tab : 'pending') ===
    'approved'
      ? 'approved'
      : 'pending';

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let finalUser = user;
  if (!finalUser) {
    try {
      const fb = await getServerUserFallback();
      if (fb) finalUser = fb as any;
    } catch {
      // ignore
    }
  }

  if (!finalUser) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', finalUser.id)
    .maybeSingle();

  const role = String((profile as any)?.role || '');
  const companyId = (profile as any)?.company_id || null;
  const isCompanyMember =
    Boolean(companyId) &&
    ['rep', 'representative', 'admin_company', 'master'].includes(role);

  if (!isCompanyMember) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-black text-slate-900">Orçamentos Distribuidora</h1>
        <p className="text-slate-500 mt-2">
          Esta área está disponível apenas para usuários vinculados a uma distribuidora.
        </p>
      </div>
    );
  }

  // Regra pedida: a fila do representante deve ser privada por seller_id.
  const { data: rows } = await supabase
    .from('orders')
    .select(
      `
      id,
      display_id,
      created_at,
      status,
      total_value,
      source,
      seller_id,
      client_name_guest,
      client_phone_guest,
      clients(name, phone),
      order_items(id, quantity)
    `
    )
    .eq('company_id', companyId)
    .eq('seller_id', finalUser.id)
    .order('created_at', { ascending: false });

  const allQuotes = (rows || []).map((o: any) => {
    const clientData = Array.isArray(o.clients) ? o.clients[0] : o.clients;
    const statusKey = getUiStatusKey(String(o.status || ''));
    const itemsCount = Array.isArray(o.order_items)
      ? o.order_items.reduce(
          (acc: number, it: any) => acc + Number(it.quantity || 0),
          0
        )
      : 0;

    return {
      id: String(o.id),
      displayId: o.display_id,
      createdAt: o.created_at,
      elapsed: elapsedLabel(o.created_at),
      statusRaw: String(o.status || ''),
      statusKey,
      total: Number(o.total_value || 0),
      source: String(o.source || ''),
      customerName:
        clientData?.name || o.client_name_guest || 'Cliente não identificado',
      customerPhone: clientData?.phone || o.client_phone_guest || '',
      itemsCount,
    };
  });

  const pendingQuotes = allQuotes.filter((q) => q.statusKey === 'pending_review');
  const approvedQuotes = allQuotes.filter((q) =>
    ['awaiting_billing', 'confirmed', 'preparing', 'delivered', 'complete'].includes(
      q.statusKey
    )
  );

  const visible = activeTab === 'approved' ? approvedQuotes : pendingQuotes;

  return (
    <div className="p-4 md:p-8 space-y-8 pb-24">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black italic uppercase text-slate-900 tracking-tighter">
            Orçamentos Distribuidora
          </h1>
          <p className="text-slate-500 font-medium">
            Fila de negociação para pedidos da distribuidora
          </p>
        </div>

        <div className="bg-slate-100 p-1 rounded-xl flex gap-1 w-fit">
          <Link
            href="/dashboard/distribuidora?tab=pending"
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase ${
              activeTab === 'pending'
                ? 'bg-white shadow-sm text-slate-900'
                : 'text-slate-500'
            }`}
          >
            Pendentes ({pendingQuotes.length})
          </Link>
          <Link
            href="/dashboard/distribuidora?tab=approved"
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase ${
              activeTab === 'approved'
                ? 'bg-white shadow-sm text-slate-900'
                : 'text-slate-500'
            }`}
          >
            Aprovados ({approvedQuotes.length})
          </Link>
        </div>
      </header>

      {visible.length === 0 ? (
        <div className="bg-white border border-slate-100 p-8 rounded-3xl text-center text-slate-500">
          Nenhum orçamento nesta fila no momento.
        </div>
      ) : (
        <div className="grid gap-4">
          {visible.map((quote) => (
            <div
              key={quote.id}
              className="bg-white border border-slate-100 p-6 rounded-[2rem] hover:shadow-xl transition-all group"
            >
              <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-1">
                    <h3 className="text-lg font-black italic uppercase text-slate-800 truncate">
                      {quote.customerName}
                    </h3>
                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                        quote.statusKey === 'pending_review'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {quote.statusKey === 'pending_review'
                        ? 'Aguardando Revisão'
                        : 'Aprovado / Em fluxo'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-slate-400 font-bold uppercase italic">
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {new Date(quote.createdAt).toLocaleDateString('pt-BR')} ({quote.elapsed})
                    </span>
                    <span>{quote.itemsCount} peças selecionadas</span>
                  </div>
                </div>

                <div className="text-center md:text-right">
                  <p className="text-[10px] font-black uppercase text-slate-400">
                    Total Sugerido
                  </p>
                  <p className="text-2xl font-black italic text-slate-900">
                    {formatCurrency(quote.total)}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/orders/${quote.id}`}
                    className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-900 hover:text-white transition-colors"
                    aria-label="Ver detalhes"
                  >
                    <Eye size={20} />
                  </Link>

                  {quote.customerPhone ? (
                    <a
                      href={(function(){ try { const m = require('@/lib/format-whatsapp'); return m.makeWhatsAppUrl(String(quote.customerPhone), 'Oi! Vi seu orçamento aqui na distribuidora, vamos alinhar prazo e condições?') || '#'; } catch(e) { return '#'; } })()}
                      target="_blank"
                      rel="noreferrer"
                      className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl hover:bg-emerald-600 hover:text-white transition-colors"
                      aria-label="Chamar no WhatsApp"
                    >
                      <MessageSquare size={20} />
                    </a>
                  ) : null}

                  <Link
                    href={`/dashboard/orders/${quote.id}`}
                    className="p-4 bg-primary text-white rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 hover:scale-105 transition-transform"
                  >
                    Negociar <CheckCircle2 size={16} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
