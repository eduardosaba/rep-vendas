import React from 'react';
import createClient from '@/lib/supabaseServer';
import { Users, DollarSign, Package, AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Buscar contagens rápidas (Métricas reais)
  const { count: usersCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });
  const { count: productsCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  // Buscar usuários recentes
  const { data: recentUsers } = await supabase
    .from('profiles')
    .select('email, created_at, role')
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Visão Geral</h1>
      <p className="text-gray-500 mb-8">
        Bem-vindo à torre de controle do sistema.
      </p>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-bold uppercase">
              Total Usuários
            </h3>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Users size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{usersCount || 0}</p>
          <span className="text-xs text-green-600 font-medium">+ Ativos</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-bold uppercase">
              Total Produtos
            </h3>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Package size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {productsCount || 0}
          </p>
          <span className="text-xs text-gray-500">Cadastrados no sistema</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-bold uppercase">
              Receita (Est.)
            </h3>
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <DollarSign size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">R$ --,--</p>
          <span className="text-xs text-gray-400">Implementar integração</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-bold uppercase">
              Erros/Logs
            </h3>
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <AlertTriangle size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">0</p>
          <span className="text-xs text-green-600">Sistema saudável</span>
        </div>
      </div>

      {/* Tabelas Rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">Novos Usuários</h3>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Data</th>
                <th className="px-6 py-3">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentUsers?.map((u: any, i: number) => (
                <tr key={i}>
                  <td className="px-6 py-3 font-medium text-gray-900">
                    {u.email}
                  </td>
                  <td className="px-6 py-3 text-gray-500">
                    {new Date(u.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {u.role || 'user'}
                    </span>
                  </td>
                </tr>
              ))}
              {(!recentUsers || recentUsers.length === 0) && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-4 text-center text-gray-400"
                  >
                    Nenhum usuário recente
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Espaço para Gráficos futuros ou Logs */}
        <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center min-h-[300px] text-gray-400">
          <BarChart2 className="mb-2 h-10 w-10 opacity-50" />
          <span>Gráfico de crescimento virá aqui</span>
        </div>
      </div>
    </div>
  );
}

// Necessário importar o ícone aqui para usar no componente de placeholder
import { BarChart2 } from 'lucide-react';
