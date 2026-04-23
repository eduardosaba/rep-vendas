import RequireRole from '@/components/RequireRole';
import RoleGuard from '@/components/auth/RoleGuard.client';
import { createClient } from '@/lib/supabase/server';
import FinancialClosureDashboard from '@/components/admin/finance/FinancialClosureDashboard';

export default async function FinancialClosurePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <RequireRole
        allowedRoles={['financeiro_company', 'admin_company', 'master']}
      >
        <div className="p-6">Acesso restrito.</div>
      </RequireRole>
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle();

  const companyId = (profile as any)?.company_id;

  const { data: ordersData } = await supabase
    .from('orders')
    .select('id,total_value,faturado_at,status,customer_id,client_name_guest,company_id')
    .eq('company_id', companyId)
    .not('faturado_at', 'is', null)
    .in('status', ['Confirmado', 'Enviado', 'Entregue', 'Completo'])
    .order('faturado_at', { ascending: false })
    .limit(2000);

  const orders = (ordersData || []).map((o: any) => ({
    id: o.id,
    total_value: Number(o.total_value || 0),
    faturado_at: o.faturado_at,
    customer_id: o.customer_id || null,
    client_name_guest: o.client_name_guest || null,
  }));

  const orderIds = orders.map((o) => o.id);

  const { data: commissionsData } = await supabase
    .from('commissions')
    .select('amount,status,created_at,company_id')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(3000);

  const commissions = (commissionsData || []).map((c: any) => ({
    amount: Number(c.amount || 0),
    status: String(c.status || ''),
    created_at: c.created_at,
  }));

  let itemsData: any[] = [];
  if (orderIds.length > 0) {
    const { data } = await supabase
      .from('order_items')
      .select('order_id,total_price,products(brand)')
      .in('order_id', orderIds)
      .limit(5000);
    itemsData = data || [];
  }

  const orderItems = (itemsData || []).map((i: any) => ({
    order_id: i.order_id,
    total_price: Number(i.total_price || 0),
    brand: i?.products?.brand || 'Sem Marca',
  }));

  return (
    <RequireRole allowedRoles={['financeiro_company', 'admin_company', 'master']}>
      <RoleGuard allowedRoles={['financeiro_company', 'admin_company', 'master']}>
        <FinancialClosureDashboard
          orders={orders}
          commissions={commissions}
          orderItems={orderItems}
        />
      </RoleGuard>
    </RequireRole>
  );
}
