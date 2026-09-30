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
  Copy,
  ExternalLink,
  Trash2,
  Edit3,
  Phone,
  Mail,
  Percent,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

type TeamMember = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone?: string | null;
  role: string | null;
  slug?: string | null;
  commission_rate?: number | null;
  can_manage_catalog: boolean | null;
  is_active?: boolean | null;
  settings?: { catalog_slug?: string | null };
};

export default function EquipePage() {
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);

  // Criação
  const [newRep, setNewRep] = useState({ full_name: '', email: '', phone: '', slug: '', password: '', commission_percent: 5 });
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const slugDebounceRef = useRef<number | null>(null);

  // Edição / Gerenciamento
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRep, setEditingRep] = useState<TeamMember | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    slug: '',
    commission_rate: 5,
    can_manage_catalog: true,
    is_active: true,
    new_password: '',
  });
  const [editSlugAvailable, setEditSlugAvailable] = useState<boolean | null>(null);
  const [checkingEditSlug, setCheckingEditSlug] = useState(false);
  const editSlugDebounceRef = useRef<number | null>(null);

  const [metrics, setMetrics] = useState<any>(null);

  const loadTeam = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/company/team', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Erro ao carregar equipe');
      setMembers(json.data || []);
      setMetrics(json.metrics || null);
    } catch (e: any) {
      toast.error(e?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  // Criação de novo representante
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
      setNewRep({ full_name: '', email: '', phone: '', slug: '', password: '', commission_percent: 5 });
      loadTeam();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsCreating(false);
    }
  };

  // Abrir modal de edição
  const handleOpenEdit = (member: TeamMember) => {
    setEditingRep(member);
    const memberSlug = member.slug || member.settings?.catalog_slug || '';
    setEditForm({
      full_name: member.full_name || '',
      phone: member.phone || '',
      email: member.email || '',
      slug: memberSlug,
      commission_rate: member.commission_rate ?? 5,
      can_manage_catalog: member.can_manage_catalog ?? true,
      is_active: member.is_active ?? true,
      new_password: '',
    });
    setEditSlugAvailable(true);
    setIsEditModalOpen(true);
  };

  // Salvar edição
  const handleUpdateRep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRep) return;

    if (editSlugAvailable === false) {
      toast.error('Slug já está em uso. Escolha outro.');
      return;
    }

    setIsUpdating(true);
    try {
      const payload: Record<string, any> = {
        target_user_id: editingRep.id,
        full_name: editForm.full_name,
        phone: editForm.phone,
        slug: editForm.slug,
        commission_rate: Number(editForm.commission_rate),
        can_manage_catalog: editForm.can_manage_catalog,
        is_active: editForm.is_active,
      };

      if (editForm.new_password.trim()) {
        payload.password = editForm.new_password.trim();
      }

      const res = await fetch('/api/company/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Falha ao atualizar representante');

      toast.success('Representante atualizado com sucesso!');
      setIsEditModalOpen(false);
      setEditingRep(null);
      loadTeam();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // Sincronizar catálogo/identidade da distribuidora
  const handleSyncCatalog = async () => {
    if (!editingRep) return;
    setIsSyncing(true);
    try {
      const res = await fetch('/api/company/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_user_id: editingRep.id,
          sync_catalog: true,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Falha ao sincronizar');

      toast.success('Identidade visual e catálogo sincronizados com a Distribuidora!');
      loadTeam();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Excluir representante
  const handleDeleteRep = async (member: TeamMember) => {
    const repName = member.full_name || 'este representante';
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir "${repName}"?\n\nEsta ação removerá o acesso do usuário, seu link de catálogo e não poderá ser desfeita.`
    );
    if (!confirmed) return;

    setIsDeletingId(member.id);
    try {
      const res = await fetch(`/api/company/team?id=${encodeURIComponent(member.id)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Falha ao excluir representante');

      toast.success(`Representante "${repName}" excluído com sucesso!`);
      if (editingRep?.id === member.id) {
        setIsEditModalOpen(false);
        setEditingRep(null);
      }
      loadTeam();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsDeletingId(null);
    }
  };

  // debounce slug availability check no cadastro
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
        setSlugAvailable(typeof json.available === 'boolean' ? json.available : null);
      } catch (err) {
        setSlugAvailable(null);
      } finally {
        setCheckingSlug(false);
      }
    }, 600);

    return () => {
      if (slugDebounceRef.current) window.clearTimeout(slugDebounceRef.current);
    };
  }, [newRep.slug]);

  // debounce slug availability check na edição
  useEffect(() => {
    if (!editingRep) return;
    const currentSlug = editingRep.slug || editingRep.settings?.catalog_slug || '';
    const newSlug = String(editForm.slug || '').trim();

    if (!newSlug || newSlug === currentSlug) {
      setEditSlugAvailable(true);
      return;
    }

    setCheckingEditSlug(true);
    if (editSlugDebounceRef.current) window.clearTimeout(editSlugDebounceRef.current);
    // @ts-ignore
    editSlugDebounceRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/company/team?slug=${encodeURIComponent(newSlug)}`, { cache: 'no-store' });
        if (!res.ok) {
          setEditSlugAvailable(null);
          return;
        }
        const json = await res.json();
        setEditSlugAvailable(typeof json.available === 'boolean' ? json.available : null);
      } catch (err) {
        setEditSlugAvailable(null);
      } finally {
        setCheckingEditSlug(false);
      }
    }, 600);

    return () => {
      if (editSlugDebounceRef.current) window.clearTimeout(editSlugDebounceRef.current);
    };
  }, [editForm.slug, editingRep]);

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
    <div className="max-w-6xl mx-auto p-4 md:p-8 pb-24 space-y-8 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shadow-sm">
            <ArrowLeft size={20} className="text-slate-700 dark:text-slate-300" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Gestão de Equipe Comercial</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-0.5">Controle representantes, acessos, comissões e performance.</p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 px-6 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-200 dark:shadow-none hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus size={18} /> Novo Representante
        </button>
      </div>

      {/* CARDS DE RESUMO DE PERFORMANCE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-[2rem] shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Total de Representantes</p>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-1.5">{members.length}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Membros vinculados à distribuidora</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-[2rem] shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Vendas da Equipe (Mês)</p>
          <h2 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">
            R$ {Number(metrics?.month_sales_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Volume bruto gerado este mês</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-[2rem] shadow-sm sm:col-span-2 lg:col-span-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Comissões Estimadas (Mês)</p>
          <h2 className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1.5">
            R$ {Number(metrics?.month_commission_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Comissões acumuladas da equipe</p>
        </div>
      </div>

      {/* LISTAGEM DE EQUIPE */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem]">
          <Loader2 className="animate-spin text-primary" size={32} />
          <p className="text-sm text-slate-400 font-medium">Carregando membros da equipe...</p>
        </div>
      ) : members.length === 0 ? (
        <div className="p-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem]">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Users size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Nenhum representante cadastrado</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
            Cadastre o primeiro representante para que ele receba acesso ao catálogo com a identidade e produtos da sua distribuidora.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus size={16} /> Cadastrar Vendedor
          </button>
        </div>
      ) : (
        <>
          {/* VISUALIZAÇÃO DESKTOP: TABELA (hidden lg:block) */}
          <div className="hidden lg:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Representante</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Telefone</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Slug Catálogo</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Vendas (Mês)</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Pedidos</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Comissão</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {members.map((member) => {
                    const mMetrics = metrics?.by_member?.[member.id] || { month_sales: 0, month_orders: 0 };
                    const repSlug = member.slug || member.settings?.catalog_slug;
                    const isActive = member.is_active !== false;

                    return (
                      <tr key={member.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center font-black text-sm text-slate-700 dark:text-slate-200 flex-shrink-0">
                              {(member.full_name || 'R').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{member.full_name || 'Sem nome'}</p>
                              <p className="text-xs text-slate-400 truncate">{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-sm whitespace-nowrap">
                          {member.phone ? (
                            <a
                              href={`https://wa.me/${member.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                            >
                              {member.phone}
                            </a>
                          ) : (
                            <span className="text-slate-400">---</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-primary font-mono text-xs bg-primary/10 px-2 py-1 rounded-md font-semibold">
                              /{repSlug || '---'}
                            </span>
                            {repSlug ? (
                              <>
                                <button
                                  type="button"
                                  title="Copiar link do catálogo"
                                  onClick={() => {
                                    const origin = typeof window !== 'undefined' ? window.location.origin : '';
                                    copyToClipboard(`${origin}/catalogo/${repSlug}`);
                                  }}
                                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-primary transition-colors"
                                >
                                  <Copy size={14} />
                                </button>
                                <a
                                  href={`/catalogo/${repSlug}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Abrir catálogo"
                                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-primary transition-colors"
                                >
                                  <ExternalLink size={14} />
                                </a>
                              </>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100 text-sm whitespace-nowrap">
                          R$ {Number(mMetrics.month_sales || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-semibold text-sm">
                          {mMetrics.month_orders || 0}
                        </td>
                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-medium text-sm whitespace-nowrap">
                          {member.commission_rate ?? 5}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            {isActive ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(member)}
                              title="Gerenciar e Editar Representante"
                              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-primary rounded-xl transition-colors"
                            >
                              <Edit3 size={17} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRep(member)}
                              disabled={isDeletingId === member.id}
                              title="Excluir Representante"
                              className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-600 rounded-xl transition-colors disabled:opacity-50"
                            >
                              {isDeletingId === member.id ? <Loader2 size={17} className="animate-spin text-red-600" /> : <Trash2 size={17} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* VISUALIZAÇÃO MOBILE: CARDS RESPONSIVOS (block lg:hidden) */}
          <div className="block lg:hidden space-y-4">
            {members.map((member) => {
              const mMetrics = metrics?.by_member?.[member.id] || { month_sales: 0, month_orders: 0 };
              const repSlug = member.slug || member.settings?.catalog_slug;
              const isActive = member.is_active !== false;

              return (
                <div
                  key={member.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-[2rem] p-5 shadow-sm space-y-4"
                >
                  {/* CABEÇALHO DO CARD */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center font-black text-base text-slate-800 dark:text-slate-100 flex-shrink-0 shadow-inner">
                        {(member.full_name || 'R').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 dark:text-white text-base truncate">{member.full_name || 'Sem nome'}</h4>
                        <p className="text-xs text-slate-400 truncate">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>

                  {/* LINK DO CATÁLOGO */}
                  <div className="flex items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Catálogo:</span>
                      <span className="text-primary font-mono text-xs font-bold truncate">/{repSlug || '---'}</span>
                    </div>
                    {repSlug ? (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const origin = typeof window !== 'undefined' ? window.location.origin : '';
                            copyToClipboard(`${origin}/catalogo/${repSlug}`);
                          }}
                          className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 hover:text-primary transition-colors shadow-sm"
                        >
                          <Copy size={12} /> Copiar
                        </button>
                        <a
                          href={`/catalogo/${repSlug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:text-primary transition-colors shadow-sm"
                        >
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    ) : null}
                  </div>

                  {/* DADOS DE CONTATO */}
                  {member.phone ? (
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <Phone size={14} className="text-slate-400 flex-shrink-0" />
                      <a
                        href={`https://wa.me/${member.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                      >
                        {member.phone} (WhatsApp)
                      </a>
                    </div>
                  ) : null}

                  {/* METRICAS DO MÊS */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Vendas (Mês)</p>
                      <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                        R$ {Number(mMetrics.month_sales || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pedidos</p>
                      <p className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5">
                        {mMetrics.month_orders || 0}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Comissão</p>
                      <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                        {member.commission_rate ?? 5}%
                      </p>
                    </div>
                  </div>

                  {/* BOTÕES DE AÇÃO */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(member)}
                      className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Edit3 size={14} /> Gerenciar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRep(member)}
                      disabled={isDeletingId === member.id}
                      className="py-2.5 px-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {isDeletingId === member.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* MODAL DE CRIAÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 my-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Novo Vendedor</h2>
                <p className="text-xs text-slate-400 mt-0.5">Irá herdar produtos e identidade da distribuidora.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateRep} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nome do Vendedor</label>
                <input
                  required
                  className="w-full mt-1 p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 focus:ring-2 focus:ring-primary/20 text-sm font-medium"
                  value={newRep.full_name}
                  onChange={e => {
                    const val = e.target.value;
                    setNewRep(prev => ({
                      ...prev,
                      full_name: val,
                      slug: !prev.slug || prev.slug === prev.full_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                        ? val.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
                        : prev.slug,
                    }));
                  }}
                  placeholder="Nome Completo"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Telefone / WhatsApp</label>
                <input
                  type="tel"
                  className="w-full mt-1 p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 focus:ring-2 focus:ring-primary/20 text-sm font-medium"
                  value={newRep.phone}
                  onChange={e => setNewRep({...newRep, phone: e.target.value})}
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">E-mail</label>
                  <input
                    required
                    type="email"
                    className="w-full mt-1 p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 focus:ring-2 focus:ring-primary/20 text-sm font-medium"
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
                      className="w-full mt-1 p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 focus:ring-2 focus:ring-primary/20 text-sm font-medium pr-10"
                      value={newRep.slug}
                      onChange={e => setNewRep({...newRep, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                      placeholder="saba-joao"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      {checkingSlug ? (
                        <Loader2 size={16} className="text-slate-400 animate-spin" />
                      ) : slugAvailable === true ? (
                        <span className="text-emerald-600 text-xs font-bold">OK</span>
                      ) : slugAvailable === false ? (
                        <span className="text-red-600 text-xs font-bold">Em uso</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Comissão (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  className="w-full mt-1 p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 focus:ring-2 focus:ring-primary/20 text-sm font-medium"
                  value={newRep.commission_percent}
                  onChange={e => setNewRep({...newRep, commission_percent: Number(e.target.value)})}
                  placeholder="5"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Senha Inicial</label>
                <div className="relative">
                  <input
                    required
                    type="text"
                    className="w-full mt-1 p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 focus:ring-2 focus:ring-primary/20 text-sm font-mono pr-28"
                    value={newRep.password}
                    onChange={e => setNewRep({...newRep, password: e.target.value})}
                    placeholder="Defina a senha"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setNewRep({...newRep, password: generatePassword()})}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:opacity-80"
                    >
                      Gerar
                    </button>
                    {newRep.password ? (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(newRep.password)}
                        className="text-xs px-2 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:opacity-80"
                      >
                        <Copy size={13} />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreating}
                className="w-full mt-6 py-4 bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                {isCreating ? <Loader2 className="animate-spin" size={18} /> : 'Finalizar Cadastro'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO / GERENCIAMENTO */}
      {isEditModalOpen && editingRep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 my-8 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Gerenciar Representante</h2>
                <p className="text-xs text-slate-400 mt-0.5">{editingRep.email}</p>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingRep(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={20} />
              </button>
            </div>

            {/* BANNER DE SINCRONIZAÇÃO DA DISTRIBUIDORA */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <RefreshCw size={14} className="text-primary" /> Sincronizar Identidade
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Atualiza logo, banners, cores e catálogo da distribuidora para este representante.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSyncCatalog}
                disabled={isSyncing}
                className="px-3.5 py-2 bg-primary hover:opacity-90 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all flex-shrink-0 disabled:opacity-50 shadow-sm"
              >
                {isSyncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Sincronizar Agora
              </button>
            </div>

            <form onSubmit={handleUpdateRep} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nome Completo</label>
                <input
                  required
                  className="w-full mt-1 p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 focus:ring-2 focus:ring-primary/20 text-sm font-medium"
                  value={editForm.full_name}
                  onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                  placeholder="Nome do representante"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Telefone / WhatsApp</label>
                  <input
                    type="tel"
                    className="w-full mt-1 p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 focus:ring-2 focus:ring-primary/20 text-sm font-medium"
                    value={editForm.phone}
                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Slug do Catálogo</label>
                  <div className="relative">
                    <input
                      required
                      className="w-full mt-1 p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 focus:ring-2 focus:ring-primary/20 text-sm font-medium pr-10"
                      value={editForm.slug}
                      onChange={e => setEditForm({ ...editForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                      placeholder="slug-do-vendedor"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      {checkingEditSlug ? (
                        <Loader2 size={16} className="text-slate-400 animate-spin" />
                      ) : editSlugAvailable === true ? (
                        <span className="text-emerald-600 text-xs font-bold">OK</span>
                      ) : editSlugAvailable === false ? (
                        <span className="text-red-600 text-xs font-bold">Em uso</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Taxa de Comissão (%)</label>
                  <div className="relative mt-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 focus:ring-2 focus:ring-primary/20 text-sm font-medium pr-8"
                      value={editForm.commission_rate}
                      onChange={e => setEditForm({ ...editForm, commission_rate: Number(e.target.value) })}
                    />
                    <Percent size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Status do Acesso</label>
                  <div className="mt-1 flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {editForm.is_active ? 'Acesso Ativo' : 'Acesso Suspenso'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, is_active: !editForm.is_active })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        editForm.is_active ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          editForm.is_active ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Permissão de Catálogo</label>
                <div className="mt-1 flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Pode gerenciar catálogo</p>
                    <p className="text-[11px] text-slate-400">Permite ao vendedor visualizar e personalizar o link</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, can_manage_catalog: !editForm.can_manage_catalog })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      editForm.can_manage_catalog ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        editForm.can_manage_catalog ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 flex items-center gap-1">
                  <KeyRound size={12} /> Redefinir Senha de Acesso (Opcional)
                </label>
                <p className="text-[11px] text-slate-400 ml-1 mb-1.5">Deixe em branco para manter a senha atual do representante.</p>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 focus:ring-2 focus:ring-primary/20 text-sm font-mono pr-28"
                    value={editForm.new_password}
                    onChange={e => setEditForm({ ...editForm, new_password: e.target.value })}
                    placeholder="Nova senha (mínimo 8 caracteres)"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, new_password: generatePassword() })}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:opacity-80"
                    >
                      Gerar
                    </button>
                    {editForm.new_password ? (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(editForm.new_password)}
                        className="text-xs px-2 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:opacity-80"
                      >
                        <Copy size={13} />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleDeleteRep(editingRep)}
                  disabled={isDeletingId === editingRep.id}
                  className="w-full sm:w-auto px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={15} /> Excluir Representante
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setEditingRep(null);
                    }}
                    className="px-4 py-3 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-xs font-bold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="flex-1 sm:flex-initial px-6 py-3 bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-wider text-xs hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-md"
                  >
                    {isUpdating ? <Loader2 className="animate-spin" size={16} /> : 'Salvar Alterações'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}