'use server';

import { createClient } from '@/lib/supabase/server';

export async function getRepresentativeStats(userId: string) {
  const supabase = await createClient();

  const firstDayOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  ).toISOString();

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, commission_rate')
    .eq('id', userId)
    .maybeSingle();

  const companyId = (profile as any)?.company_id || null;
  const profileRate = Number((profile as any)?.commission_rate || 0);

  let commissionTrigger: 'faturamento' | 'liquidez' = 'liquidez';
  let companyDefaultRate = 5;

  if (companyId) {
    const { data: company } = await supabase
      .from('companies')
      .select('commission_trigger, default_commission_rate')
      .eq('id', companyId)
      .maybeSingle();

    const trigger = String((company as any)?.commission_trigger || 'liquidez').toLowerCase();
    commissionTrigger = trigger === 'faturamento' ? 'faturamento' : 'liquidez';
    companyDefaultRate = Number((company as any)?.default_commission_rate || 5) || 5;
  }

  const effectiveRate = profileRate > 0 ? profileRate : companyDefaultRate;

  let ordersQuery = supabase
    .from('orders')
    .select('id, total_value, status, created_at, seller_id, company_id')
    .eq('seller_id', userId)
    .order('created_at', { ascending: false });

  if (companyId) {
    ordersQuery = ordersQuery.eq('company_id', companyId);
  }

  const { data: allOrders } = await ordersQuery;
  const orders = (allOrders || []) as any[];

  const monthOrders = orders.filter((o) => String(o.created_at || '') >= firstDayOfMonth);

  const isCancelled = (status: string) => status.includes('cancel');
  const normalizedStatus = (input: any) => String(input || '').toLowerCase();

  const isReleasedByRule = (status: string) => {
    if (commissionTrigger === 'faturamento') {
      return (
        status.includes('confirmado') ||
        status.includes('prepar') ||
        status.includes('enviado') ||
        status.includes('entregue') ||
        status.includes('completo')
      );
    }

    return status.includes('entregue') || status.includes('completo');
  };

  const totalVendido = monthOrders.reduce((acc: number, o: any) => {
    const status = normalizedStatus(o.status);
    if (isCancelled(status)) return acc;
    return acc + Number(o.total_value || 0);
  }, 0);

  const comissaoPrevista = monthOrders.reduce((acc: number, o: any) => {
    const status = normalizedStatus(o.status);
    if (isCancelled(status)) return acc;
    return acc + (Number(o.total_value || 0) * effectiveRate) / 100;
  }, 0);

  const comissaoLiberada = monthOrders.reduce((acc: number, o: any) => {
    const status = normalizedStatus(o.status);
    if (isCancelled(status)) return acc;
    if (!isReleasedByRule(status)) return acc;
    return acc + (Number(o.total_value || 0) * effectiveRate) / 100;
  }, 0);

  const comissaoEmAberto = Math.max(0, comissaoPrevista - comissaoLiberada);

  const { data: commissions } = await supabase
    .from('commissions')
    .select('amount, status, created_at')
    .eq('seller_id', userId)
    .gte('created_at', firstDayOfMonth);

  const comissaoPaga = (commissions || [])
    .filter((c: any) => String(c.status || '').toLowerCase() === 'paid')
    .reduce((acc: number, c: any) => acc + Number(c.amount || 0), 0);

  const quarentaECincoDiasAtras = new Date();
  quarentaECincoDiasAtras.setDate(quarentaECincoDiasAtras.getDate() - 45);

  const { data: inativos } = await supabase
    .from('customers')
    .select('id, name, last_order_date')
    .eq('seller_id', userId)
    .lt('last_order_date', quarentaECincoDiasAtras.toISOString());

  return {
    totalVendido,
    comissaoTotal: comissaoPrevista,
    comissaoPendente: comissaoEmAberto,
    comissaoLiberada,
    comissaoPaga,
    regraComissao: commissionTrigger,
    taxaComissao: effectiveRate,
    clientesInativos: inativos || [],
  };
}
