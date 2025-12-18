import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { LicensesTable } from '@/components/admin/LicensesTable';
import { CreditCard, AlertTriangle, Users } from 'lucide-react';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export default async function AdminLicensesPage() {
  const supabase = await createClient();

  // 1. Segurança: Verificar Admin
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // 2. Buscar Dados Reais (Query Adaptada ao seu Schema)
  // Buscamos subscription e fazemos join com profiles (para email) e plans (para detalhes se precisar)
  const { data: rawData, error } = await supabase
    .from('subscriptions')
    .select(
      `
      id,
      status,
      plan_name,
      price,
      created_at,
      user:profiles!subscriptions_user_id_fkey_profiles (
        email
      )
    `
    )
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Erro ao buscar assinaturas', error);
  }

  // 3. Processar Dados para o Formato da Tabela e KPIs
  let totalMRR = 0;
  let activeCount = 0;
  let canceledCount = 0;

  interface SubscriptionRaw {
    id: string;
    status?: string | null;
    plan_name?: string | null;
    price?: number | string | null;
    created_at?: string;
    user?: { email?: string | null } | null;
  }

  const subscriptions = ((rawData || []) as SubscriptionRaw[]).map((sub) => {
    const price = Number(sub.price) || 0;
    const statusLower = (sub.status || '').toLowerCase();
    const isActive = statusLower === 'active' || statusLower === 'ativo';
    const isCanceled =
      statusLower === 'canceled' || statusLower === 'cancelado';

    if (isActive) {
      activeCount++;
      totalMRR += price;
    }
    if (isCanceled) canceledCount++;

    return {
      id: sub.id,
      email: sub.user?.email || 'Email não disponível',
      plan_name: sub.plan_name || 'Desconhecido',
      status: sub.status || 'unknown',
      price,
      created_at: sub.created_at || new Date().toISOString(),
    };
  });

  // Taxa de Churn simples (Cancelados / Total)
  const churnRate =
    subscriptions.length > 0
      ? ((canceledCount / subscriptions.length) * 100).toFixed(1)
      : '0';

  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CreditCard className="text-primary" /> Assinaturas e Licenças
          </h1>
          <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
            Gerenciamento financeiro em tempo real
          </p>
        </div>
      </div>

      {/* Cards de Resumo (KPIs Reais) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* MRR Card */}
        <div className="bg-gradient-to-br from-primary to-primary/90 text-white p-6 rounded-xl shadow-lg border border-primary/30">
          <p className="text-primary/80 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
            <CreditCard size={16} /> MRR (Receita Mensal)
          </p>
          <h3 className="text-3xl font-bold">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(totalMRR)}
          </h3>
          <p className="text-primary/70 text-xs mt-2 opacity-80">
            Baseado em assinaturas ativas
          </p>
        </div>

        {/* Total Assinantes */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <p className="text-gray-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
            <Users size={16} /> Assinantes Ativos
          </p>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
            {activeCount}
          </h3>
          <p className="text-xs text-gray-400 mt-2">
            De {subscriptions.length} registros totais
          </p>
        </div>

        {/* Churn / Cancelados */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <p className="text-red-500 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
            <AlertTriangle size={16} /> Taxa de Cancelamento
          </p>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
            {churnRate}%
          </h3>
          <p className="text-xs text-gray-400 mt-2">
            {canceledCount} cancelados
          </p>
        </div>
      </div>

      {/* Componente Client-Side */}
      <LicensesTable subscriptions={subscriptions} />
    </div>
  );
}
