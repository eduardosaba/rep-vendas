import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { LicensesTable } from '@/components/admin/LicensesTable';
import {
  CreditCard,
  AlertTriangle,
  Users,
  Download,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export default async function AdminLicensesPage() {
  const supabase = await createClient();

  // 1. Segurança: Verificar Admin
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // 2. Buscar Dados Reais
  // Nota: O nome da foreign key 'subscriptions_user_id_fkey_profiles' deve estar exato
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

  // 3. Processar Dados (KPIs)
  let totalMRR = 0;
  let activeCount = 0;
  let canceledCount = 0;

  // Interface auxiliar
  interface SubscriptionRaw {
    id: string;
    status?: string | null;
    plan_name?: string | null;
    price?: number | string | null;
    created_at?: string;
    user?: { email?: string | null } | null;
  }

  const list = (rawData || []) as SubscriptionRaw[];

  const subscriptions = list.map((sub) => {
    const price = Number(sub.price) || 0;
    const statusLower = (sub.status || '').toLowerCase();

    // Normalização de status
    const isActive = ['active', 'ativo', 'trialing'].includes(statusLower);
    const isCanceled = ['canceled', 'cancelado', 'unpaid'].includes(
      statusLower
    );

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

  // Cálculos de Porcentagem
  const totalSubs = subscriptions.length;
  const churnRate =
    totalSubs > 0 ? ((canceledCount / totalSubs) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-8 p-4 md:p-6 lg:p-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Wallet className="text-indigo-600" /> Assinaturas & Receita
          </h1>
          <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
            Visão geral financeira e saúde da base de clientes.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium shadow-sm">
          <Download size={16} />
          Exportar Relatório
        </button>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CARD 1: MRR (Destaque) */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-700 text-white p-6 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none">
          {/* Efeito de fundo */}
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <CreditCard size={100} />
          </div>

          <div className="relative z-10">
            <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
              MRR (Receita Recorrente)
            </p>
            <h3 className="text-4xl font-extrabold tracking-tight mt-2">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(totalMRR)}
            </h3>
            <div className="mt-4 flex items-center gap-2 text-indigo-100 text-sm bg-white/10 w-fit px-2 py-1 rounded-lg backdrop-blur-sm">
              <TrendingUp size={14} />
              <span>Baseado em assinaturas ativas</span>
            </div>
          </div>
        </div>

        {/* CARD 2: Assinantes Ativos */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Users className="text-blue-600 dark:text-blue-400" size={20} />
              </div>
              <span className="text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                Ativos
              </span>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
              {activeCount}
            </h3>
            <p className="text-gray-500 dark:text-slate-400 text-sm font-medium mt-1">
              Assinantes Totais
            </p>
          </div>
          <div className="mt-4 w-full bg-gray-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-1000"
              style={{ width: `${(activeCount / (totalSubs || 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* CARD 3: Churn Rate */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <AlertTriangle
                  className="text-red-600 dark:text-red-400"
                  size={20}
                />
              </div>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                Risco
              </span>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
              {churnRate}%
            </h3>
            <p className="text-gray-500 dark:text-slate-400 text-sm font-medium mt-1">
              Taxa de Cancelamento
            </p>
          </div>
          <p className="text-xs text-red-500 mt-4 flex items-center gap-1">
            {canceledCount} contas canceladas no total
          </p>
        </div>
      </div>

      {/* TABELA (Client Component) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">
            Histórico de Assinaturas
          </h3>
        </div>
        <LicensesTable subscriptions={subscriptions} />
      </div>
    </div>
  );
}
