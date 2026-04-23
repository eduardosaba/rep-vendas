'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  Plus,
  Settings as SettingsIcon,
  Users,
  ShieldCheck,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

type TeamMember = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  can_manage_catalog: boolean | null;
  settings?: { catalog_slug?: string | null };
};

export default function EquipePage() {
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);

  const [newRep, setNewRep] = useState({ full_name: '', email: '', slug: '', password: '' });
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const slugDebounceRef = useRef<number | null>(null);

  const loadTeam = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/company/team', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Erro ao carregar equipe');
      setMembers(json.data || []);
    } catch (e: any) {
      toast.error(e?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const handleCreateRep = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    if (slugAvailable === false) {
      toast.error('Slug já está em uso. Escolha outro.');
      setIsCreating(false);
      return;
    }
    try {
      const res = await fetch('/api/company/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRep),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Falha ao criar acesso');

      toast.success('Representante cadastrado com sucesso!');
      setIsModalOpen(false);
      setNewRep({ full_name: '', email: '', slug: '', password: '' });
      loadTeam();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsCreating(false);
    }
  };

  // debounce slug availability check (client-side UX)
  useEffect(() => {
    const slug = String(newRep.slug || '').trim();
    setSlugAvailable(null);
    if (!slug) return;

    setCheckingSlug(true);
    if (slugDebounceRef.current) window.clearTimeout(slugDebounceRef.current);
    // @ts-ignore
    slugDebounceRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/company/team?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
        if (!res.ok) {
          setSlugAvailable(null);
          return;
        }
        const json = await res.json();
        if (typeof json.available === 'boolean') {
          setSlugAvailable(json.available);
        } else if (Array.isArray(json.data)) {
          setSlugAvailable(json.data.length === 0);
        } else {
          setSlugAvailable(null);
        }
      } catch (err) {
        setSlugAvailable(null);
      } finally {
        setCheckingSlug(false);
      }
    }, 650);

    return () => {
      if (slugDebounceRef.current) window.clearTimeout(slugDebounceRef.current);
    };
  }, [newRep.slug]);

  const generatePassword = (len = 12) => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=';
    let out = '';
    for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  };

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Copiado para a área de transferência');
    } catch (e) {
      toast.error('Não foi possível copiar');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 pb-20 space-y-8 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 bg-white dark:bg-slate-900 border rounded-xl hover:bg-gray-50 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Gestão de Equipe</h1>
            <p className="text-slate-500 text-sm font-medium">Controle os acessos e catálogos da Ótica Saba.</p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 px-6 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-slate-200 dark:shadow-none"
        >
          <Plus size={18} /> Novo Representante
        </button>
      </div>

      {/* LISTA DE MEMBROS (TABELA) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-sm">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="animate-spin text-primary" />
          </div>
        ) : members.length === 0 ? (
          <div className="p-20 text-center">
            <Users className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 font-medium">Nenhum representante cadastrado ainda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Representante</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Catálogo</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">E-mail</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-8 py-4 font-bold text-slate-700 dark:text-slate-200">{member.full_name || 'Sem nome'}</td>
                    <td className="px-8 py-4">
                      <span className="text-primary font-mono text-xs bg-primary/5 px-2 py-1 rounded-md">/{member.settings?.catalog_slug || '---'}</span>
                    </td>
                    <td className="px-8 py-4 text-slate-500 text-sm">{member.email}</td>
                    <td className="px-8 py-4 text-right">
                      <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all text-slate-400">
                        <SettingsIcon size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE CRIAÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black tracking-tight">Novo Acesso</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
            </div>

            <form onSubmit={handleCreateRep} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nome do Vendedor</label>
                <input
                  required
                  className="w-full mt-1 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none focus:ring-2 focus:ring-primary/20"
                  value={newRep.full_name}
                  onChange={e => setNewRep({...newRep, full_name: e.target.value})}
                  placeholder="Nome Completo"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">E-mail</label>
                  <input
                    required
                    type="email"
                    className="w-full mt-1 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none focus:ring-2 focus:ring-primary/20"
                    value={newRep.email}
                    onChange={e => setNewRep({...newRep, email: e.target.value})}
                    placeholder="rep@exemplo.com"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Slug (Link)</label>
                  <div className="relative">
                    <input
                      required
                      className="w-full mt-1 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none focus:ring-2 focus:ring-primary/20"
                      value={newRep.slug}
                      onChange={e => setNewRep({...newRep, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                      placeholder="saba-joao"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      {checkingSlug ? (
                        <Loader2 size={16} className="text-slate-400 animate-spin" />
                      ) : slugAvailable === true ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs">Disponível</span>
                      ) : slugAvailable === false ? (
                        <span className="inline-flex items-center gap-1 text-red-600 text-xs">Em uso</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Senha Inicial</label>
                <div className="relative">
                  <input
                    required
                    type="password"
                    className="w-full mt-1 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none focus:ring-2 focus:ring-primary/20"
                    value={newRep.password}
                    onChange={e => setNewRep({...newRep, password: e.target.value})}
                    placeholder="Defina a senha"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setNewRep({...newRep, password: generatePassword()})}
                      className="text-xs px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                    >
                      Gerar
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(newRep.password)}
                      className="text-xs px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                    >
                      Copiar
                    </button>
                  </div>
                </div>

                {newRep.password ? (
                  <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                    <span className="text-slate-500">Senha gerada:</span>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{newRep.password}</code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(newRep.password)}
                        className="text-xs px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                      >
                        Copiar
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={isCreating}
                className="w-full mt-6 py-4 bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isCreating ? <Loader2 className="animate-spin" size={18} /> : 'Finalizar Cadastro'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}