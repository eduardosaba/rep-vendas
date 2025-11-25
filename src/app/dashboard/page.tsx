'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { StatCard } from '@/components/StatCard';
import { SalesBarChart } from '@/components/dashboard/SalesBarChart';
import RecentOrdersTable from '@/components/RecentOrdersTable';
import { DollarSign, ShoppingBag, Users, Package, Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    revenue: 0,
    ordersCount: 0,
    clientsCount: 0,
    productsCount: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // 1. VERIFICAÇÃO DE ONBOARDING (usar flag em profiles)
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('id', user.id)
            .single();

          if (profileError) throw profileError;

          // Se a flag for falsa (ou ausente), redireciona para onboarding
          if (!profile?.onboarding_completed) {
            router.push('/onboarding');
            return;
          }
        } catch (e) {
          console.error('Erro ao checar onboarding do usuário:', e);
        }

        const [{ data: orders }, { count: clientsCount }] = await Promise.all([
          supabase
            .from('orders')
            .select('id, total_value, status, created_at, client_name_guest')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('clients')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id),
        ] as any);

        const { count: productsCount } = (await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)) as any;

        const totalRevenue = (orders || []).reduce(
          (acc: number, order: any) => acc + (order.total_value || 0),
          0
        );

        setStats({
          revenue: totalRevenue,
          ordersCount: (orders && orders.length) || 0,
          clientsCount: clientsCount || 0,
          productsCount: productsCount || 0,
        });

        setRecentOrders((orders && orders.slice(0, 5)) || []);
      } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const chartData = [
    { name: 'Jan', vendas: 4000 },
    { name: 'Fev', vendas: 3000 },
    { name: 'Mar', vendas: 2000 },
    { name: 'Abr', vendas: 2780 },
    { name: 'Mai', vendas: 1890 },
    { name: 'Jun', vendas: 2390 },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Visão Geral</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Receita Total"
          value={new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(stats.revenue)}
          icon={DollarSign}
          color="green"
          trend={12}
        />
        <StatCard
          title="Pedidos"
          value={stats.ordersCount}
          icon={ShoppingBag}
          color="blue"
        />
        <StatCard
          title="Clientes"
          value={stats.clientsCount}
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Produtos"
          value={stats.productsCount}
          icon={Package}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SalesBarChart data={chartData} />
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-900">Acesso Rápido</h3>
          <div className="space-y-3">
            <button className="w-full rounded-lg bg-indigo-50 px-4 py-3 text-left text-sm font-medium text-indigo-700 hover:bg-indigo-100">
              + Novo Pedido Manual
            </button>
            <button className="w-full rounded-lg bg-gray-50 px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-100">
              + Adicionar Produto
            </button>
            <button className="w-full rounded-lg bg-gray-50 px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-100">
              Compartilhar Catálogo
            </button>
          </div>
        </div>
      </div>

      <RecentOrdersTable orders={recentOrders} />
    </div>
  );
}
