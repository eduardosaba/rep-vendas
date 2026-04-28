'use server';

import { getCompanyOrders } from '@/app/admin/companies/actions';
import AdminOrdersCentral from '@/components/admin/orders/AdminOrdersCentral';
import { createClient } from '@/lib/supabase/server';

export default async function Page() {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .maybeSingle();
  const companyId = (profile as any)?.company_id;
  if (!companyId)
    return <div className="p-6">Usuário não pertence a uma distribuidora.</div>;

  const { success, data, error } = await getCompanyOrders(companyId);
  if (!success) return <div className="p-6">Erro: {error}</div>;

  return (
    <AdminOrdersCentral
      initialOrders={(data || []).map((o: any) => ({
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
