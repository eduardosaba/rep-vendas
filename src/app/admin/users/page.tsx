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
} from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/utils/getErrorMessage';
import {
  addSubscriptionDays,
  createManualUser,
  getUsersWithSubscriptions,
  getPlans,
} from './actions';
import { Button } from '@/components/ui/Button';

interface Plan {
  id: string;
  name: string;
  price: number;
}

interface UserData {
  id: string;
  email: string;
  role: string;
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

  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'representante',
    planName: '',
  });

  useEffect(() => {
    fetchUsers();
    fetchPlans();
  }, []);

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

      const normalizedUsers: UserData[] = result.data.map(
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
            created_at: profile.created_at as string,
            full_name: profile.full_name as string | undefined,
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

    setIsCreating(true);
    try {
      const result = await createManualUser(formData);
      if (result.success) {
        toast.success('Usuário criado com sucesso!');
        setIsCreateOpen(false);
        setFormData({
          email: '',
          password: '',
          role: 'representante',
          planName: plansList[0]?.name || '',
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

  const confirmAddTrial = (userId: string, email: string) => {
    toast('Renovação de Assinatura', {
      description: `Deseja adicionar 30 dias de acesso para ${email}?`,
      action: {
        label: 'Confirmar',
        onClick: () => executeAddTrial(userId),
      },
      cancel: { label: 'Cancelar', onClick: () => toast.dismiss() },
      duration: 8000,
    });
  };

  const executeAddTrial = async (userId: string) => {
    setUpdatingUser(userId);
    const toastId = toast.loading('Processando renovação...');
    try {
      const result = await addSubscriptionDays(userId, 30);
      if (result.success) {
        toast.success(`Assinatura renovada!`, { id: toastId });
        fetchUsers();
      } else {
        throw new Error(result.error);
      }
    } catch (error: unknown) {
      toast.error('Falha ao renovar', {
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

  const renderExpirationDate = (user: UserData) => {
    if (!user.subscriptions || !user.subscriptions.current_period_end) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400">
          Sem plano
        </span>
      );
    }
    const date = new Date(user.subscriptions.current_period_end);
    const isExpired = date.getTime() < new Date().getTime();
    return (
      <div className="flex flex-col">
        <span
          className={`text-sm font-medium ${
            isExpired ? 'text-red-600' : 'text-green-600'
          }`}
        >
          {date.toLocaleDateString('pt-BR')}
        </span>
        <span className="text-[10px] text-gray-400 flex gap-1">
          {isExpired ? 'Expirado' : 'Ativo'} •{' '}
          {user.subscriptions.plan_name || 'Plano'}
        </span>
      </div>
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
            onClick={() => setIsCreateOpen(true)}
            leftIcon={<Plus size={18} />}
          >
            Novo Usuário
          </Button>
        </div>
      </div>

      {/* DESKTOP: Tabela Tradicional */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto scrollbar-thin">
          <table
            className="w-full text-sm text-left"
            style={{ minWidth: '800px' }}
          >
            <thead className="bg-gray-50 dark:bg-slate-950 text-gray-500 dark:text-slate-400 font-medium border-b border-gray-200 dark:border-slate-800">
              <tr>
                <th className="px-4 sm:px-6 py-4 min-w-[200px]">Usuário</th>
                <th className="px-4 sm:px-6 py-4 min-w-[100px]">Role</th>
                <th className="px-4 sm:px-6 py-4 min-w-[120px]">Cadastro</th>
                <th className="px-4 sm:px-6 py-4 min-w-[150px]">Vencimento</th>
                <th className="px-4 sm:px-6 py-4 text-right min-w-[140px] sticky right-0 bg-gray-50 dark:bg-slate-950 shadow-[-5px_0_5px_-5px_rgba(0,0,0,0.1)]">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-500">
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
                  <td colSpan={5} className="p-12 text-center text-gray-500">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800">
                          {user.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {user.email}
                          </span>
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
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          user.role === 'master' || user.role === 'admin'
                            ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
                            : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}
                      >
                        {user.role || 'user'}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-gray-500 dark:text-slate-400">
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      {renderExpirationDate(user)}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right sticky right-0 bg-white dark:bg-slate-900 group-hover:bg-gray-50 dark:group-hover:bg-slate-800 shadow-[-5px_0_5px_-5px_rgba(0,0,0,0.1)]">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="p-2 text-indigo-600 border border-transparent hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-all"
                        >
                          <Edit size={16} />
                        </Link>
                        <button
                          onClick={() => confirmAddTrial(user.id, user.email)}
                          disabled={updatingUser === user.id}
                          className="p-2 text-green-600 bg-green-50 border border-green-200 hover:bg-green-100 rounded-lg transition-all disabled:opacity-50"
                        >
                          {updatingUser === user.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <CalendarPlus size={16} />
                          )}
                        </button>
                        <button
                          onClick={() => handleImpersonate(user.email)}
                          className="p-2 text-gray-400 border border-transparent hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg"
                        >
                          <LogIn size={16} />
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
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex-shrink-0 ${
                    user.role === 'master' || user.role === 'admin'
                      ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
                      : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                  }`}
                >
                  {user.role || 'user'}
                </span>
              </div>

              <div className="space-y-2 text-sm mb-4">
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
                <Link
                  href={`/admin/users/${user.id}`}
                  className="flex-1 flex items-center justify-center gap-2 p-2 text-indigo-600 border border-indigo-200 hover:bg-indigo-50 rounded-lg transition-all"
                >
                  <Edit size={16} />
                  <span className="text-sm font-medium">Editar</span>
                </Link>
                <button
                  onClick={() => confirmAddTrial(user.id, user.email)}
                  disabled={updatingUser === user.id}
                  className="flex-1 flex items-center justify-center gap-2 p-2 text-green-600 bg-green-50 border border-green-200 hover:bg-green-100 rounded-lg transition-all disabled:opacity-50"
                >
                  {updatingUser === user.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <CalendarPlus size={16} />
                      <span className="text-sm font-medium">Trial</span>
                    </>
                  )}
                </button>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Permissão
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    className="w-full p-2.5 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  >
                    <option value="representante">Representante</option>
                    <option value="master">Master</option>
                  </select>
                </div>
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
    </div>
  );
}
