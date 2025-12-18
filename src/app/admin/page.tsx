import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import {
  Users,
  DollarSign,
  Package,
  AlertTriangle,
  BarChart2,
} from 'lucide-react';
// Importamos o componente de reset individual que criamos
import { AdminUserReset } from '@/components/admin/AdminUserReset';

export const dynamic = 'force-dynamic';

interface ProfileRecord {
  id: string;
  email?: string | null;
  created_at?: string | null;
  role?: string | null;
  full_name?: string | null;
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // 1. Verificar Segurança: O usuário logado é Admin?
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Opcional: Se quiser bloquear a visualização da página para não admins:
  /*
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!profile?.is_admin) return <div>Acesso Negado</div>;
  }
  */

  // 2. Buscar KPIs
  const { count: usersCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  const { count: productsCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  // 3. Buscar Lista de Usuários (Incluindo o ID para o reset funcionar)
  const { data: recentUsers } = await supabase
    .from('profiles')
    .select('id, email, created_at, role, full_name') // <--- O 'id' É FUNDAMENTAL AQUI
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <div className="p-6 md:p-8 animate-in fade-in duration-500 min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Torre de Controle 🏰
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Gerenciamento Master do SaaS.
        </p>
      </div>

      {/* KPIs - CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-slate-400 text-xs font-bold uppercase">
              Total Usuários
            </h3>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
              <Users size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {usersCount || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-slate-400 text-xs font-bold uppercase">
              Total Produtos
            </h3>
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg">
              <Package size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {productsCount || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-slate-400 text-xs font-bold uppercase">
              Receita (Est.)
            </h3>
            <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg">
              <DollarSign size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            R$ --,--
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-slate-400 text-xs font-bold uppercase">
              Status
            </h3>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <AlertTriangle size={20} />
            </div>
          </div>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            Saudável
          </p>
        </div>
      </div>

      {/* GRID DE CONTEÚDO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LISTA DE USUÁRIOS + AÇÕES */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
            <h3 className="font-bold text-gray-900 dark:text-white">
              Gerenciamento de Usuários
            </h3>
            <span className="text-xs bg-[var(--primary)]/10 dark:bg-[var(--primary)]/20 text-[var(--primary)] dark:text-[var(--primary)] px-2 py-1 rounded-full">
              Recentes
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-slate-950/50 text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3 font-medium">Usuário</th>
                  <th className="px-6 py-3 font-medium">Data</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium text-right text-red-500">
                    Zona de Perigo
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {recentUsers?.map((u: ProfileRecord) => (
                  <tr
                    key={u.id}
                    className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {u.full_name || 'Sem nome'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {u.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {u.created_at
                        ? new Date(u.created_at).toLocaleDateString('pt-BR')
                        : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold uppercase ${u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400'}`}
                      >
                        {u.role || 'user'}
                      </span>
                    </td>

                    {/* AQUI ESTÁ A SEGURANÇA: Passamos o ID específico desta linha */}
                    <td className="px-6 py-4 text-right">
                      <AdminUserReset
                        targetUserId={u.id}
                        targetUserEmail={u.email || 'Usuário'}
                      />
                    </td>
                  </tr>
                ))}

                {(!recentUsers || recentUsers.length === 0) && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-8 text-center text-gray-400 dark:text-slate-500"
                    >
                      Nenhum usuário encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PLACEHOLDER / FUTUROS GRÁFICOS */}
        <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-gray-300 dark:border-slate-700 flex flex-col items-center justify-center min-h-[300px] text-gray-400 dark:text-slate-500 p-6 text-center">
          <div className="p-4 bg-white dark:bg-slate-800 rounded-full mb-4 shadow-sm">
            <BarChart2 className="h-8 w-8 text-[var(--primary)]/60 dark:text-slate-600" />
          </div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-1">
            Métricas Avançadas
          </h4>
          <p className="text-sm">Em breve: Gráfico de MRR e Churn.</p>
        </div>
      </div>
    </div>
  );
}
