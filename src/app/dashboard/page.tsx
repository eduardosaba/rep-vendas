import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getActiveUserId } from '@/lib/auth-utils';
import { StatCard } from '@/components/StatCard';
import RecentOrdersTable from '@/components/RecentOrdersTable';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import DateFilter from '@/components/dashboard/DateFilter';
import {
  DollarSign,
  ShoppingBag,
  Package,
  Users,
  ExternalLink,
  RefreshCcw,
  PlusCircle,
  Settings as SettingsIcon,
  AlertTriangle,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import QuickActionCard from '@/components/QuickActionCard';
import UpdateNotificationModal from '@/components/dashboard/UpdateNotificationModal';
import { subDays, startOfDay, subMonths, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string } | undefined>;
}) {
  const supabase = await createClient();
  const resolvedSearchParams = (await searchParams) || {};
  const range = resolvedSearchParams.range || '30d';

  const activeUserId = await getActiveUserId();
  if (!activeUserId) redirect('/login');

  // 1. Definição do Período
  let startDate = subDays(new Date(), 30).toISOString();
  if (range === 'today') startDate = startOfDay(new Date()).toISOString();
  if (range === '7d') startDate = subDays(new Date(), 7).toISOString();
  if (range === '6m') startDate = subMonths(new Date(), 6).toISOString();
  const now = new Date().toISOString();

  // 2. Busca de Dados (com Promise.allSettled para não travar no erro)
  const results = await Promise.allSettled([
    supabase
      .rpc('get_dashboard_totals', {
        owner_id: activeUserId,
        start_date: startDate,
        end_date: now,
      })
      .maybeSingle(),
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', activeUserId)
      .eq('is_active', true),
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', activeUserId)
      .gte('created_at', startDate),
    supabase
      .from('orders')
      .select(
        `id, display_id, client_name_guest, total_value, status, created_at, order_items (id, quantity)`
      )
      .eq('user_id', activeUserId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('settings')
      .select('*')
      .eq('user_id', activeUserId)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', activeUserId)
      .maybeSingle(),
    supabase
      .from('orders')
      .select('total_value, created_at')
      .eq('user_id', activeUserId)
      .gte('created_at', startDate),
    supabase
      .from('sync_logs')
      .select('*')
      .eq('user_id', activeUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('system_updates')
      .select('*')
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('sync_jobs')
      .select('*')
      .eq('user_id', activeUserId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Extrair valores com fallback seguro
  const totals =
    results[0].status === 'fulfilled'
      ? results[0].value
      : { data: null, error: null };
  const products =
    results[1].status === 'fulfilled'
      ? results[1].value
      : { count: null, error: null };
  const orders =
    results[2].status === 'fulfilled'
      ? results[2].value
      : { count: null, error: null };
  const recentOrders =
    results[3].status === 'fulfilled'
      ? results[3].value
      : { data: [], error: null };
  const settings =
    results[4].status === 'fulfilled'
      ? results[4].value
      : { data: null, error: null };
  const profile =
    results[5].status === 'fulfilled'
      ? results[5].value
      : { data: null, error: null };
  const chartData =
    results[6].status === 'fulfilled'
      ? results[6].value
      : { data: [], error: null };
  const lastSync =
    results[7].status === 'fulfilled'
      ? results[7].value
      : { data: null, error: null };
  const latestUpdate =
    results[8].status === 'fulfilled'
      ? results[8].value
      : { data: null, error: null };
  const syncJob =
    results[9].status === 'fulfilled'
      ? results[9].value
      : { data: null, error: null };

  // Contagem de clientes (extraído do Promise.all para evitar duplicação)
  let clientsCount = 0;
  try {
    const clientsRes = await supabase.rpc('get_dashboard_clients_count', {
      p_owner_id: activeUserId,
      p_start_date: startDate,
    });
    const raw = clientsRes?.data ?? clientsRes;
    clientsCount = Number(raw ?? 0) || 0;
  } catch (err) {
    console.error('Erro ao calcular clientes únicos via RPC:', err);
    clientsCount = 0;
  }

  // 3. Lógica de Sincronização Ajustada
  const syncDate = lastSync.data ? new Date(lastSync.data.created_at) : null;
  const daysSinceSync = syncDate
    ? Math.floor(
        (new Date().getTime() - syncDate.getTime()) / (1000 * 3600 * 24)
      )
    : null;

  // Só considera "Não Saudável" se o usuário JÁ usa sincronização e passou de 15 dias sem atualizar
  const needsSyncAlert = daysSinceSync !== null && daysSinceSync > 15;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-slate-950 p-4 md:p-8 animate-in fade-in duration-700">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Olá, {profile.data?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Torre de Controle <strong>RepVendas</strong>.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <DateFilter currentRange={range} />
          <UpdateNotificationModal />
          {settings.data?.catalog_slug && (
            <Link
              href={`/catalogo/${settings.data.catalog_slug}`}
              target="_blank"
              className="flex items-center gap-3 bg-white dark:bg-slate-800 p-3 px-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm text-xs font-bold text-primary hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              /{settings.data.catalog_slug} <ExternalLink size={14} />
            </Link>
          )}
        </div>
      </header>

      {/* SyncStatusCard removido conforme solicitado */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* WIDGET DE SINCRONIZAÇÃO REFORMULADO */}
        <div
          className={`col-span-1 lg:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-[2rem] border border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900`}
        >
          <div className="flex items-center gap-3 sm:gap-5">
            <div
              className={`p-3 sm:p-4 rounded-2xl shadow-lg flex-shrink-0 ${needsSyncAlert ? 'bg-amber-500 text-white' : 'bg-indigo-500 text-white'}`}
            >
              {needsSyncAlert ? (
                <Activity size={24} className="sm:w-7 sm:h-7" />
              ) : (
                <RefreshCcw size={24} className="sm:w-7 sm:h-7" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Status de Sincronização
              </p>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                {needsSyncAlert
                  ? 'Sincronização Recomendada'
                  : 'Sistema em Dia'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                {syncDate
                  ? `Última atualização de dados há ${formatDistanceToNow(syncDate, { locale: ptBR })}.`
                  : 'Nenhuma sincronização via planilha realizada recentemente.'}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/products/sync"
            className="w-full sm:w-auto flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-all text-center"
          >
            Abrir Sincronizador
          </Link>
          {/* SyncControlClient removido do Dashboard conforme solicitação */}
        </div>

        {/* ALERTA DE ESTOQUE: Agora condicional ao campo 'manage_stock' */}
        {settings.data?.manage_stock ? (
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-[2rem] border border-gray-200 dark:border-slate-800 shadow-sm flex items-center gap-3 sm:gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl flex-shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase">
                Alertas de Inventário
              </p>
              <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                Verifique os itens críticos na aba de estoque.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50 dark:bg-slate-900 p-4 sm:p-6 rounded-[2rem] border border-emerald-100 dark:border-slate-800 shadow-sm flex items-center gap-3 sm:gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex-shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase">
                Estoque Desativado
              </p>
              <p className="text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-200">
                Operando apenas por catálogo fixo.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ... Restante do código (StatCards, Gráficos, RecentOrders) permanece igual ... */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Receita Bruta"
          value={new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(
            (totals.data as { total_revenue?: number })?.total_revenue || 0
          )}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Novos Pedidos"
          value={orders.count || 0}
          icon={ShoppingBag}
          color="blue"
        />
        <StatCard
          title="Produtos Ativos"
          value={products.count || 0}
          icon={Package}
          color="orange"
        />
        <StatCard
          title="Clientes"
          value={clientsCount}
          icon={Users}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
        <div className="xl:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-gray-200 dark:border-slate-800 shadow-sm min-h-[400px]">
          <DashboardCharts orders={chartData.data || []} />
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-gray-200 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold text-gray-400 dark:text-slate-500 mb-5 uppercase text-xs tracking-widest">
            Ações Rápidas
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <QuickActionCard
              href="/dashboard/products/new"
              icon={PlusCircle}
              label="Novo Produto"
              color="orange"
            />
            <QuickActionCard
              href="/dashboard/products/sync"
              icon={RefreshCcw}
              label="Sincronizar"
              color="blue"
            />
            <QuickActionCard
              href="/dashboard/inventory"
              icon={Package}
              label="Inventário"
              color="red"
            />
            <QuickActionCard
              href="/dashboard/settings"
              icon={SettingsIcon}
              label="Ajustes"
              color="slate"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <RecentOrdersTable
          orders={recentOrders.data || []}
          store={settings.data}
          rangeLabel="Geral"
        />
      </div>
    </div>
  );
}
