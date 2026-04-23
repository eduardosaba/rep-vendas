'use server';

import { createClient } from '@/lib/supabase/server';

export async function getCompanyStats() {
  const supabase = await createClient();

  // Deriva company_id do perfil autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Não autenticado' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle();

  const cid = (profile as any)?.company_id;
  if (!cid) return { success: true, data: { totalSales: 0, orderCount: 0, activeCustomers: 0, ranking: [], pendingBilling: 0 } };

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  // 1) Pedidos do mês para esta company
  const { data: orders } = await supabase
    .from('orders')
    .select('id, total_value, status, created_at, user_id')
    .gte('created_at', startOfMonth.toISOString())
    .eq('company_id', cid);

  // 2) Clientes ativos (contagem)
  const { count: activeCustomers } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', cid);

  // 3) Ranking por representante (agregar por user_id)
  const rankingMap: Record<string, number> = {};
  (orders || []).forEach((o: any) => {
    const uid = o.user_id || 'unknown';
    rankingMap[uid] = (rankingMap[uid] || 0) + Number(o.total_value || 0);
  });

  const userIds = Object.keys(rankingMap).filter((id) => id && id !== 'unknown');
  let repsById: Record<string, any> = {};
  if (userIds.length > 0) {
    const { data: reps } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);
    repsById = (reps || []).reduce((acc: any, r: any) => ({ ...acc, [r.id]: r }), {});
  }

  const ranking = Object.entries(rankingMap)
    .map(([uid, total]) => {
      const rep = repsById[uid];
      const label = rep ? rep.full_name || rep.email || uid : uid;
      return [label, total];
    })
    .sort((a: any, b: any) => b[1] - a[1]);

  const totalSales = (orders || []).reduce((s: number, o: any) => s + Number(o.total_value || 0), 0);
  const orderCount = (orders || []).length;
  const pendingBilling = (orders || [])
    .filter((o: any) => (o.status || '').toLowerCase() === 'pendente')
    .reduce((s: number, o: any) => s + Number(o.total_value || 0), 0);

  return {
    success: true,
    data: {
      totalSales,
      orderCount,
      activeCustomers: activeCustomers || 0,
      ranking,
      pendingBilling,
    },
  };
}
