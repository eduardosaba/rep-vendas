import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StatCard } from '@/components/StatCard';
import { SalesBarChart } from '@/components/dashboard/SalesBarChart';
import RecentOrdersTable from '@/components/RecentOrdersTable';
import { DollarSign, ShoppingBag, Package, ShoppingCart } from 'lucide-react';
import type { DashboardTotals } from '@/lib/types';
import { isDashboardTotals } from '@/lib/validators';

// 🚀 OBRIGA O NEXT.JS A NÃO FAZER CACHE DESTA PÁGINA
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();

  // 1. Autenticação
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // 2. Verificação de Perfil (Agora sempre fresca do banco)
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single();

  // Se por algum motivo o perfil não existir ou onboarding for false
  if (!profile || !profile.onboarding_completed) {
    redirect('/onboarding');
  }

  // 3. Busca de Dados em Paralelo
  const [
    totalsResult,
    productsCountResult,
    ordersCountResult,
    recentOrdersResult,
    settingsResult,
  ] = await Promise.all([
    supabase.rpc('get_dashboard_totals', { owner_id: user.id }).single(),
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('orders')
      .select(
        'id, display_id, client_name_guest, total_value, status, created_at, item_count'
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('settings')
      .select('catalog_slug')
      .eq('user_id', user.id)
      .single(),
  ]);

  // Validação runtime do retorno da RPC para evitar casts inseguros.
  const rawTotals = totalsResult.data as unknown;
  let total_revenue = 0;
  let total_items_sold = 0;

  if (isDashboardTotals(rawTotals)) {
    // valores já são number
    total_revenue = rawTotals.total_revenue;
    total_items_sold = rawTotals.total_items_sold;
  } else if (rawTotals && typeof rawTotals === 'object') {
    // tenta extrair/normalizar mesmo que os tipos venham como string
    const maybeRev = (rawTotals as any).total_revenue;
    const maybeItems = (rawTotals as any).total_items_sold;
    total_revenue = Number(maybeRev) || 0;
    total_items_sold = Number(maybeItems) || 0;
  }
  const productsCount = productsCountResult.count || 0;
  const ordersCount = ordersCountResult.count || 0;
  const recentOrders = recentOrdersResult.data || [];
  const catalogSlug = settingsResult.data?.catalog_slug || '';

  const chartData = [
    { name: 'Jan', vendas: 4000 },
    { name: 'Fev', vendas: 3000 },
    { name: 'Mar', vendas: 2000 },
    { name: 'Abr', vendas: 2780 },
    { name: 'Mai', vendas: 1890 },
    { name: 'Jun', vendas: 4000 + (Number(total_revenue) || 0) },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Visão Geral</h1>
        <p className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full">
          Dados em tempo real
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Receita Total"
          value={new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(Number(total_revenue))}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Pedidos Realizados"
          value={ordersCount}
          icon={ShoppingBag}
          color="blue"
        />
        <StatCard
          title="Itens Vendidos"
          value={Number(total_items_sold)}
          icon={ShoppingCart}
          color="purple"
        />
        <StatCard
          title="Produtos Ativos"
          value={productsCount}
          icon={Package}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SalesBarChart data={chartData} />
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm flex flex-col justify-center">
          <h3 className="mb-4 font-semibold text-gray-900">Acesso Rápido</h3>
          <div className="space-y-3">
            <a
              href="/dashboard/products/new"
              className="block w-full rounded-lg bg-indigo-50 px-4 py-3 text-left text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition"
            >
              + Novo Produto
            </a>
            <a
              href="/dashboard/products/import-massa"
              className="block w-full rounded-lg bg-gray-50 px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
            >
              Importar Excel
            </a>
            <a
              href={catalogSlug ? `/catalog/${catalogSlug}` : '#'}
              target="_blank"
              className="block w-full rounded-lg bg-green-50 px-4 py-3 text-left text-sm font-medium text-green-700 hover:bg-green-100 transition border border-green-100"
            >
              Ver Minha Loja Pública ↗
            </a>
          </div>
        </div>
      </div>

      <RecentOrdersTable orders={recentOrders} />
    </div>
  );
}
