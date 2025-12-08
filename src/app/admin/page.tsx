import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Users, ShieldCheck, AlertTriangle, Edit } from 'lucide-react';

export default async function AdminDashboard() {
  const supabase = await createClient();

  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  const { count: activeLicenses } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('subscription_status', 'active');

  const { count: trialUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('subscription_status', 'trial');

  const { data: recentUsers } = await supabase
    .from('profiles')
    .select('*')
    .neq('role', 'master')
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">
        Visão Geral do Sistema
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-full">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">
              Total de Usuários
            </p>
            <h3 className="text-3xl font-bold text-gray-900">{totalUsers}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-green-50 text-green-600 rounded-full">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Licenças Ativas</p>
            <h3 className="text-3xl font-bold text-gray-900">
              {activeLicenses}
            </h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-orange-50 text-orange-600 rounded-full">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">
              Em Período de Teste
            </p>
            <h3 className="text-3xl font-bold text-gray-900">{trialUsers}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="font-bold text-gray-900">Usuários Recentes</h2>
          <button className="text-sm rv-text-primary hover:underline font-medium">
            Ver todos os representantes
          </button>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-6 py-3 font-medium">Usuário / Email</th>
              <th className="px-6 py-3 font-medium">Plano</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Cadastro</th>
              <th className="px-6 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {recentUsers?.map((user: any) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-gray-900">
                      {user.full_name || 'Sem nome'}
                    </p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="uppercase text-xs font-bold tracking-wider text-gray-600">
                    {user.plan || 'FREE'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {user.subscription_status === 'active' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Ativo
                    </span>
                  )}
                  {user.subscription_status === 'trial' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      Trial
                    </span>
                  )}
                  {(!user.subscription_status ||
                    user.subscription_status === 'cancelled' ||
                    user.subscription_status === 'past_due') && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Inativo
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {new Date(user.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="inline-flex p-2 hover:bg-gray-100 rounded-full text-gray-400 rv-text-primary-hover transition-colors"
                    title="Editar Licença"
                  >
                    <Edit size={18} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
