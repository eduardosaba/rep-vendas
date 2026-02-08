import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import {
  Users,
  Package,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Image as ImageIcon,
  Calendar,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface ImportDashboardRow {
  user_id: string;
  full_name: string | null;
  email: string;
  role: string;
  total_products: number;
  images_pending: number;
  images_error: number;
  images_synced: number;
  last_import: string | null;
  total_imports: number;
  last_import_items: number | null;
  last_import_brands: string | null;
}

export default async function AdminImportDashboardPage() {
  const supabase = await createClient();

  // Verificar se é admin/master
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !['admin', 'master'].includes(profile.role)) {
    return redirect('/dashboard');
  }

  // Buscar dados da view
  const { data: stats, error } = await supabase
    .from('v_admin_import_dashboard')
    .select('*')
    .order('last_import', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('Error fetching import dashboard:', error);
  }

  const dashboardData = (stats || []) as ImportDashboardRow[];

  // Calcular totais gerais
  const totals = dashboardData.reduce(
    (acc, row) => ({
      products: acc.products + (row.total_products || 0),
      pending: acc.pending + (row.images_pending || 0),
      errors: acc.errors + (row.images_error || 0),
      synced: acc.synced + (row.images_synced || 0),
    }),
    { products: 0, pending: 0, errors: 0, synced: 0 }
  );

  const activeUsers = dashboardData.filter((r) => r.total_products > 0).length;

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <TrendingUp size={24} className="text-primary" />
          Status de Importações
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Monitoramento de catálogos e sincronização de imagens
        </p>
      </div>

      {/* Totais Gerais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Users size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Usuários Ativos
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {activeUsers}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Package
                size={20}
                className="text-green-600 dark:text-green-400"
              />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Total Produtos
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totals.products.toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <Clock size={20} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Imgs Pendentes
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totals.pending.toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <AlertCircle
                size={20}
                className="text-red-600 dark:text-red-400"
              />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Imgs c/ Erro
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totals.errors.toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-slate-800">
          <h2 className="font-bold text-gray-900 dark:text-white">
            Detalhamento por Representante
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Representante
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Produtos
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle size={12} />
                    Sincronizadas
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-1">
                    <Clock size={12} />
                    Pendentes
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-1">
                    <AlertCircle size={12} />
                    Erros
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Última Importação
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
              {dashboardData.map((row) => {
                const syncRate =
                  row.total_products > 0
                    ? Math.round((row.images_synced / row.total_products) * 100)
                    : 0;

                return (
                  <tr
                    key={row.user_id}
                    className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {row.full_name || row.email}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {row.email}
                        </p>
                        {row.last_import_brands && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {row.last_import_brands}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {row.total_products.toLocaleString('pt-BR')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={`text-sm font-semibold ${
                            syncRate >= 80
                              ? 'text-green-600 dark:text-green-400'
                              : syncRate >= 50
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {row.images_synced}
                        </span>
                        <span className="text-xs text-gray-400">
                          {syncRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-sm font-semibold ${
                          row.images_pending > 0
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-gray-400 dark:text-gray-600'
                        }`}
                      >
                        {row.images_pending}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-sm font-semibold ${
                          row.images_error > 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-400 dark:text-gray-600'
                        }`}
                      >
                        {row.images_error}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.last_import ? (
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-900 dark:text-white">
                              {new Date(row.last_import).toLocaleDateString(
                                'pt-BR'
                              )}
                            </p>
                            {row.last_import_items && (
                              <p className="text-xs text-gray-400">
                                {row.last_import_items} itens
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Nunca</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {dashboardData.length === 0 && (
            <div className="text-center py-12">
              <ImageIcon
                size={48}
                className="mx-auto text-gray-300 dark:text-gray-700 mb-2"
              />
              <p className="text-gray-500 dark:text-gray-400">
                Nenhum dado de importação disponível
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
