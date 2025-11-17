'use client';

import { useEffect, useState, FormEvent } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import StatCard from '../../components/StatCard';
import SalesBarChart from '../../components/SalesBarChart';
import RecentOrdersTable from '../../components/RecentOrdersTable';
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  Plus,
  Settings,
  Eye,
  Building2,
} from 'lucide-react';

interface User {
  id: string;
  email?: string;
}

interface Settings {
  primary_color?: string;
}

interface Stats {
  receitaTotal: number;
  totalPedidos: number;
  numClientes: number;
  numProdutos: number;
  pedidosPendentes?: number;
  pedidosCompletos?: number;
  pedidosCatalogo?: number;
}

interface SalesData {
  name: string;
  vendas: number;
}

interface RecentOrder {
  id: string;
  client: string;
  total: string;
  status: string;
  type?: string;
  date: string;
  items?: number;
}

interface BrandItem {
  brand: string;
  quantity: string;
  value?: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const [showModal, setShowModal] = useState<boolean>(false);
  const [client, setClient] = useState<string>('');
  const [brandItems, setBrandItems] = useState<BrandItem[]>([
    { brand: '', quantity: '', value: '' },
  ]);
  const [settings, setSettings] = useState<Settings>({});
  const [stats, setStats] = useState<Stats>({
    receitaTotal: 0,
    totalPedidos: 0,
    numClientes: 0,
    numProdutos: 0,
  });
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        setUser(user);
        loadDashboardData(user.id);
        loadSettings();
      }
    };
    getUser();
  }, [router]);

  const loadSettings = async () => {
    const { data: sets } = await supabase
      .from('settings')
      .select('primary_color')
      .limit(1);
    if (sets && sets.length > 0) {
      setSettings(sets[0]);
    }
  };

  const loadDashboardData = async (userId: string) => {
    // Buscar stats
    const { data: clients } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', userId);
    const { data: products } = await supabase
      .from('products')
      .select('id')
      .eq('user_id', userId);
    const { data: orders } = await supabase
      .from('orders')
      .select('id, total_value, status, order_type')
      .eq('user_id', userId);

    const totalOrders = orders?.length || 0;
    const pendingOrders =
      orders?.filter((order) => order.status === 'Pendente').length || 0;
    const completedOrders =
      orders?.filter((order) => order.status === 'Completo').length || 0;
    const catalogOrders =
      orders?.filter((order) => order.order_type === 'catalog').length || 0;

    setStats({
      receitaTotal:
        orders?.reduce((sum, order) => sum + (order.total_value || 0), 0) || 0,
      totalPedidos: totalOrders,
      numClientes: clients?.length || 0,
      numProdutos: products?.length || 0,
      pedidosPendentes: pendingOrders,
      pedidosCompletos: completedOrders,
      pedidosCatalogo: catalogOrders,
    });

    // Buscar vendas por tipo de pedido
    const { data: salesByType } = await supabase
      .from('orders')
      .select('order_type, total_value, status')
      .eq('user_id', userId)
      .eq('status', 'Completo');

    const typeMap: { [key: string]: number } = {};
    salesByType?.forEach((order: any) => {
      const type =
        order.order_type === 'quick_brand'
          ? 'Pedido Rápido'
          : order.order_type === 'catalog'
            ? 'Catálogo'
            : 'Outro';
      if (type) {
        typeMap[type] = (typeMap[type] || 0) + (order.total_value || 0);
      }
    });

    setSalesData(
      Object.entries(typeMap).map(([name, vendas]) => ({
        name,
        vendas: vendas as number,
      }))
    );

    // Buscar pedidos recentes com mais detalhes
    const { data: recent } = await supabase
      .from('orders')
      .select(
        `
        id,
        created_at,
        total_value,
        status,
        order_type,
        clients (name),
        order_items (
          quantity,
          products (name)
        )
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    setRecentOrders(
      recent?.map((order) => ({
        id: order.id,
        client: (order.clients as any)?.name || 'Cliente não informado',
        total: `R$ ${order.total_value?.toFixed(2) || '0.00'}`,
        status: order.status,
        type:
          order.order_type === 'catalog'
            ? 'Catálogo'
            : order.order_type === 'quick_brand'
              ? 'Rápido'
              : order.order_type,
        date: new Date(order.created_at).toLocaleDateString('pt-BR'),
        items: (order.order_items as any[])?.length || 0,
      })) || []
    );
  };

  const addBrandItem = () => {
    setBrandItems([...brandItems, { brand: '', quantity: '', value: '' }]);
  };

  const removeBrandItem = (index: number) => {
    if (brandItems.length > 1) {
      setBrandItems(brandItems.filter((_, i) => i !== index));
    }
  };

  const updateBrandItem = (
    index: number,
    field: keyof BrandItem,
    value: string
  ) => {
    const updated = [...brandItems];
    updated[index] = { ...updated[index], [field]: value };
    setBrandItems(updated);
  };

  const handleNewOrder = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert('Usuário não autenticado');
        return;
      }

      // Criar cliente se informado
      let clientId = null;
      if (client.trim()) {
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            user_id: user.id,
            name: client.trim(),
          })
          .select()
          .single();

        if (clientError) throw clientError;
        clientId = newClient.id;
      }

      // Calcular total
      const totalValue = brandItems.reduce((total, item) => {
        const qty = parseInt(item.quantity) || 0;
        const val = item.value ? parseFloat(item.value.replace(',', '.')) : 100;
        return total + qty * val;
      }, 0);

      // Criar pedido
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          client_id: clientId,
          status: 'Pendente',
          total_value: totalValue,
          order_type: 'quick_brand',
          quick_brand: brandItems
            .map((item) => `${item.brand} (${item.quantity})`)
            .join(', '),
          quick_quantity: brandItems.reduce(
            (total, item) => total + (parseInt(item.quantity) || 0),
            0
          ),
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Criar notificação
      try {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            title: 'Novo Pedido Rápido Criado',
            message: `Pedido #${order.id.slice(-8).toUpperCase()} foi criado com sucesso. Valor: R$ ${totalValue.toFixed(2)}`,
            type: 'success',
            data: {
              orderId: order.id,
              orderNumber: order.id.slice(-8).toUpperCase(),
              totalValue: totalValue,
              clientName: client || 'Cliente não informado',
            },
          }),
        });
      } catch (notificationError) {
        console.error('Erro ao criar notificação:', notificationError);
      }

      // Fechar modal e resetar form
      setShowModal(false);
      setClient('');
      setBrandItems([{ brand: '', quantity: '', value: '' }]);

      // Recarregar dados do dashboard
      loadDashboardData(user.id);

      alert('Pedido criado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      alert('Erro ao criar pedido. Tente novamente.');
    }
  };

  if (!user) {
    return <div>Carregando...</div>;
  }

  const statCards = [
    {
      title: 'Receita Total',
      value: `R$ ${stats.receitaTotal.toFixed(2)}`,
      icon: <DollarSign className="h-6 w-6 text-gray-400" />,
    },
    {
      title: 'Total de Pedidos',
      value: stats.totalPedidos.toString(),
      icon: <ShoppingCart className="h-6 w-6 text-gray-400" />,
    },
    {
      title: 'Pedidos Pendentes',
      value: (stats.pedidosPendentes || 0).toString(),
      icon: <Package className="h-6 w-6 text-yellow-400" />,
    },
    {
      title: 'Pedidos do Catálogo',
      value: (stats.pedidosCatalogo || 0).toString(),
      icon: <Eye className="h-6 w-6 text-blue-400" />,
    },
    {
      title: 'Nº de Clientes',
      value: stats.numClientes.toString(),
      icon: <Users className="h-6 w-6 text-gray-400" />,
    },
    {
      title: 'Nº de Produtos',
      value: stats.numProdutos.toString(),
      icon: <Package className="h-6 w-6 text-gray-400" />,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Dashboard do Representante
            </h1>
            <p>Bem-vindo, {user.email}</p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => router.push(`/catalog/${user.id}`)}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Eye className="mr-2 h-5 w-5" />
              Ver Meu Catálogo
            </button>
            <button
              onClick={() => router.push('/dashboard/products')}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Package className="mr-2 h-5 w-5" />
              Gerenciar Produtos
            </button>
            <button
              onClick={() => router.push('/dashboard/brands')}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Building2 className="mr-2 h-5 w-5" />
              Gerenciar Marcas
            </button>
            <button
              onClick={() => router.push('/dashboard/clients')}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Users className="mr-2 h-5 w-5" />
              Gerenciar Clientes
            </button>
            <button
              onClick={() => router.push('/dashboard/orders')}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Package className="mr-2 h-5 w-5" />
              Gerenciar Pedidos
            </button>
            <button
              onClick={() => router.push('/settings')}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Settings className="mr-2 h-5 w-5" />
              Configurações
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              style={{ backgroundColor: settings?.primary_color || '#3B82F6' }}
            >
              <Plus className="mr-2 h-5 w-5" />
              Novo Pedido Rápido
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Link do Catálogo */}
          <div className="mb-8 overflow-hidden rounded-lg bg-white shadow">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Eye className="h-8 w-8 text-blue-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Link do Seu Catálogo
                    </dt>
                    <dd className="flex items-center">
                      <div className="mr-4 text-lg font-medium text-gray-900">
                        {typeof window !== 'undefined'
                          ? `${window.location.origin}/catalog/${user.id}`
                          : `/catalog/${user.id}`}
                      </div>
                      <button
                        onClick={() => {
                          const url =
                            typeof window !== 'undefined'
                              ? `${window.location.origin}/catalog/${user.id}`
                              : `/catalog/${user.id}`;
                          navigator.clipboard.writeText(url);
                          alert('Link copiado para a área de transferência!');
                        }}
                        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1 text-sm font-medium leading-4 text-gray-700 shadow-sm hover:bg-gray-50"
                      >
                        Copiar Link
                      </button>
                    </dd>
                  </dl>
                  <p className="mt-2 text-sm text-gray-600">
                    Compartilhe este link com seus clientes para que eles possam
                    acessar seu catálogo e fazer pedidos.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {statCards.map((stat, index) => (
              <StatCard
                key={index}
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
              />
            ))}
          </div>
          <div className="mb-8">
            <SalesBarChart data={salesData} />
          </div>
          <div>
            <RecentOrdersTable orders={recentOrders} />
          </div>
        </div>
      </main>

      {showModal && (
        <div
          className="fixed inset-0 z-50 h-full w-full overflow-y-auto bg-gray-600 bg-opacity-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative top-10 mx-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-md border bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mt-3">
              <h3 className="mb-6 text-lg font-medium text-gray-900">
                Novo Pedido Rápido
              </h3>

              <div className="space-y-6">
                {/* Cliente */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Cliente (Opcional)
                  </label>
                  <input
                    type="text"
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Nome do cliente"
                  />
                </div>

                {/* Marcas e Quantidades */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Marcas e Quantidades
                    </label>
                    <button
                      type="button"
                      onClick={addBrandItem}
                      className="inline-flex items-center rounded-md border border-transparent bg-green-600 px-3 py-1 text-sm font-medium leading-4 text-white hover:bg-green-700"
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Adicionar Marca
                    </button>
                  </div>

                  <div className="space-y-3">
                    {brandItems.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-3 rounded-lg border border-gray-200 bg-gray-50 p-4"
                      >
                        <div className="flex-1">
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            Marca
                          </label>
                          <input
                            type="text"
                            value={item.brand}
                            onChange={(e) =>
                              updateBrandItem(index, 'brand', e.target.value)
                            }
                            className="block w-full rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="Nome da marca"
                            required
                          />
                        </div>

                        <div className="w-24">
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            Qtd
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateBrandItem(index, 'quantity', e.target.value)
                            }
                            className="block w-full rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="0"
                            required
                          />
                        </div>

                        <div className="w-32">
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            Valor Unit. (Opcional)
                          </label>
                          <input
                            type="text"
                            value={item.value}
                            onChange={(e) =>
                              updateBrandItem(index, 'value', e.target.value)
                            }
                            className="block w-full rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="R$ 0,00"
                          />
                        </div>

                        {brandItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeBrandItem(index)}
                            className="mt-5 rounded p-1 text-red-600 hover:bg-red-50 hover:text-red-800"
                            title="Remover marca"
                          >
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Resumo do Total */}
                  <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-900">
                        Total Estimado:
                      </span>
                      <span className="text-lg font-bold text-blue-900">
                        R${' '}
                        {brandItems
                          .reduce((total, item) => {
                            const qty = parseInt(item.quantity) || 0;
                            const val = item.value
                              ? parseFloat(item.value.replace(',', '.'))
                              : 100;
                            return total + qty * val;
                          }, 0)
                          .toFixed(2)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-blue-700">
                      * Valores não informados usam estimativa de R$ 100,00 por
                      unidade
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setClient('');
                    setBrandItems([{ brand: '', quantity: '', value: '' }]);
                  }}
                  className="rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleNewOrder}
                  className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  style={{
                    backgroundColor: settings?.primary_color || '#3B82F6',
                  }}
                >
                  Criar Pedido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
