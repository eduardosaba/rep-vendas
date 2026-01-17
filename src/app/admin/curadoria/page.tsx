// Simplified client-side Curadoria page (stats + toggle + impersonate)
'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  XCircle,
  Database,
  Eye,
  Search,
  Loader2,
} from 'lucide-react';

type StatRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  can_be_clone_source: boolean | null;
  total_products: number | null;
  brands_list: string | null;
};

export default function CuradoriaPage() {
  const [stats, setStats] = useState<StatRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [propagateModalOpen, setPropagateModalOpen] = useState(false);
  const [propagateProductId, setPropagateProductId] = useState('');
  const [propagateSubmitting, setPropagateSubmitting] = useState(false);
  const [callerRole, setCallerRole] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoading(true);
    try {
      // obtain auth token from session endpoint and forward it to the admin API
      const supResp = await fetch('/api/auth/session');
      const supJson = await supResp.json().catch(() => ({}));
      const token = supJson?.access_token || null;
      const res = await fetch('/api/admin/users-catalog-stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || 'Erro ao buscar estatísticas');
      }
      const json = await res.json();
      let data = json.data || [];
      // Fallback: se não houver dados (ex: RPC retornou vazio por auth),
      // tentamos buscar lista de usuários via rota administrativa que usa service role.
      if ((!data || data.length === 0) && res.ok) {
        try {
          const listRes = await fetch('/api/admin/list-users');
          if (listRes.ok) {
            const listJson = await listRes.json();
            // Mapear para o formato StatRow com valores padrão
            data = (listJson || []).map((u: any) => ({
              user_id: u.id,
              full_name: u.full_name || '—',
              email: u.email || null,
              role: null,
              can_be_clone_source: false,
              total_products: 0,
              brands_list: '',
            }));
          }
        } catch (e) {
          // silent
        }
      }

      setStats(data || []);
      setCallerRole(json.callerRole || null);
    } catch (err) {
      console.error('fetchStats error', err);
      setStats([]);
    } finally {
      setLoading(false);
    }
  }

  async function toggleSource(userId: string, current: boolean | undefined) {
    try {
      const supResp = await fetch('/api/auth/session');
      const supJson = await supResp.json().catch(() => ({}));
      const token = supJson?.access_token || null;
      if (!token)
        return toast.error('Você precisa estar logado como admin/master');

      setStats((prev) =>
        prev.map((s) =>
          s.user_id === userId ? { ...s, can_be_clone_source: !current } : s
        )
      );

      const res = await fetch('/api/admin/set-clone-source', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, canBeSource: !current }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('toggle error', j);
        toast.error(j.error || 'Erro ao atualizar');
        setStats((prev) =>
          prev.map((s) =>
            s.user_id === userId
              ? { ...s, can_be_clone_source: current ?? null }
              : s
          )
        );
      } else {
        fetchStats();
      }
    } catch (err) {
      console.error('toggle exception', err);
      toast.error('Erro ao atualizar');
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      const supResp = await fetch('/api/auth/session');
      const supJson = await supResp.json().catch(() => ({}));
      const token = supJson?.access_token || null;
      if (!token)
        return toast.error('Você precisa estar logado como admin/master');

      const res = await fetch('/api/admin/set-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, newRole }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(j.error || 'Erro ao atualizar papel');
      } else {
        toast.success('Papel atualizado!');
        router.refresh();
      }
    } catch (err) {
      console.error('handleRoleChange error', err);
      toast.error('Erro ao atualizar papel');
    }
  }

  async function handleImpersonate(targetUserId: string) {
    setLoading(true);
    try {
      const supResp = await fetch('/api/auth/session');
      const supJson = await supResp.json().catch(() => ({}));
      const token = supJson?.access_token || null;
      if (!token)
        return toast.error('Você precisa estar logado como admin/master');

      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId }),
      });
      if (res.ok) {
        toast.success('Entrando no dashboard do usuário...');
        router.push('/dashboard');
      } else {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error || 'Erro ao tentar visualizar como usuário.');
      }
    } catch (err) {
      console.error('impersonate error', err);
      toast.error('Erro ao tentar visualizar como usuário.');
    } finally {
      setLoading(false);
    }
  }

  async function propagateConfirm() {
    if (!propagateProductId)
      return toast.error('Cole o ID do produto template');
    setPropagateSubmitting(true);
    try {
      const promise = (async () => {
        const supResp = await fetch('/api/auth/session');
        const supJson = await supResp.json().catch(() => ({}));
        const token = supJson?.access_token || null;
        if (!token)
          throw new Error('Você precisa estar logado como admin/master');

        const res = await fetch('/api/admin/sync-product-inactivation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ templateProductId: propagateProductId }),
        });

        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error || 'Erro ao propagar inativação');
        return j.affected ?? 0;
      })();

      const affected = await toast.promise(promise, {
        loading: 'Propagando inativação...',
        success: (val) => `Inativados: ${val} clones`,
        error: (err) => err?.message || 'Erro ao propagar inativação',
      });

      setPropagateModalOpen(false);
      fetchStats();
      return affected;
    } catch (err: any) {
      console.error('propagate exception', err);
      // toast.promise already shows error, but ensure fallback
      if (!(err instanceof Error && err.message))
        toast.error('Erro ao propagar inativação');
    } finally {
      setPropagateSubmitting(false);
    }
  }

  const filtered = stats.filter((s) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      (s.full_name || '').toLowerCase().includes(q) ||
      (s.brands_list || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">
          Curadoria — Bibliotecas de Marcas
        </h1>
        <div>
          {propagateModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className="absolute inset-0 bg-black/40"
                onClick={() => setPropagateModalOpen(false)}
              />
              <div className="relative w-full max-w-md mx-4 bg-white dark:bg-slate-900 rounded-lg p-6 shadow-lg">
                <h3 className="text-lg font-semibold mb-2">
                  Propagar Inativação
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Cole o ID do produto template que deseja inativar os clones.
                </p>
                <input
                  value={propagateProductId}
                  onChange={(e) => setPropagateProductId(e.target.value)}
                  placeholder="ID do produto template"
                  className="w-full p-2 border rounded mb-4 bg-gray-50 dark:bg-slate-800"
                />
                <div className="flex justify-end gap-2">
                  <button
                    className="px-3 py-2 rounded bg-gray-100"
                    onClick={() => setPropagateModalOpen(false)}
                    disabled={propagateSubmitting}
                  >
                    Cancelar
                  </button>
                  <button
                    className="px-3 py-2 rounded bg-red-600 text-white"
                    onClick={propagateConfirm}
                    disabled={propagateSubmitting}
                  >
                    {propagateSubmitting ? (
                      <span className="inline-flex items-center">
                        <Loader2 className="animate-spin mr-2" size={16} />
                        Enviando...
                      </span>
                    ) : (
                      'Confirmar'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
          <button
            className="px-3 py-2 rounded bg-slate-100 border"
            onClick={fetchStats}
          >
            Atualizar
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-3 text-gray-400" size={18} />
          <input
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-gray-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            placeholder="Buscar por representante ou marca..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Representante</th>
              <th className="p-3 text-left">Categoria</th>
              <th className="p-3 text-left">Conteúdo do Catálogo</th>
              <th className="p-3 text-left">Status de Fonte</th>
              <th className="p-3 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-6 text-center">
                  <Loader2 className="animate-spin mx-auto text-indigo-500" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center">
                  Nenhum usuário encontrado
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.user_id} className="border-t">
                  <td className="p-3">
                    <div className="font-bold text-gray-900">
                      {item.full_name || '—'}
                    </div>
                    <div className="text-xs text-gray-400">{item.email}</div>
                  </td>
                  <td className="p-3">
                    <select
                      className="text-sm border rounded p-1 bg-white"
                      value={
                        item.role === 'representative'
                          ? 'rep'
                          : item.role || 'rep'
                      }
                      onChange={(e) =>
                        handleRoleChange(item.user_id, e.target.value)
                      }
                    >
                      <option value="rep">Representante</option>
                      <option value="template">Template</option>
                      <option value="master">Master</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Database size={14} className="text-gray-300" />
                      <span className="font-bold text-gray-700">
                        {item.total_products ?? 0}
                      </span>
                      <span className="text-xs text-gray-400">itens</span>
                    </div>
                    <div className="text-xs text-gray-400 max-w-[200px] truncate mt-1">
                      {item.brands_list || 'Nenhuma marca cadastrada'}
                    </div>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() =>
                        toggleSource(item.user_id, !!item.can_be_clone_source)
                      }
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${item.can_be_clone_source ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}
                    >
                      {item.can_be_clone_source ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <XCircle size={16} />
                      )}
                      <span className="text-xs font-bold uppercase tracking-tighter">
                        {item.can_be_clone_source ? 'Fonte Ativa' : 'Inativo'}
                      </span>
                    </button>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {item.role === 'template' && (
                        <button
                          onClick={() => {
                            setPropagateProductId('');
                            setPropagateModalOpen(true);
                          }}
                          className="px-3 py-2 rounded-xl bg-red-50 text-red-600 border border-red-100 text-xs"
                          title="Propagar Inativação"
                        >
                          Propagar Inativação
                        </button>
                      )}

                      <button
                        onClick={() => handleImpersonate(item.user_id)}
                        className="p-3 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                        title="Visualizar como este Usuário"
                      >
                        <Eye size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
