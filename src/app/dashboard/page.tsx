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
  Settings as SettingsIcon,
  LayoutDashboard,
} from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();

  // 1. Verificação de Usuário com falha explícita
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Helper para evitar falhas se tabelas estiverem vazias (Onboarding incompleto)
  async function safeFetch<T>(query: any, fallback: T): Promise<T> {
    try {
      const { data, error, count } = await query;
      if (error) return fallback;
      // Se for contagem pura
      if (count !== undefined && count !== null) return { count } as any;
      return { data } as any;
    } catch {
      return fallback;
    }
  }

  // 2. Busca de Dados Paralela para Performance
  const [
    totals,
    products,
    orders,
    clients,
    recentOrders,
    settings,
    profile,
    chartData,
  ] = await Promise.all([
    safeFetch(
      supabase.rpc('get_dashboard_totals', { owner_id: user.id }).maybeSingle(),
      { data: { total_revenue: 0, total_items_sold: 0 } }
    ),
    safeFetch(
      supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_active', true),
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
          'id, display_id, client_name_guest, total_value, status, created_at'
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
      { data: { catalog_slug: '', name: 'Minha Loja' } }
    ),
    safeFetch(
      supabase
        .from('profiles')
        .select('full_name, onboarding_completed')
        .eq('id', user.id)
        .maybeSingle(),
      { data: { full_name: 'Usuário', onboarding_completed: true } }
    ),
    safeFetch(
      supabase
        .from('orders')
        .select('total_value, created_at')
        .eq('user_id', user.id)
        .limit(100),
      { data: [] }
    ),
  ]);

  // Se onboarding_completed for falso no banco, mas você quer forçar a entrada,
  // comente as linhas abaixo. Caso contrário, ele mandará para onboarding.
  /*
  if (profile.data && !profile.data.onboarding_completed) {
    redirect('/onboarding');
  }
  */

  const totalRevenue = totals.data?.total_revenue || 0;
  const storeName = settings.data?.name || 'Sua Loja';
  const catalogSlug = settings.data?.catalog_slug || '';

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 p-4 md:p-8 animate-in fade-in duration-700">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Olá, {profile.data?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-500 mt-1">
            Gerencie a sua operação na <strong>{storeName}</strong>.
          </p>
        </div>

        {catalogSlug && (
          <Link
            href={`/catalogo/${catalogSlug}`}
            target="_blank"
            className="flex items-center gap-3 bg-white p-3 px-4 rounded-xl border border-gray-200 shadow-sm hover:border-primary/50 transition-all"
          >
            <span className="text-sm font-bold text-gray-600">Catálogo:</span>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded text-primary font-mono font-bold">
              /{catalogSlug}
            </code>
            <ExternalLink size={16} className="text-gray-400" />
          </Link>
        )}
      </header>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Receita Bruta"
          value={new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(totalRevenue)}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Pedidos"
          value={orders.count || 0}
          icon={ShoppingBag}
          color="blue"
        />
        <StatCard
          title="Clientes"
          value={clients.count || 0}
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Produtos Ativos"
          value={products.count || 0}
          icon={Package}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
        <div className="xl:col-span-2 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm min-h-[400px]">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <LayoutDashboard size={18} className="text-primary" /> Desempenho de
            Vendas
          </h3>
          <DashboardCharts orders={chartData.data || []} />
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm h-fit">
          <h3 className="font-bold text-slate-800 mb-4 uppercase text-xs tracking-widest text-gray-400">
            Ações Rápidas
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <QuickActionCard
              href="/dashboard/products/new"
              icon={PlusCircle}
              label="Novo Produto"
              color="orange"
            />
            <QuickActionCard
              href="/dashboard/products/import-massa"
              icon={FileSpreadsheet}
              label="Importar Massa"
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
              icon={SettingsIcon}
              label="Ajustes"
              color="slate"
            />
          </div>
        </div>
      </div>

      {/* Tabela de Pedidos Recentes */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <ShoppingBag size={18} className="text-primary" /> Pedidos Recentes
          </h3>
          <Link
            href="/dashboard/orders"
            className="text-sm font-bold text-primary hover:underline"
          >
            Ver todos
          </Link>
        </div>
        <div className="overflow-x-auto">
          <RecentOrdersTable orders={recentOrders.data || []} />
        </div>
      </div>
    </div>
  );
}

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
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-primary/30 hover:shadow-lg transition-all duration-300"
    >
      <div className={`p-3 rounded-full bg-white shadow-sm text-${color}-600`}>
        <Icon size={20} />
      </div>
      <span className="text-[10px] font-black uppercase tracking-tight text-gray-600 text-center">
        {label}
      </span>
    </Link>
  );
}
