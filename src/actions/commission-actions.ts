'use server'

import { createClient } from '@/lib/supabase/server';

export async function getCommissionReport(startDate?: string | null, endDate?: string | null) {
  const supabase = await createClient();

  const userRes: any = await supabase.auth.getUser();
  const user = userRes?.data?.user;
  if (!user) return { error: 'Usuário não autenticado' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.company_id) return { error: 'Empresa não encontrada' };
  const companyId = profile.company_id;

  // Default period: start of current month -> now
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const start = startDate || defaultStart;
  const end = endDate || new Date().toISOString();

  try {
    // Select orders marked as paid/confirmed/entregue — conservative filter using common statuses
    const statuses = ['paid', 'confirmado', 'confirm', 'Pago', 'Confirmado', 'Entregue', 'Finalizado'];

    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, total_value, seller_id, created_at, profiles:seller_id(id, full_name, commission_rate, slug)')
      .eq('company_id', companyId)
      .gte('created_at', start)
      .lte('created_at', end)
      .in('status', statuses)
      .order('created_at', { ascending: false });

    if (error) return { error: error.message || String(error) };

    const bySeller: Record<string, { seller_id: string; seller_name: string; seller_slug?: string; commission_rate: number; total_sales: number; qtd_pedidos: number }> = {};

    (orders || []).forEach((o: any) => {
      const sid = o.seller_id || 'direct';
      const seller = o.profiles || null;
      const sellerName = seller?.full_name || 'Venda Direta';
      const sellerSlug = seller?.slug || undefined;
      const commissionRate = Number(seller?.commission_rate ?? 0);
      if (!bySeller[sid]) {
        bySeller[sid] = {
          seller_id: sid,
          seller_name: sellerName,
          seller_slug: sellerSlug,
          commission_rate: commissionRate,
          total_sales: 0,
          qtd_pedidos: 0,
        } as any;
      }
      const total = Number(o.total_value || 0);
      bySeller[sid].total_sales += total;
      bySeller[sid].qtd_pedidos += 1;
    });

    const report = Object.values(bySeller).map((s) => ({
      ...s,
      commission_to_pay: Number(((s.total_sales * (s.commission_rate || 0)) / 100).toFixed(2)),
    }));

    // Sort desc by total_sales
    report.sort((a, b) => Number(b.total_sales) - Number(a.total_sales));

    return { success: true, report, period: { start, end } };
  } catch (err: any) {
    return { error: err?.message || String(err) };
  }
}
