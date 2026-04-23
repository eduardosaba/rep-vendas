'use server';

import { createClient } from '@/lib/supabase/server';

export async function getCompanyPerformance() {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) return { success: false, error: 'Not authenticated' };

  const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', userId).maybeSingle();
  const companyId = (profile as any)?.company_id;
  if (!companyId) return { success: false, error: 'User not linked to a company' };

  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  // Orders this month for company
  const { data: orders, error: ordersErr } = await supabase
    .from('orders')
    .select('id,total_value,status,created_at,user_id,customer_id')
    .gte('created_at', firstDayOfMonth)
    .eq('company_id', companyId);
  if (ordersErr) return { success: false, error: ordersErr.message };

  // Totals
  const totalSales = (orders || []).reduce((sum: number, o: any) => sum + Number(o.total_value || 0), 0);
  const ordersCount = (orders || []).length;

  const pendingBilling = (orders || [])
    .filter((o: any) => o.status === 'Pendente' || o.status === 'Aguardando Faturamento')
    .reduce((sum: number, o: any) => sum + Number(o.total_value || 0), 0);

  // Ranking by representative (user_id)
  const rankingMap: Record<string, number> = {};
  for (const o of (orders || [])) {
    if (!o.user_id) continue;
    rankingMap[o.user_id] = (rankingMap[o.user_id] || 0) + Number(o.total_value || 0);
  }

  const repIds = Object.keys(rankingMap);
  let repsById: Record<string, any> = {};
  if (repIds.length > 0) {
    const { data: reps } = await supabase.from('profiles').select('id,full_name,email').in('id', repIds as string[]);
    (reps || []).forEach((r: any) => { repsById[r.id] = r; });
  }

  const ranking = Object.entries(rankingMap).map(([userId, total]) => ({ userId, total, name: repsById[userId]?.full_name || repsById[userId]?.email || 'Desconhecido' }));
  ranking.sort((a: any, b: any) => b.total - a.total);

  // Customers: total vs active (last 45 days)
  const { count: totalCustomersCount } = await supabase.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', companyId);

  const last45 = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
  const { data: activeCustomersOrders } = await supabase.from('orders').select('customer_id').eq('company_id', companyId).gte('created_at', last45).not('customer_id', 'is', null);
  const activeCustomerIds = Array.from(new Set((activeCustomersOrders || []).map((o: any) => o.customer_id))).filter(Boolean);
  const activeCustomers = activeCustomerIds.length;
  const sleepingCustomers = (Number(totalCustomersCount || 0) - activeCustomers) || 0;

  return {
    success: true,
    totalSales,
    ordersCount,
    pendingBilling,
    ranking,
    totalCustomers: Number(totalCustomersCount || 0),
    activeCustomers,
    sleepingCustomers,
  };
}
