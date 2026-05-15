import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getServerUserFallback } from '@/lib/supabase/getServerUserFallback';
import { OrdersTable } from '@/components/dashboard/OrdersTable';
import RepOrdersTabs from '@/components/dashboard/RepOrdersTabs';
import AdminOrdersCentral from '@/components/admin/orders/AdminOrdersCentral';
import { ShoppingBag, Plus, Lock, CreditCard, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { getCompanyOrders } from '@/app/admin/companies/actions';
import PaywallBlock from '@/components/dashboard/PaywallBlock';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const supabase = await createClient();

  // 1. Verificação de Sessão
  const { data: { user } } = await supabase.auth.getUser();
  let finalUser = user;

  if (!finalUser) {
    try {
      const fb = await getServerUserFallback();
      if (fb) finalUser = fb;
    } catch (e) { }
  }

  if (!finalUser) redirect('/login');

  // 2. Busca de Perfil com Status de Assinatura
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id, status, trial_ends_at')
    .eq('id', finalUser.id)
    .maybeSingle();

  const role = String((profile as any)?.role || '');
  const companyId = (profile as any)?.company_id || null;
  const status = (profile as any)?.status || 'trial';
  const trialEnds = (profile as any)?.trial_ends_at ? new Date((profile as any).trial_ends_at) : null;
  const now = new Date();
  const isTrialExpired = trialEnds ? now > trialEnds : false;

  // VERIFICAÇÃO DE BLOQUEIO
  const isBlocked = status === 'blocked' || (status === 'trial' && isTrialExpired);

  // Se estiver bloqueado, renderiza o componente de "Paywall"
  // --- SUBSTUIÇÃO DO BLOCO DE BLOQUEIO ---
  if (isBlocked) {
    return (
      <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <ShoppingBag size={24} className="text-primary" /> Pedidos
        </h1>

        {/* Aqui chamamos o novo componente que já tem todo o visual e o botão funcional */}
        <PaywallBlock
          user={{
            id: finalUser.id,
            name: (profile as any)?.full_name || 'Assinante',
            email: (profile as any)?.email
          }}
        />
      </div>
    );
  }
  // --- FIM DA SUBSTITUIÇÃO ---

  // --- 3. Lógica Original (Abaixo apenas se NÃO estiver bloqueado) ---

  const isCompanyAdmin = Boolean(companyId) && (role === 'admin_company' || role === 'master');
  const isRepresentative = Boolean(companyId) && (role === 'representative' || role === 'rep');

  if (isCompanyAdmin && companyId) {
    const companyOrders = await getCompanyOrders(String(companyId));
    if (!companyOrders.success) {
      return (
        <div className="p-6 text-red-600">
          Erro ao carregar pedidos: {companyOrders.error}
        </div>
      );
    }

    return (
      <AdminOrdersCentral
        initialOrders={(companyOrders.data || []).map((o: any) => ({
          id: o.id,
          display_id: o.display_id,
          created_at: o.created_at,
          status: o.status,
          total_value: Number(o.total_value || o.total_amount || 0),
          faturado_at: o.faturado_at || null,
          despachado_at: o.despachado_at || null,
          entregue_at: o.entregue_at || null,
          customer_name: o.customer_name || o.client_name_guest || null,
          customer_city: o.customer_city || null,
          rep_name: o.rep_name || null,
          seller_id: o.user_id || null,
        }))}
      />
    );
  }

  // Função de mapeamento original
  const mapOrders = (rows: any[] | null) =>
    (rows || []).map((o: any) => {
      const clientData = Array.isArray(o.clients) ? o.clients[0] : o.clients;
      const items = Array.isArray(o.order_items) ? o.order_items : [];
      const totalQty = items.reduce((acc: number, item: any) => acc + (Number(item.quantity) || 0), 0);
      const brands = Array.from(new Set(items.map((i: any) => i.brand || i.products?.brand).filter(Boolean)));
      const brandsSummary = brands.join(', ');
      return {
        id: o.id,
        display_id: o.display_id,
        created_at: o.created_at,
        status: o.status,
        total_value: o.total_value || 0,
        item_count: items.length || 0,
        total_qty: totalQty,
        brands: brandsSummary,
        client_name_guest: clientData?.name || o.client_name_guest || 'Cliente não identificado',
        client_phone_guest: clientData?.phone || o.client_phone_guest || '',
        seller_id: o.seller_id || null,
        thumbnail_url: null
      };
    });

  const baseSelect = `
    id, display_id, created_at, status, total_value, client_name_guest, client_phone_guest, client_id, source, seller_id, company_id,
    clients (name, phone),
    order_items (id, product_name, quantity, brand, products (brand))
  `;

  if (isRepresentative && companyId) {
    const { data: mySalesRows } = await supabase
      .from('orders')
      .select(baseSelect)
      .eq('user_id', finalUser.id)
      .order('created_at', { ascending: false });

    const { data: distributorRows } = await supabase
      .from('orders')
      .select(baseSelect)
      .eq('company_id', companyId)
      .eq('seller_id', finalUser.id)
      .order('created_at', { ascending: false });

    return (
      <div className="p-4 md:p-6 space-y-6 pb-24 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ShoppingBag size={24} className="text-primary" /> Pedidos
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gestão por carteira.</p>
          </div>
          <Link href="/dashboard/orders/new" className="w-full sm:w-auto">
            <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 w-full justify-center">
              <Plus size={18} /> Criar Pedido Manual
            </button>
          </Link>
        </div>
        <RepOrdersTabs mySales={mapOrders(mySalesRows)} distributorOrders={mapOrders(distributorRows)} currentUserId={finalUser.id} />
      </div>
    );
  }

  const { data: orders } = await supabase
    .from('orders')
    .select(baseSelect)
    .eq('user_id', finalUser.id)
    .order('created_at', { ascending: false });

  const mappedOrders = mapOrders(orders);

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingBag size={24} className="text-primary" /> Pedidos
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Histórico de vendas.</p>
        </div>
        <Link href="/dashboard/orders/new" className="w-full sm:w-auto">
          <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 w-full justify-center">
            <Plus size={18} /> Criar Pedido Manual
          </button>
        </Link>
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[500px]">
        <OrdersTable initialOrders={mappedOrders} />
      </div>
    </div>
  );
}