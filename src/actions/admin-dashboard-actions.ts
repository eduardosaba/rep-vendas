'use server'

import { createClient } from '@/lib/supabase/server';

export async function getAdminDashboardData() {
  const supabase = await createClient();

  // 1) Usuário logado
  const userRes: any = await supabase.auth.getUser();
  const user = userRes?.data?.user;
  if (!user) return { error: 'Usuário não autenticado' };

  // 2) Pegar perfil para company_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.company_id) return { error: 'Empresa não encontrada para o usuário' };
  const companyId = profile.company_id;

  try {
    // 3) Últimos pedidos da equipe com join em profiles (seller)
    const { data: orders } = await supabase
      .from('orders')
      .select(`
        *,
        representative:profiles!seller_id(id, full_name, slug)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(200);

    // 4) Agregação via query simples (seller_id, status, total_value)
    const { data: agg } = await supabase
      .from('orders')
      .select('seller_id, status, total_value')
      .eq('company_id', companyId);

    const bySeller: Record<string, { seller_name: string; seller_slug?: string; total_vendido: number; qtd_pedidos: number }> = {};
    const statusCounts: Record<string, number> = {};

    (agg || []).forEach((o: any) => {
      const sid = o.seller_id || 'direct';
      if (!bySeller[sid]) bySeller[sid] = { seller_name: 'Venda Direta', total_vendido: 0, qtd_pedidos: 0 } as any;
      bySeller[sid].total_vendido = Number(bySeller[sid].total_vendido || 0) + Number(o.total_value || 0);
      bySeller[sid].qtd_pedidos = Number(bySeller[sid].qtd_pedidos || 0) + 1;
      statusCounts[o.status || 'unknown'] = (statusCounts[o.status || 'unknown'] || 0) + 1;
    });

    // Map orders to frontend-friendly shape
    const formattedOrders = (orders || []).map((ord: any) => ({
      ...ord,
      seller_name: ord.representative?.full_name || 'Venda Direta',
      seller_slug: ord.representative?.slug || null,
    }));

    // ranking list
    const rankingList = Object.keys(bySeller).map((k) => ({ seller_id: k, ...bySeller[k] }));
    rankingList.sort((a, b) => Number(b.total_vendido) - Number(a.total_vendido));

    return { success: true, orders: formattedOrders, ranking: rankingList, statusCounts };
  } catch (err: any) {
    return { error: err?.message || String(err) };
  }
}
