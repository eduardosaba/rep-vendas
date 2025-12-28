import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  DollarSign,
  Package,
  Activity,
  ArrowUpRight,
  Shield,
  CreditCard,
  ChevronRight,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // 1. SEGURANÇA: Verificar se é Admin/Master
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: currentUserProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAllowed =
    currentUserProfile?.role === 'admin' ||
    currentUserProfile?.role === 'master';

  if (!isAllowed) {
    // Redireciona usuários comuns para a área deles
    redirect('/dashboard');
  }

  // 2. BUSCAR DADOS (Em paralelo para performance)
  const [usersReq, productsReq, subscriptionsReq, recentUsersReq] =
    await Promise.all([
      // Contagem de Usuários
      supabase.from('profiles').select('*', { count: 'exact', head: true }),

      // Contagem de Produtos
      supabase.from('products').select('*', { count: 'exact', head: true }),

      // Cálculo de Receita (MRR) - Apenas assinaturas ativas
      supabase.from('subscriptions').select('price').eq('status', 'active'),

      // Lista de Usuários Recentes
      supabase
        .from('profiles')
        .select('id, email, created_at, role, full_name')
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

  // 3. PROCESSAR DADOS
  const usersCount = usersReq.count || 0;
  const productsCount = productsReq.count || 0;

  // Calcula o MRR somando os preços das assinaturas ativas
  const mrr =
    subscriptionsReq.data?.reduce(
      (acc, sub) => acc + (Number(sub.price) || 0),
      0
    ) || 0;

  const recentUsers = recentUsersReq.data || [];

  return (
    <div className="p-6 md:p-8 animate-in fade-in duration-500 min-h-screen space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Torre de Controle <span className="text-2xl">🏰</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Visão geral em tempo real do ecossistema SaaS.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-3 py-1 rounded-full">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          SISTEMA ONLINE
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Usuários */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
              Usuários Totais
            </h3>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
              <Users size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {usersCount}
            </p>
            {/* Exemplo de indicador de crescimento estático */}
            <span className="text-xs font-medium text-green-600 flex items-center">
              <ArrowUpRight size={12} /> +12%
            </span>
          </div>
        </div>

        {/* Card 2: Produtos */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
              Produtos Cadastrados
            </h3>
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg">
              <Package size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {productsCount}
          </p>
        </div>

        {/* Card 3: MRR (Receita) */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <DollarSign size={80} />
          </div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-gray-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
              Receita Mensal (MRR)
            </h3>
            <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg">
              <CreditCard size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white relative z-10">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(mrr)}
          </p>
        </div>

        {/* Card 4: Status / Saúde */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
              Saúde do Sistema
            </h3>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <Activity size={20} />
            </div>
          </div>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            Excelente
          </p>
          <p className="text-xs text-gray-400 mt-1">Uptime: 99.9% (30d)</p>
        </div>
      </div>

      {/* SEÇÃO PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LISTA DE USUÁRIOS RECENTES */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-950/30">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users size={18} className="text-indigo-600" /> Novos Usuários
            </h3>
            <Link
              href="/admin/users"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 hover:underline"
            >
              Ver todos <ChevronRight size={12} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-slate-950/50 text-gray-500 dark:text-slate-400 font-medium">
                <tr>
                  <th className="px-6 py-3">Usuário</th>
                  <th className="px-6 py-3">Data</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {recentUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {u.full_name || 'Sem nome'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {u.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-slate-400 whitespace-nowrap">
                      {u.created_at
                        ? new Date(u.created_at).toLocaleDateString('pt-BR')
                        : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                          u.role === 'admin' || u.role === 'master'
                            ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800'
                            : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}
                      >
                        {u.role || 'user'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {/* Botão GERENCIAR (Leva para a página de detalhes completa) */}
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-white bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-lg transition-colors inline-block"
                      >
                        Gerenciar
                      </Link>
                    </td>
                  </tr>
                ))}
                {recentUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500">
                      Nenhum usuário recente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SIDEBAR WIDGETS */}
        <div className="space-y-6">
          {/* Widget: Ações Rápidas */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-sm uppercase tracking-wider">
              Acesso Rápido
            </h3>
            <div className="space-y-3">
              <Link
                href="/admin/users"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-slate-700 group"
              >
                <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 p-2 rounded-lg group-hover:scale-110 transition-transform">
                  <Users size={18} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    Criar Usuário
                  </div>
                  <div className="text-xs text-gray-500">
                    Adicionar manualmente
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-400" />
              </Link>

              <Link
                href="/admin/plans"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-slate-700 group"
              >
                <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 p-2 rounded-lg group-hover:scale-110 transition-transform">
                  <CreditCard size={18} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    Editar Planos
                  </div>
                  <div className="text-xs text-gray-500">
                    Ajustar preços/limites
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-400" />
              </Link>

              {/* Debug desabilitado temporariamente - usa fs que não funciona em build
                    <Link href="/admin/debug" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-slate-700 group">
                        <div className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 p-2 rounded-lg group-hover:scale-110 transition-transform">
                            <Shield size={18} />
                        </div>
                        <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">System Logs</div>
                            <div className="text-xs text-gray-500">Depurar erros</div>
                        </div>
                        <ChevronRight size={16} className="text-gray-400" />
                    </Link>
                    */}
            </div>
          </div>

          {/* Widget: Status Financeiro Simples */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="font-bold text-indigo-100 text-sm mb-1">
                Previsão Mensal
              </h3>
              <p className="text-2xl font-bold mb-4">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(mrr * 1)}
              </p>
              <div className="w-full bg-white/20 rounded-full h-1.5 mb-2">
                <div
                  className="bg-white h-1.5 rounded-full"
                  style={{ width: '75%' }}
                ></div>
              </div>
              <p className="text-xs text-indigo-200">
                Meta do mês: 75% atingida
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
