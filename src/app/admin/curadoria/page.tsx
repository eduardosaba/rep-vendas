// Simplified client-side Curadoria page (stats + toggle + impersonate)
'use client';

import React, { useEffect, useState } from 'react';
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
  user_category: string | null;
  can_be_clone_source: boolean | null;
  total_products: number | null;
  brands_list: string | null;
};

export default function CuradoriaPage() {
  const [stats, setStats] = useState<StatRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users-catalog-stats', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || 'Erro ao buscar estatísticas');
      }
      const json = await res.json();
      setStats(json.data || []);
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
      if (!token) return alert('Você precisa estar logado como admin/master');

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
        alert(j.error || 'Erro ao atualizar');
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
      alert('Erro ao atualizar');
    }
  }

  async function handleImpersonate(targetUserId: string) {
    setLoading(true);
    try {
      const supResp = await fetch('/api/auth/session');
      const supJson = await supResp.json().catch(() => ({}));
      const token = supJson?.access_token || null;
      if (!token) return alert('Você precisa estar logado como admin/master');

      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId }),
      });
      if (res.ok) {
        alert('Entrando no dashboard do usuário...');
        window.location.href = '/dashboard';
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j.error || 'Erro ao tentar visualizar como usuário.');
      }
    } catch (err) {
      console.error('impersonate error', err);
      alert('Erro ao tentar visualizar como usuário.');
    } finally {
      setLoading(false);
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
                    {item.user_category || 'representative'}
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
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                        item.can_be_clone_source
                          ? 'bg-green-50 text-green-600 border border-green-100'
                          : 'bg-gray-50 text-gray-400 border border-gray-100'
                      }`}
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
                    <button
                      onClick={() => handleImpersonate(item.user_id)}
                      className="p-3 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                      title="Visualizar como este Usuário"
                    >
                      <Eye size={20} />
                    </button>
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
