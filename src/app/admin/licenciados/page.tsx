'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, LogIn } from 'lucide-react';

export default function LicenciadosPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Record<string, any>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/list-users/paged?page=${currentPage}&limit=${perPage}`
        );
        const data = await res.json();
        if (!mounted) return;
        // API retorna { data, meta } ou apenas array
        const list = data?.data ?? data ?? [];
        setUsers(list);
        setTotalUsers((data?.meta?.totalCount as number) || list.length || 0);

        // fetch stats in parallel (but limited)
        const promises = (data || []).map(async (u: any) => {
          try {
            const r = await fetch(`/api/admin/user-stats?userId=${u.id}`);
            if (!r.ok) return { id: u.id, error: true };
            const j = await r.json();
            return { id: u.id, stats: j };
          } catch (e) {
            return { id: u.id, error: true };
          }
        });

        const results = await Promise.all(promises);
        if (!mounted) return;
        const map: Record<string, any> = {};
        results.forEach((r: any) => {
          if (r && r.id) map[r.id] = r.stats || null;
        });
        setStats(map);
      } catch (e) {
        toast.error('Erro ao carregar licenciados');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleImpersonate = (email: string) => {
    toast.info(`Impersonation: entrar como ${email}`);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lista de Clientes Pro</h1>
          <p className="text-sm text-gray-500">
            Visão rápida dos licenciados e histórico de clonagem
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-slate-950 text-gray-500 dark:text-slate-400 font-medium border-b border-gray-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Produtos</th>
                <th className="px-4 py-3">Marcas (próprias)</th>
                <th className="px-4 py-3">Marcas herdadas</th>
                <th className="px-4 py-3">Última clonagem</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <Loader2 className="animate-spin" /> Carregando...
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const s = stats[u.id] || {};
                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 font-bold">
                            {(u.full_name || u.email || '')[0]?.toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {u.full_name || u.email}
                            </div>
                            <div className="text-xs text-gray-400">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{s?.productCount ?? '-'}</td>
                      <td className="px-4 py-3">
                        {(s?.brands || []).slice(0, 3).join(', ') || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {(s?.inheritedBrands || []).slice(0, 3).join(', ') ||
                          '-'}
                      </td>
                      <td className="px-4 py-3">
                        {s?.lastCloneAt
                          ? new Date(s.lastCloneAt).toLocaleString()
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleImpersonate(u.email)}
                            className="px-3 py-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                          >
                            {' '}
                            <LogIn size={14} /> Impersonar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 flex items-center justify-between text-sm text-gray-600">
          <div>
            Mostrando {(currentPage - 1) * perPage + 1} -{' '}
            {Math.min(currentPage * perPage, totalUsers)} de {totalUsers}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded border"
            >
              Anterior
            </button>
            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={currentPage * perPage >= totalUsers}
              className="px-3 py-1 rounded border"
            >
              Próxima
            </button>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="ml-2 border rounded px-2 py-1"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} / página
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
