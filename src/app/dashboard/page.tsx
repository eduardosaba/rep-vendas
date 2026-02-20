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
import NotificationsCTA from '@/components/NotificationsCTA';
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
      .select('*')
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

  // Nome seguro para exibição: tenta vários campos e cai para email/local-part ou 'Representante'
  const rawFullName =
    profile.data?.full_name || profile.data?.name || profile.data?.display_name || '';
  const firstName = rawFullName && typeof rawFullName === 'string' && rawFullName.trim().length > 0
    ? rawFullName.trim().split(' ')[0]
    : profile.data?.email
    ? profile.data.email.split('@')[0]
    : 'Representante';

  // debug removed

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-slate-950 p-4 md:p-8 animate-in fade-in duration-700">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Olá, {profile.data?.full_name || profile.data?.name || profile.data?.display_name || firstName} 👋🚀
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            📈 Dashboard <strong>RepVendas</strong>.
          </p>
          {settings.data && (
            <div className="mt-3">
              {settings.data.manage_stock ? (
                <div className="inline-flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-3 py-1 rounded-full text-xs font-semibold">
                  <AlertTriangle size={14} />
                  <span>⚠️ Alertas de Inventário — verifique itens críticos ⚠️</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full text-xs font-semibold">
                  <CheckCircle2 size={14} />
                  <span>🔓 Controle de estoque desativado</span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <DateFilter currentRange={range} />
          <UpdateNotificationModal />
          {/* Notifications CTA: client component */}
          {profile.data && !profile.data.notifications_enabled && (
            // `NotificationsCTA` is a client component; show only if not enabled
            <NotificationsCTA userId={activeUserId} />
          )}
          {settings.data?.catalog_slug && (
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: settings.data?.primary_color || '#2563EB' }}
                />
                <span className="font-semibold">Link do meu Catálogo</span>
              </div>
              <Link
                href={`/catalogo/${settings.data.catalog_slug}`}
                target="_blank"
                className="flex items-center gap-3 bg-white dark:bg-slate-800 p-3 px-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm text-xs font-bold text-primary hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                style={
                  settings.data?.primary_color
                    ? { boxShadow: `${settings.data.primary_color}22 0px 0px 0px 4px` }
                    : undefined
                }
                aria-label="Abrir meu catálogo em nova aba"
              >
                /{settings.data.catalog_slug} <ExternalLink size={14} />
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* SyncStatusCard removido conforme solicitado */}

      {/* Espaço da grade principal (widgets e cards) */}

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
