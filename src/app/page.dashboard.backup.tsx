import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StatCard } from '@/components/StatCard';
import { SalesBarChart } from '@/components/dashboard/SalesBarChart';
import RecentOrdersTable from '@/components/RecentOrdersTable';
import {
  DollarSign,
  ShoppingBag,
  Package,
  ShoppingCart,
  AlertCircle,
  ExternalLink,
  PlusCircle,
  FileSpreadsheet,
} from 'lucide-react';

// Evita cache para dados em tempo real
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();

  // 1. Autenticação
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // --- HELPER PARA SEGURANÇA DE DADOS ---
  async function safeFetch<T>(
    promise: Promise<any>,
    fallbackValue: T
  ): Promise<T> {
    try {
      const result = await promise;
      if (result.error) {
        console.error('Erro no DB:', result.error.message);
        return fallbackValue;
      }
      return result;
    } catch (err) {
      console.error('Erro crítico:', err);
      return fallbackValue;
    }
  }

  // 2. Buscas de Dados em Paralelo
  // Usamos Promise.all para carregar tudo de uma vez e ser mais rápido
  const [
    rpcResult,
    productsResult,
    ordersResult,
    recentOrdersResult,
    settingsResult,
    profileResult,
    chartOrdersResult, // Nova query para o gráfico
  ] = await Promise.all([
    // A. Totais RPC
    safeFetch(
      supabase
        .rpc('get_dashboard_totals', { owner_id: user.id })
        .maybeSingle() as unknown as Promise<any>,
      { data: { total_revenue: 0, total_items_sold: 0 } }
    ),

    // B. Contagem de Produtos
    safeFetch(
      supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id) as unknown as Promise<any>,
      { count: 0 }
    ),

    // C. Contagem de Pedidos
    safeFetch(
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id) as unknown as Promise<any>,
      { count: 0 }
    ),

    // D. Pedidos Recentes
    safeFetch(
      supabase
        .from('orders')
        .select(
          'id, display_id, client_name_guest, total_value, status, created_at, item_count, pdf_url'
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5) as unknown as Promise<any>,
      { data: [] }
    ),

    // E. Configurações (Slug)
    safeFetch(
      supabase
        .from('settings')
        .select('catalog_slug, name')
        .eq('user_id', user.id)
        .maybeSingle() as unknown as Promise<any>,
      { data: { catalog_slug: '', name: '' } }
    ),

    // F. Perfil (Nome do usuário)
    safeFetch(
      supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle() as unknown as Promise<any>,
      { data: { full_name: '' } }
    ),

    // G. Dados para o Gráfico (Últimos 6 meses)
    safeFetch(
      supabase
        .from('orders')
        .select('total_value, created_at')
        .eq('user_id', user.id)
        .gte(
          'created_at',
          new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString()
        ) // Pega dos últimos 6 meses
        .order('created_at', { ascending: true }) as unknown as Promise<any>,
      { data: [] }
    ),
  ]);

  // 3. Processamento dos Dados
  const rawTotals = rpcResult.data as any;
  const totalRevenue = Number(rawTotals?.total_revenue || 0);
  const totalItems = Number(rawTotals?.total_items_sold || 0);

  const productsCount = productsResult.count || 0;
  const ordersCount = ordersResult.count || 0;
  const recentOrders = recentOrdersResult.data || [];
  const catalogSlug = settingsResult.data?.catalog_slug || '';
  const storeName = settingsResult.data?.name || 'Sua Loja';
  const userName =
    profileResult.data?.full_name?.split(' ')[0] || 'Empreendedor';

  // 4. Lógica do Gráfico (Agregação Dinâmica)
  const processChartData = () => {
    const rawData = chartOrdersResult.data || [];
    const monthsMap = new Map<string, number>();
    const today = new Date();

    // Inicializa os últimos 6 meses com 0
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthLabel = d.toLocaleString('pt-BR', { month: 'short' }); // "jan", "fev"
      // Formata a chave para ser única e ordenável se virar o ano (não exibida, apenas lógica)
      // Mas para o gráfico simples, usamos o Label direto. Se tiver nomes repetidos (jan e jan), o gráfico soma.
      // O ideal é usar o label visual:
      const label = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1); // "Jan"
      monthsMap.set(label, 0);
    }

    // Soma os valores reais do banco
    rawData.forEach((order: any) => {
      const date = new Date(order.created_at);
      const monthLabel = date.toLocaleString('pt-BR', { month: 'short' });
      const label = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

      if (monthsMap.has(label)) {
        monthsMap.set(
          label,
          (monthsMap.get(label) || 0) + Number(order.total_value)
        );
      }
    });

    // Converte Map para Array
    return Array.from(monthsMap.entries()).map(([name, vendas]) => ({
      name,
      vendas,
    }));
  };

  const chartData = processChartData();

  // 5. Renderização
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Cabeçalho de Boas Vindas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Olá, {userName} 👋
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Aqui está o resumo da <strong>{storeName}</strong> hoje.
          </p>
        </div>

        {/* Indicador de Status */}
        <div className="flex items-center gap-2 text-xs font-medium bg-white dark:bg-slate-900 px-3 py-1.5 rounded-full border border-gray-200 dark:border-slate-700 shadow-sm self-start md:self-auto">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-gray-600 dark:text-gray-300">
            Sistema Online
          </span>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          title="Pedidos Realizados"
          value={ordersCount}
          icon={ShoppingBag}
          color="blue"
        />
        <StatCard
          title="Itens Vendidos"
          value={totalItems}
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

      {/* Área Central: Gráfico e Ações */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Gráfico de Vendas */}
        <div className="lg:col-span-2 min-h-[350px]">
          <SalesBarChart data={chartData} />
        </div>

        {/* Acesso Rápido (Control Panel Style) */}
        <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col h-full">
          <div className="p-5 border-b border-gray-100 dark:border-slate-800">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertCircle size={18} className="text-primary" />
              Ações Rápidas
            </h3>
          </div>

          <div className="p-5 flex-1 flex flex-col gap-3 justify-center">
            <a
              href="/dashboard/products/new"
              className="group flex items-center gap-3 w-full rounded-lg bg-primary/5 dark:bg-primary/10 px-4 py-3 text-sm font-medium text-primary dark:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 transition border border-primary/10 dark:border-primary/20"
            >
              <div className="bg-white dark:bg-slate-800 p-1.5 rounded-md shadow-sm group-hover:scale-110 transition-transform">
                <PlusCircle
                  size={18}
                  className="text-primary dark:text-primary"
                />
              </div>
              Cadastrar Novo Produto
            </a>

            <a
              href="/dashboard/products/import-massa"
              className="group flex items-center gap-3 w-full rounded-lg bg-white dark:bg-slate-800 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition border border-gray-200 dark:border-slate-700"
            >
              <div className="bg-gray-100 dark:bg-slate-700 p-1.5 rounded-md group-hover:scale-110 transition-transform">
                <FileSpreadsheet
                  size={18}
                  className="text-gray-600 dark:text-gray-400"
                />
              </div>
              Importar via Excel
            </a>

            <a
              href={catalogSlug ? `/${catalogSlug}` : '#'}
              target="_blank"
              className={`group flex items-center gap-3 w-full rounded-lg px-4 py-3 text-sm font-medium transition border ${
                catalogSlug
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-100'
              }`}
            >
              <div
                className={`p-1.5 rounded-md shadow-sm group-hover:scale-110 transition-transform ${catalogSlug ? 'bg-white dark:bg-slate-800' : 'bg-gray-200'}`}
              >
                <ExternalLink
                  size={18}
                  className={
                    catalogSlug
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-gray-400'
                  }
                />
              </div>
              {catalogSlug ? 'Visualizar Loja Online' : 'Loja não configurada'}
            </a>
          </div>
        </div>
      </div>

      {/* Tabela de Pedidos */}
      <div className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Últimos Pedidos
          </h3>
          <a
            href="/dashboard/orders"
            className="text-sm text-primary hover:underline"
          >
            Ver todos
          </a>
        </div>
        <RecentOrdersTable orders={recentOrders} />
      </div>
    </div>
  );
}
