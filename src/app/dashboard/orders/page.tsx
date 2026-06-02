import { getCompanyOrders } from '@/app/admin/companies/actions';
import AdminOrdersCentral from '@/components/admin/orders/AdminOrdersCentral';
import { OrdersTable } from '@/components/dashboard/OrdersTable';
import PaywallBlock from '@/components/dashboard/PaywallBlock';
import RepOrdersTabs from '@/components/dashboard/RepOrdersTabs';
import { getServerUserFallback } from '@/lib/supabase/getServerUserFallback';
import { createClient } from '@/lib/supabase/server';
import { Plus, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

function getJoinedProduct(item: any) {
  if (!item?.products) return null;
  return Array.isArray(item.products) ? item.products[0] : item.products;
}

function getOrderThumbnail(items: any[]) {
  const firstWithImage = items.find((item: any) => {
    const product = getJoinedProduct(item);

    return (
      item?.image_url ||
      item?.external_image_url ||
      product?.image_url ||
      product?.external_image_url ||
      product?.image_variants
    );
  });

  if (!firstWithImage) return null;

  const product = getJoinedProduct(firstWithImage);

  return (
    firstWithImage.image_url ||
    firstWithImage.external_image_url ||
    product?.image_url ||
    product?.external_image_url ||
    null
  );
}

function mapOrders(rows: any[] | null) {
  return (rows || []).map((o: any) => {
    const clientData = Array.isArray(o.clients) ? o.clients[0] : o.clients;
    const items = Array.isArray(o.order_items) ? o.order_items : [];

    const totalQty = items.reduce(
      (acc: number, item: any) => acc + (Number(item.quantity) || 0),
      0
    );

    const brands = Array.from(
      new Set(
        items
          .map((item: any) => {
            const product = getJoinedProduct(item);
            return item.brand || item.product_brand || product?.brand;
          })
          .filter(Boolean)
      )
    );

    const brandsSummary = brands.join(', ');

    return {
      id: o.id,
      display_id: o.display_id,
      created_at: o.created_at,
      status: o.status,
      total_value: Number(o.total_value || 0),
      item_count: items.length || 0,
      total_qty: totalQty,
      brands: brandsSummary,
      client_name_guest:
        clientData?.name || o.client_name_guest || 'Cliente não identificado',
      client_phone_guest: clientData?.phone || o.client_phone_guest || '',
      seller_id: o.seller_id || null,
      source: o.source || null,
      company_id: o.company_id || null,
      thumbnail_url: getOrderThumbnail(items),
    };
  });
}

export default async function OrdersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let finalUser = user;

  if (!finalUser) {
    try {
      const fb = await getServerUserFallback();
      if (fb) finalUser = fb;
    } catch {
      // ignore
    }
  }

  if (!finalUser) {
    redirect('/login');
  }

  const currentUser = finalUser!;
  const finalUserId = currentUser.id;
  const finalUserEmail = currentUser.email || '';

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id, status, trial_ends_at, full_name, name, email')
    .eq('id', finalUserId)
    .maybeSingle();

  const role = String((profile as any)?.role || '');
  const companyId = (profile as any)?.company_id || null;
  const status = (profile as any)?.status || 'trial';

  const trialEnds = (profile as any)?.trial_ends_at
    ? new Date((profile as any).trial_ends_at)
    : null;

  const now = new Date();
  const isTrialExpired = trialEnds ? now > trialEnds : false;

  const isBlocked =
    status === 'blocked' || (status === 'trial' && isTrialExpired);

  if (isBlocked) {
    return (
      <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <ShoppingBag size={24} className="text-primary" /> Pedidos
        </h1>

        <PaywallBlock
          user={{
            id: finalUserId,
            name:
              (profile as any)?.full_name ||
              (profile as any)?.name ||
              'Assinante',
            email: (profile as any)?.email || finalUserEmail,
          }}
        />
      </div>
    );
  }

  const isCompanyAdmin =
    Boolean(companyId) && (role === 'admin_company' || role === 'master');

  const isRepresentative =
    Boolean(companyId) && (role === 'representative' || role === 'rep');

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
          total_value: Number(o.total_value || 0),
          faturado_at: o.faturado_at || null,
          despachado_at: o.despachado_at || null,
          entregue_at: o.entregue_at || null,
          customer_name: o.customer_name || o.client_name_guest || null,
          customer_city: o.customer_city || null,
          rep_name: o.rep_name || null,
          seller_id: o.user_id || o.seller_id || null,
        }))}
      />
    );
  }

  const richSelect = `
    id,
    display_id,
    created_at,
    status,
    total_value,
    client_name_guest,
    client_phone_guest,
    client_id,
    source,
    seller_id,
    company_id,
    user_id,
    clients (
      name,
      phone
    ),
    order_items (
      id,
      order_id,
      product_id,
      product_name,
      product_reference,
      quantity,
      unit_price,
      total_price,
      brand,
      image_url,
      external_image_url,
      products (
        id,
        name,
        brand,
        image_url,
        external_image_url,
        image_variants
      )
    )
  `;

  const legacySelect = `
    id,
    display_id,
    created_at,
    status,
    total_value,
    client_name_guest,
    client_phone_guest,
    client_id,
    source,
    seller_id,
    company_id,
    user_id,
    clients (
      name,
      phone
    ),
    order_items (
      id,
      product_name,
      quantity,
      brand,
      products (
        brand
      )
    )
  `;

  async function fetchOrdersByFilter(
    filter: 'user' | 'companySeller',
    selectQuery = richSelect
  ) {
    let query = supabase
      .from('orders')
      .select(selectQuery)
      .order('created_at', { ascending: false });

    if (filter === 'user') {
      query = query.eq('user_id', finalUserId);
    }

    if (filter === 'companySeller') {
      query = query.eq('company_id', companyId).eq('seller_id', finalUserId);
    }

    return query;
  }

  async function safeFetchOrders(filter: 'user' | 'companySeller') {
    const rich = await fetchOrdersByFilter(filter, richSelect);

    if (!rich.error) {
      return rich.data || [];
    }

    console.warn(
      `[orders/page] richSelect falhou em ${filter}, usando legacySelect:`,
      rich.error.message
    );

    const legacy = await fetchOrdersByFilter(filter, legacySelect);

    if (legacy.error) {
      console.error(
        `[orders/page] legacySelect também falhou em ${filter}:`,
        legacy.error.message
      );

      return [];
    }

    return legacy.data || [];
  }

  if (isRepresentative && companyId) {
    const [mySalesRows, distributorRows] = await Promise.all([
      safeFetchOrders('user'),
      safeFetchOrders('companySeller'),
    ]);

    return (
      <div className="p-4 md:p-6 space-y-6 pb-24 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ShoppingBag size={24} className="text-primary" /> Pedidos
            </h1>

            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Gestão por carteira.
            </p>
          </div>

          <Link href="/dashboard/orders/new" className="w-full sm:w-auto">
            <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 w-full justify-center">
              <Plus size={18} /> Criar Pedido Manual
            </button>
          </Link>
        </div>

        <RepOrdersTabs
          mySales={mapOrders(mySalesRows)}
          distributorOrders={mapOrders(distributorRows)}
          currentUserId={finalUserId}
        />
      </div>
    );
  }

  const orders = await safeFetchOrders('user');
  const mappedOrders = mapOrders(orders);

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingBag size={24} className="text-primary" /> Pedidos
          </h1>

          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Histórico de vendas.
          </p>
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
