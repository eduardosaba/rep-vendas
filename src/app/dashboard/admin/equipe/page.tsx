'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Link as LinkIcon, TrendingUp, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import ModalNovoRepresentante from '@/components/admin/equipe/ModalNovoRepresentante';

type TeamMember = {
  id: string;
  full_name: string | null;
  email: string | null;
  slug?: string | null;
  role: string | null;
  commission_rate?: number | null;
  can_manage_catalog: boolean | null;
};

type TeamMetrics = {
  period_start: string;
  month_sales_total: number;
  month_commission_total: number;
  by_member: Record<
    string,
    {
      month_sales: number;
      month_commission: number;
      month_orders: number;
    }
  >;
};

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0));
}

function initials(name: string | null, email: string | null) {
  const source = (name || email || 'U').trim();
  const parts = source.split(' ').filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white p-6 rounded-[1.5rem] border border-slate-100 flex items-center gap-5">
      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-700">{icon}</div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}

export default function TeamManagementPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [slug, setSlug] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<TeamMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const loadTeam = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/company/team', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Falha ao carregar equipe');
      }
      setMembers((json.data || []) as TeamMember[]);
      setMetrics((json.metrics || null) as TeamMetrics | null);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao carregar equipe');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeam();
    (async () => {
      try {
        const res = await fetch('/api/companies/me');
        const json = await res.json();
        if (json?.success && json?.data) setSlug(json.data.catalog_slug || json.data.slug || null);
      } catch {
        // ignore
      }
    })();
  }, []);

  const totalTeam = members.length;
  const activeLinks = useMemo(() => members.filter((m) => Boolean(m.slug)).length, [members]);
  const monthSales = Number(metrics?.month_sales_total || 0);
  const monthCommission = Number(metrics?.month_commission_total || 0);

  const handleCreateRepresentative = async (payload: {
    full_name: string;
    email: string;
    password: string;
    slug: string;
    commission_percent: number;
  }) => {
    const res = await fetch('/api/company/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json?.success) {
      const message = json?.error || 'Não foi possível criar o representante';
      toast.error(message);
      throw new Error(message);
    }

    toast.success('Representante criado com sucesso');
    await loadTeam();
  };

  return (
    <div className="space-y-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black italic text-slate-900">Minha Equipe</h1>
          <p className="text-slate-500 font-medium">Gerencie representantes, links e operação comercial.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="h-12 px-6 bg-slate-900 text-white rounded-2xl font-black shadow-lg flex items-center gap-2"
        >
          <UserPlus size={18} /> NOVO REPRESENTANTE
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard label="Total de Representantes" value={String(totalTeam)} icon={<Users size={18} />} />
        <StatCard label="Vendas da Equipe (Mês)" value={money(monthSales)} icon={<TrendingUp size={18} />} />
        <StatCard label="Comissão da Equipe (Mês)" value={money(monthCommission)} icon={<TrendingUp size={18} />} />
        <StatCard label="Links Ativos" value={`${activeLinks}/${totalTeam || 0}`} icon={<LinkIcon size={18} />} />
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Representante</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Slug / Link</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-right">Vendas no Mês</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-right">Comissão no Mês</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-center">Acesso Catálogo</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td className="px-6 py-6 text-sm text-slate-500" colSpan={6}>
                  Carregando equipe...
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td className="px-6 py-6 text-sm text-slate-500" colSpan={6}>
                  Nenhum representante encontrado.
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-500">
                        {initials(member.full_name, member.email)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{member.full_name || 'Sem nome'}</p>
                        <p className="text-xs text-slate-400">{member.email || 'Sem e-mail'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {member.slug ? (
                      <code className="text-[11px] bg-slate-100 px-3 py-1 rounded-full text-slate-600 font-mono">
                        /{member.slug}
                      </code>
                    ) : (
                      <span className="text-xs text-slate-400">Sem slug</span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <p className="text-sm font-bold text-slate-800">
                      {money(Number(metrics?.by_member?.[member.id]?.month_sales || 0))}
                    </p>
                    <p className="text-xs text-slate-400">
                      {Number(metrics?.by_member?.[member.id]?.month_orders || 0)} pedidos
                    </p>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <p className="text-sm font-bold text-slate-800">
                      {money(Number(metrics?.by_member?.[member.id]?.month_commission || 0))}
                    </p>
                    <p className="text-xs text-slate-400">
                      Tx: {Number(member.commission_rate || 0).toFixed(2)}%
                    </p>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span
                      className={`font-black ${
                        member.can_manage_catalog ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    >
                      {member.can_manage_catalog ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    {member.slug ? (
                        <Link
                          href={`/catalogo/${slug || ''}/${member.slug}`}
                          target="_blank"
                          className="text-xs font-bold text-slate-700 hover:underline"
                        >
                          Ver como Representante
                        </Link>
                    ) : (
                      <span className="text-xs text-slate-400">Sem preview</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ModalNovoRepresentante
        open={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleCreateRepresentative}
      />
    </div>
  );
}
