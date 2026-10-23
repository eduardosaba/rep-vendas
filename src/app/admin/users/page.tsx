'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  LogIn,
  CalendarPlus,
  Loader2,
  Plus,
  X,
  Save,
  Edit,
  Mail,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/utils/getErrorMessage';
import {
  addSubscriptionDays,
  createManualUser,
  getUsersWithSubscriptions,
  getPlans,
} from './actions';
import { getCompanies } from './companiesActions';
import { Button } from '@/components/ui/button';
import { IntegrityAuditModal } from '@/components/admin/IntegrityAuditModal';

interface Plan {
  id: string;
  name: string;
  price: number;
}

interface UserData {
  id: string;
  email: string;
  role: string;
  status?: string | null;
  is_active: boolean;
  disabled_at?: string | null;
  disabled_by?: string | null;
  disabled_reason?: string | null;
  trial_ends_at?: string | null;
  company_id?: string | null;
  created_at: string;
  full_name?: string;
  subscriptions?: {
    current_period_end: string | null;
    status: string;
    plan_name?: string;
  } | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [plansList, setPlansList] = useState<Plan[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);

  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'rep',
    planName: '',
    company_id: '',
  });
  

  useEffect(() => {
    fetchUsers();
    fetchPlans();
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const res = await getCompanies();
      if (res.success && res.data) setCompanies(res.data as any[]);
    } catch (e) {
      // ignore
    }
  };

  const fetchPlans = async () => {
    const res = await getPlans();
    if (res.success && res.data) {
      setPlansList(res.data);
      // Define o primeiro plano como padrão se houver
      if (res.data.length > 0) {
        setFormData((prev) => ({ ...prev, planName: res.data[0].name }));
      }
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const result = await getUsersWithSubscriptions();

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Erro ao carregar dados');
      }

      const normalizedUsers: UserData[] = (result.data as any[]).map(
        (profile: Record<string, unknown>) => {
          // 🛑 LÓGICA CORRIGIDA PARA O BUG "SEM PLANO"
          let subData = null;
          if (Array.isArray(profile.subscriptions)) {
            subData =
              profile.subscriptions.length > 0
                ? profile.subscriptions[0]
                : null;
          } else {
            subData = profile.subscriptions;
          }

          return {
            id: profile.id as string,
            email: (profile.email as string) || '',
            role: (profile.role as string) || 'user',
            status: (profile.status as string) || null,
            is_active: profile.is_active as boolean,
            disabled_at: (profile.disabled_at as string) || null,
            disabled_by: (profile.disabled_by as string) || null,
            disabled_reason: (profile.disabled_reason as string) || null,
            trial_ends_at: (profile.trial_ends_at as string) || null,
            company_id: (profile.company_id as string) || null,
            created_at: profile.created_at as string,
            full_name: (profile.full_name || profile.name) as string | undefined,
            subscriptions: subData
              ? {
                  current_period_end: subData.current_period_end,
                  status: subData.status || 'active',
                  plan_name: subData.plan_name,
                }
              : null,
          };
        }
      );

      setUsers(normalizedUsers);
    } catch (error: unknown) {
      toast.error('Erro ao carregar usuários', {
        description: getErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.id?.includes(search)
  );

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      return toast.error('Preencha email e senha');
    }

    if (formData.password.length < 6) {
      return toast.error('A senha deve ter pelo menos 6 caracteres');
    }

    if (['representative', 'admin_company'].includes(formData.role) && !formData.company_id) {
      return toast.error('Selecione a Empresa Pai (Distribuidora) para este perfil vinculado.');
    }

    setIsCreating(true);
    try {
      const result = await createManualUser(formData);
      if (result.success) {
        toast.success('Usuário criado com sucesso!');
        setIsCreateOpen(false);
        setFormData({
          email: '',
          password: '',
          role: 'rep',
          planName: plansList[0]?.name || '',
          company_id: '',
        });
        fetchUsers();
      } else {
        throw new Error(result.error);
      }
    } catch (error: unknown) {
      console.error('Erro detalhado ao criar usuário:', error);
      toast.error('Erro ao criar usuário', {
        description: getErrorMessage(error),
        duration: 10000,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleQuickRenew = (userId: string, email: string) => {
    toast('Renovação de Assinatura (+30 dias)', {
      description: `Deseja adicionar 30 dias de acesso para ${email}?`,
      action: {
        label: 'Confirmar',
        onClick: () => executeRenew30Days(userId),
      },
      cancel: { label: 'Cancelar', onClick: () => toast.dismiss() },
      duration: 8000,
    });
  };

  const executeRenew30Days = async (userId: string) => {
    setUpdatingUser(userId);
    const toastId = toast.loading('Processando renovação...');
    try {
      const result = await addSubscriptionDays(userId, 30);
      if (result.success) {
        toast.success(`Assinatura renovada por 30 dias com sucesso!`, { id: toastId });
        await fetchUsers();
      } else {
        throw new Error(result.error);
      }
    } catch (error: unknown) {
      toast.error('Falha ao renovar assinatura', {
        id: toastId,
        description: getErrorMessage(error),
      });
    } finally {
      setUpdatingUser(null);
    }
  };

  const handleImpersonate = (email: string) => {
    toast.info(`Acessando como ${email}...`, {
      description: 'Funcionalidade em desenvolvimento.',
    });
  };

  const renderAccessStatusBadge = (user: UserData) => {
    // 1) Bloqueio Administrativo / Desativado / Inativo
    if (user.is_active === false || user.status === 'inactive' || user.status === 'blocked') {
      return (
        <div className="flex flex-col gap-0.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            {user.status === 'blocked' ? 'Bloqueado' : user.subscriptions?.status === 'canceled' ? 'Cancelado' : 'Desativado'}
          </span>
          {user.disabled_reason && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate max-w-[140px]" title={user.disabled_reason}>
              {user.disabled_reason}
            </span>
          )}
        </div>
      );
    }

    // 2) Assinatura Cancelada
    if (user.subscriptions?.status === 'canceled') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
          Cancelado
        </span>
      );
    }

    // 3) Assinatura Inadimplente
    if (user.subscriptions?.status === 'past_due') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          Inadimplente
        </span>
      );
    }

    // 4) Master / Admin (Acesso Permanente)
    if (user.role === 'master' || user.role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
          Ativo (Master)
        </span>
      );
    }

    // 5) Membro Vinculado a Distribuidora (Acesso Coberto pela Empresa)
    if (user.company_id && (user.role === 'representative' || user.role === 'rep')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          Ativo (Distribuidora)
        </span>
      );
    }

    // 6) Verificação de Vencimento de Assinatura Paga
    if (user.subscriptions?.current_period_end) {
      const expDate = new Date(user.subscriptions.current_period_end);
      const now = new Date();
      if (expDate.getTime() < now.getTime()) {
        const daysOverdue = Math.floor((now.getTime() - expDate.getTime()) / (1000 * 60 * 60 * 24));
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900 w-fit" title={`Assinatura vencida há ${daysOverdue} dia(s)`}>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            Vencido ({daysOverdue}d)
          </span>
        );
      }

      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Ativo
        </span>
      );
    }

    // 7) Verificação de Usuário em Trial (Teste Gratuito)
    const isTrial = user.status === 'trial' || !user.subscriptions || user.subscriptions?.status === 'trial';
    if (isTrial) {
      const trialEndIso = user.trial_ends_at || (user.created_at ? new Date(new Date(user.created_at).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString() : null);
      if (trialEndIso) {
        const trialEndDate = new Date(trialEndIso);
        const now = new Date();
        if (trialEndDate.getTime() < now.getTime()) {
          const daysOverdue = Math.floor((now.getTime() - trialEndDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysOverdue <= 5) {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 w-fit" title={`Trial expirado há ${daysOverdue} dia(s) - Período de tolerância (5 dias)`}>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                Trial Vencido ({daysOverdue}d)
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900 w-fit" title={`Trial expirado há ${daysOverdue} dia(s)`}>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
              Trial Expirado ({daysOverdue}d)
            </span>
          );
        } else {
          const daysRemaining = Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-50 text-cyan-800 border border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
              Trial ({daysRemaining}d)
            </span>
          );
        }
      }
    }

    // 8) Fallback para status do profile se explicitamente ativo
    if (user.status === 'active') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Ativo
        </span>
      );
    }

    // 9) Sem Plano
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 w-fit">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
        Sem Plano
      </span>
    );
  };

  const renderExpirationDate = (user: UserData) => {
    // 1) Manual block
    if (user.status === 'blocked') {
      return <span className="text-red-600 font-bold">BLOQUEADO</span>;
    }

    // 2) Subscription based
    if (user.subscriptions?.current_period_end) {
      const isCanceled = user.subscriptions.status === 'canceled' || user.status === 'inactive';
      const isPastDue = user.subscriptions.status === 'past_due';
      const date = new Date(user.subscriptions.current_period_end);
      const isExpired = date.getTime() < new Date().getTime();

      return (
        <div className="flex flex-col">
          <span className={`text-sm font-medium ${isCanceled || isExpired ? 'text-red-600 font-bold' : isPastDue ? 'text-amber-600 font-bold' : 'text-green-600'}`}>
            {date.toLocaleDateString('pt-BR')}
          </span>
          <span className="text-[10px] text-gray-400 flex items-center gap-1">
            {isCanceled ? (
              <span className="font-bold text-red-600 dark:text-red-400">Cancelado</span>
            ) : isPastDue ? (
              <span className="font-bold text-amber-600 dark:text-amber-400">Inadimplente</span>
            ) : isExpired ? (
              <span className="font-bold text-red-500">Expirado</span>
            ) : (
              <span className="font-bold text-emerald-600 dark:text-emerald-400">Ativo</span>
            )}
            <span>•</span>
            <span>{user.subscriptions.plan_name || 'Plano'}</span>
          </span>
        </div>
      );
    }

    // 3) Trial logic
    const isTrial = user.status === 'trial' || !user.subscriptions;
    const trialEndIso = user.trial_ends_at || (user.created_at ? new Date(new Date(user.created_at).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString() : null);
    if (isTrial && trialEndIso) {
      const trialDate = new Date(trialEndIso);
      const isExpired = trialDate.getTime() < new Date().getTime();
      return (
        <div className="flex flex-col">
          <span className={`text-sm font-medium ${isExpired ? 'text-red-500 font-bold' : 'text-amber-600 font-medium'}`}>
            {trialDate.toLocaleDateString('pt-BR')}
          </span>
          <span className="text-[10px] text-gray-400">
            {isExpired ? (
              <span className="font-bold text-red-500">Trial Vencido</span>
            ) : (
              <span className="font-semibold text-cyan-600 dark:text-cyan-400">Trial (Teste)</span>
            )}
          </span>
        </div>
      );
    }

    return (
      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400">
        Sem plano
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gerenciar Usuários
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Total de {users.length} usuários cadastrados
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar por email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full md:w-64 bg-white dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-[var(--primary)] outline-none"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setIsAuditModalOpen(true)}
            className="border-amber-200 dark:border-amber-900/50 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-semibold gap-1.5"
            leftIcon={<ShieldAlert size={16} className="text-amber-600 dark:text-amber-400" />}
          >
            Auditoria de Integridade
          </Button>
          <Button
            onClick={() => setIsCreateOpen(true)}
            leftIcon={<Plus size={18} />}
          >
            Novo Usuário
          </Button>
        </div>
      </div>

      {/* DESKTOP: Tabela Tradicional com Rolagem Horizontal Adequada */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-700">
          <table
            className="w-full text-sm text-left border-collapse"
            style={{ minWidth: '1100px' }}
          >
            <thead className="bg-gray-50 dark:bg-slate-950 text-gray-500 dark:text-slate-400 font-medium border-b border-gray-200 dark:border-slate-800">
              <tr>
                <th className="px-4 sm:px-6 py-4 min-w-[240px]">Usuário</th>
                <th className="px-4 sm:px-6 py-4 min-w-[140px]">Status de Acesso</th>
                <th className="px-4 sm:px-6 py-4 min-w-[130px]">Role</th>
                <th className="px-4 sm:px-6 py-4 min-w-[180px]">Empresa</th>
                <th className="px-4 sm:px-6 py-4 min-w-[130px]">Cadastro</th>
                <th className="px-4 sm:px-6 py-4 min-w-[160px]">Vencimento</th>
                <th className="px-4 sm:px-6 py-4 text-right min-w-[180px] sticky right-0 z-10 bg-gray-50 dark:bg-slate-950 shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.12)]">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-gray-500">
                    <div className="flex justify-center items-center gap-2">
                      <Loader2
                        className="animate-spin text-[var(--primary)]"
                        size={24}
                      />
                      <span>Carregando...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-gray-500">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="group hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800">
                          {user.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {user.email}
                            </span>
                            {user.created_at &&
                              Math.ceil(
                                Math.abs(
                                  new Date().getTime() -
                                    new Date(user.created_at).getTime()
                                ) /
                                  (1000 * 60 * 60 * 24)
                              ) <= 7 && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                                  <Sparkles size={10} /> Novo
                                </span>
                              )}
                          </div>
                          <span
                            className="text-[10px] text-gray-400 font-mono"
                            title={user.id}
                          >
                            {user.id.slice(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      {renderAccessStatusBadge(user)}
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      {user.role === 'master' || user.role === 'admin' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800">
                          Master
                        </span>
                      ) : user.role === 'admin_company' || user.role === 'company_admin' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800">
                          Admin Distribuidora
                        </span>
                      ) : user.company_id || user.role === 'representative' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                          Rep. Vinculado
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900">
                          Rep. Autônomo
                        </span>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-gray-500 dark:text-slate-400">
                      {user.company_id
                        ? (companies.find((c) => c.id === user.company_id)?.name ?? user.company_id)
                        : '—'}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-gray-500 dark:text-slate-400">
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      {renderExpirationDate(user)}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right sticky right-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-gray-50 dark:group-hover:bg-slate-800 shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.12)] transition-colors">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleQuickRenew(user.id, user.email)}
                          disabled={updatingUser === user.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-50"
                          title="Renovar 30 dias de assinatura"
                        >
                          {updatingUser === user.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Sparkles size={13} className="text-emerald-600 dark:text-emerald-400" />
                          )}
                          <span>+30 dias</span>
                        </button>
                        <a
                          href={`mailto:${user.email}?subject=Boas-vindas%20ao%20RepVendas&body=Ol%C3%A1!%20Vi%20que%20voc%C3%AA%20se%20cadastrou%20no%20RepVendas.%20Como%20posso%20te%20ajudar%20a%20configurar%20seu%20cat%C3%A1logo%3F`}
                          className="p-1.5 text-emerald-600 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-all"
                          title="Enviar E-mail de Boas-Vindas"
                        >
                          <Mail size={15} />
                        </a>
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="p-1.5 text-indigo-600 border border-transparent hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-all"
                          title="Editar Perfil e Assinatura"
                        >
                          <Edit size={15} />
                        </Link>
                        <button
                          onClick={() => handleImpersonate(user.email)}
                          className="p-1.5 text-gray-400 border border-transparent hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg"
                          title="Acessar como usuário"
                        >
                          <LogIn size={15} />
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

      {/* MOBILE: Cards Verticais */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800">
            <div className="flex justify-center items-center gap-2">
              <Loader2
                className="animate-spin text-[var(--primary)]"
                size={24}
              />
              <span>Carregando...</span>
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800">
            Nenhum usuário encontrado.
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div
              key={user.id}
              className="p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm"
            >
                <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800 flex-shrink-0">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      {user.email}
                    </span>
                    <span
                      className="text-[10px] text-gray-400 font-mono truncate"
                      title={user.id}
                    >
                      {user.id.slice(0, 8)}...
                    </span>
                  </div>
                </div>
                {user.role === 'master' || user.role === 'admin' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border flex-shrink-0 bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800">
                    Master
                  </span>
                ) : user.role === 'admin_company' || user.role === 'company_admin' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border flex-shrink-0 bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800">
                    Admin Distribuidora
                  </span>
                ) : user.company_id || user.role === 'representative' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border flex-shrink-0 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                    Rep. Vinculado
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border flex-shrink-0 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900">
                    Rep. Autônomo
                  </span>
                )}
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-slate-400">
                    Status de Acesso:
                  </span>
                  {renderAccessStatusBadge(user)}
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-slate-400">
                    Cadastro:
                  </span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {new Date(user.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-slate-400">
                    Vencimento:
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {renderExpirationDate(user)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  onClick={() => handleQuickRenew(user.id, user.email)}
                  disabled={updatingUser === user.id}
                  className="flex-1 flex items-center justify-center gap-1.5 p-2 text-emerald-700 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 rounded-lg transition-all font-bold text-xs disabled:opacity-50"
                  title="Renovar assinatura por 30 dias"
                >
                  {updatingUser === user.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400" />
                      <span>Renovar 30d</span>
                    </>
                  )}
                </button>
                <Link
                  href={`/admin/users/${user.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 p-2 text-indigo-600 border border-indigo-200 hover:bg-indigo-50 rounded-lg transition-all text-xs font-medium"
                >
                  <Edit size={14} />
                  <span>Editar</span>
                </Link>
                <button
                  onClick={() => handleImpersonate(user.email)}
                  className="p-2 text-gray-400 border border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg"
                  title="Impersonar usuário"
                >
                  <LogIn size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Plus className="text-indigo-600" /> Novo Usuário
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-gray-400 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full p-2.5 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Senha
                </label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full p-2.5 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Perfil / Permissão
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        role: newRole,
                        company_id: ['rep', 'master'].includes(newRole) ? '' : prev.company_id,
                      }));
                    }}
                    className="w-full p-2.5 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  >
                    <option value="rep">Representante Autônomo (Organização Própria)</option>
                    <option value="representative">Representante Vinculado (a Distribuidora)</option>
                    <option value="admin_company">Admin de Distribuidora</option>
                    <option value="master">Master (Gestor da Plataforma)</option>
                  </select>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {formData.role === 'rep' && '✓ Não possui empresa pai. Gerencia catálogo e pedidos com total autonomia.'}
                    {formData.role === 'representative' && '✓ Vinculado a uma distribuidora contratante.'}
                    {formData.role === 'admin_company' && '✓ Gestor com acesso ao painel da distribuidora.'}
                    {formData.role === 'master' && '✓ Superusuário com acesso irrestrito ao sistema.'}
                  </p>
                </div>

                {['representative', 'admin_company'].includes(formData.role) && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Empresa Pai (Distribuidora) *
                    </label>
                    <select
                      required
                      value={formData.company_id}
                      onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white font-medium"
                    >
                      <option value="">Selecione a distribuidora...</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Plano Inicial
                  </label>
                  <select
                    value={formData.planName}
                    onChange={(e) =>
                      setFormData({ ...formData, planName: e.target.value })
                    }
                    className="w-full p-2.5 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  >
                    {plansList.length > 0 ? (
                      plansList.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))
                    ) : (
                      <option value="Pro">Pro (Padrão)</option>
                    )}
                  </select>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" isLoading={isCreating} className="flex-1">
                  <Save size={18} className="mr-2" /> Criar Usuário
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE AUDITORIA DE INTEGRIDADE MULTI-TENANT */}
      <IntegrityAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        onRepaired={fetchUsers}
      />
    </div>
  );
}
