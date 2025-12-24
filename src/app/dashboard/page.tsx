import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StatCard } from '@/components/StatCard';
import RecentOrdersTable from '@/components/RecentOrdersTable';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import {
  DollarSign,
  ShoppingBag,
  Package,
  Users,
  ExternalLink,
  PlusCircle,
  FileSpreadsheet,
  Settings,
  LayoutDashboard,
} from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log('[dashboard.page] getUser:', {
      user: !!user,
      authError: !!authError,
    });

    if (authError || !user) {
      redirect('/login');
    }

    // Aceita tanto Promises quanto os Builders do Supabase (PostgrestBuilder),
    // que são "thenable" em runtime mas nem sempre tipados como Promise.
    async function safeFetch<T>(
      maybeBuilder: any,
      fallbackValue: T
    ): Promise<T> {
      try {
        const result = await maybeBuilder;
        if (!result || (result as any).error) return fallbackValue;
        return result;
      } catch {
        return fallbackValue;
      }
    }

    // --- BUSCAS DE DADOS (Mantidas iguais) ---
    const [
      rpcResult,
      productsResult,
      ordersResult,
      clientsResult,
      recentOrdersResult,
      settingsResult,
      profileResult,
      chartOrdersResult,
    ] = await Promise.all([
      safeFetch(
        supabase
          .rpc('get_dashboard_totals', { owner_id: user.id })
          .maybeSingle(),
        { data: { total_revenue: 0, total_items_sold: 0 } }
      ),
      safeFetch(
        supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('active', true),
        { count: 0 }
      ),
      safeFetch(
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
        { count: 0 }
      ),
      safeFetch(
        supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
        { count: 0 }
      ),
      safeFetch(
        supabase
          .from('orders')
          .select(
            `
          id, 
          display_id, 
          client_name_guest, 
          total_value, 
          status, 
          created_at,
          clients(name),
          order_items(id)
          `
          )
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        { data: [] }
      ),
      safeFetch(
        supabase
          .from('settings')
          .select('catalog_slug, name')
          .eq('user_id', user.id)
          .maybeSingle(),
        { data: { catalog_slug: '', name: '' } }
      ),
      safeFetch(
        supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle(),
        { data: { full_name: '' } }
      ),
      safeFetch(
        supabase
          .from('orders')
          .select('total_value, created_at')
          .eq('user_id', user.id)
          .gte(
            'created_at',
            new Date(
              new Date().setFullYear(new Date().getFullYear() - 1)
            ).toISOString()
          )
          .order('created_at', { ascending: true }),
        { data: [] }
      ),
    ]);

    const rawTotals = rpcResult.data as any;
    const totalRevenue = Number(rawTotals?.total_revenue || 0);
    const productsCount = productsResult.count || 0;
    const ordersCount = ordersResult.count || 0;
    const clientsCount = clientsResult.count || 0;
    const recentOrders = recentOrdersResult.data || [];
    const catalogSlug = settingsResult.data?.catalog_slug || '';
    const storeName = settingsResult.data?.name || 'Sua Loja';
    const userName =
      profileResult.data?.full_name?.split(' ')[0] || 'Empreendedor';
    const chartOrdersRaw = chartOrdersResult.data || [];
    const storeLink = catalogSlug ? `/catalogo/${catalogSlug}` : '#';

    return (
      // If execution reaches here, all fetches succeeded — render UI
      // Padding reduzido no mobile (p-4) vs desktop (md:p-8)
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-slate-950 p-4 md:p-8 animate-in fade-in duration-500">
        {/* HEADER: Stack vertical no mobile, Horizontal no Desktop */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              Olá, {userName} 👋
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1.5 text-base sm:text-lg">
              Visão geral da <strong>{storeName}</strong>.
            </p>
          </div>

          {catalogSlug && (
            // Link ocupa largura total no mobile para facilitar clique
            <div className="w-full lg:w-auto flex items-center justify-between lg:justify-start gap-3 bg-white dark:bg-slate-900 p-3 pl-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Loja Online:
              </span>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded text-[var(--primary)] dark:text-[var(--primary)] font-mono truncate max-w-[150px] sm:max-w-none">
                  /{catalogSlug}
                </code>
                <a
                  href={storeLink}
                  target="_blank"
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-gray-500 hover:text-[var(--primary)] transition-colors"
                  title="Abrir loja"
                >
                  <ExternalLink size={18} />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* KPI CARDS: 1 col no mobile, 2 no tablet, 4 no desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Receita Total"
            value={new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(totalRevenue)}
            icon={DollarSign}
            color="green"
          />
          <StatCard
            title="Pedidos"
            value={ordersCount}
            icon={ShoppingBag}
            color="blue"
          />
          <StatCard
            title="Clientes"
            value={clientsCount}
            icon={Users}
            color="purple"
          />
          <StatCard
            title="Produtos"
            value={productsCount}
            icon={Package}
            color="orange"
          />
        </div>

        {/* GRID PRINCIPAL: 1 coluna no mobile/tablet, 3 no desktop large */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          <div className="xl:col-span-2 h-full min-h-[400px]">
            <DashboardCharts orders={chartOrdersRaw} />
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden h-full flex flex-col">
              <div className="p-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <LayoutDashboard
                    size={18}
                    className="text-[var(--primary)]"
                  />
                  Acesso Rápido
                </h3>
              </div>

              <div className="p-5 grid grid-cols-2 gap-3">
                <QuickActionCard
                  href="/dashboard/products/new"
                  icon={PlusCircle}
                  label="Novo Produto"
                  color="indigo"
                />
                <QuickActionCard
                  href="/dashboard/products/import-massa"
                  icon={FileSpreadsheet}
                  label="Importar Excel"
                  color="green"
                />
                <QuickActionCard
                  href="/dashboard/clients"
                  icon={Users}
                  label="Clientes"
                  color="blue"
                />
                <QuickActionCard
                  href="/dashboard/settings"
                  icon={Settings}
                  label="Configurações"
                  color="slate"
                />
              </div>

              <div className="mt-auto p-5 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-900 border-t border-gray-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
                  DICA
                </p>
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  Divulgue seu link no Instagram para vender mais.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* TABELA: Overflow Auto para scroll horizontal no mobile */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-900/50">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-sm sm:text-base">
              <ShoppingBag size={18} className="text-[var(--primary)]" />
              Pedidos Recentes
            </h3>
            <Link
              href="/dashboard/orders"
              className="text-xs sm:text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline flex items-center gap-1 transition-all"
            >
              Ver todos <ExternalLink size={12} />
            </Link>
          </div>
          {/* Container wrapper para scroll horizontal */}
          <div className="overflow-x-auto">
            <RecentOrdersTable orders={recentOrders} />
          </div>
        </div>
      </div>
    );
  } catch (err) {
    // Server-side error fallback to avoid white screen and surface error during development
    console.error('[dashboard.page] error rendering dashboard', err);
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-2xl w-full bg-white dark:bg-slate-900 p-6 rounded shadow">
            <h2 className="text-xl font-bold mb-2 text-red-600">
              Erro ao renderizar Dashboard
            </h2>
            <pre className="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
              {String(err)}
            </pre>
            <p className="mt-4 text-sm text-gray-600">
              Ver logs do servidor para stack trace completo.
            </p>
          </div>
        </div>
      );
    }

    // In production, redirect to login to avoid exposing internals
    redirect('/login');
  }
}

// QuickActionCard igual
function QuickActionCard({
  href,
  icon: Icon,
  label,
  color,
}: {
  href: string;
  icon: any;
  label: string;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    indigo:
      'text-[var(--primary)] bg-[var(--primary)]/10 dark:bg-[var(--primary)]/20 dark:text-[var(--primary)] group-hover:bg-[var(--primary)]/20',
    green:
      'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-300 group-hover:bg-emerald-100',
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 group-hover:bg-blue-100',
    slate:
      'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 group-hover:bg-slate-200',
  };

  return (
    <Link
      href={href}
      className="group flex flex-col items-center justify-center gap-2 p-3 sm:p-4 rounded-xl border border-gray-200 dark:border-slate-800 hover:border-[var(--primary)]/50 dark:hover:border-[var(--primary)]/50 hover:shadow-md transition-all bg-white dark:bg-slate-800/50 h-24 sm:h-auto"
    >
      <div
        className={`p-2 sm:p-3 rounded-full transition-colors ${colorClasses[color] || colorClasses.slate}`}
      >
        <Icon size={20} className="sm:w-6 sm:h-6" />
      </div>
      <span className="text-[10px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white text-center leading-tight">
        {label}
      </span>
    </Link>
  );
}
