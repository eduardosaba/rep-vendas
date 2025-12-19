'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Search,
  LogIn,
  CalendarPlus,
  Loader2,
  Plus,
  X,
  Save,
  Shield,
  CreditCard,
} from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/utils/getErrorMessage';
// Importe a nova action que criamos acima
import { addSubscriptionDays, createManualUser } from './actions';
import { Button } from '@/components/ui/Button';

interface UserData {
  id: string;
  email: string;
  role: string;
  created_at: string;
  subscription?: {
    current_period_end: string;
    status: string;
  } | null;
}

interface ProfileRecord {
  id: string;
  email?: string | null;
  role?: string | null;
  created_at: string;
}

interface SubscriptionRecord {
  user_id: string;
  current_period_end?: string | null;
  status?: string | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Estado para bloquear ações
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  // Estados do MODAL DE CRIAÇÃO
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'user',
    planName: 'Pro',
  });

  const supabase = createClient();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profilesData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profileError) throw profileError;

      const { data: subscriptionsData, error: subError } = await supabase
        .from('subscriptions')
        .select('user_id, current_period_end, status');

      const safeSubscriptions: SubscriptionRecord[] = subError
        ? []
        : ((subscriptionsData || []) as SubscriptionRecord[]);

      const profiles = (profilesData || []) as ProfileRecord[];

      const mergedData: UserData[] = profiles.map((profile) => {
        const sub = safeSubscriptions.find((s) => s.user_id === profile.id);
        return {
          id: profile.id,
          email: profile.email || '',
          role: profile.role || 'user',
          created_at: profile.created_at,
          subscription:
            sub && sub.current_period_end
              ? {
                  current_period_end: sub.current_period_end,
                  status: sub.status || 'active',
                }
              : null,
        };
      });

      setUsers(mergedData);
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
      u.id?.includes(search)
  );

  // --- AÇÃO: CRIAR USUÁRIO MANUAL ---
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      return toast.error('Preencha email e senha');
    }

    setIsCreating(true);
    try {
      const result = await createManualUser(formData);

      if (result.success) {
        toast.success('Usuário criado com sucesso!');
        setIsCreateOpen(false);
        setFormData({ email: '', password: '', role: 'user', planName: 'Pro' }); // Reset
        fetchUsers(); // Recarrega lista
      } else {
        throw new Error(result.error);
      }
    } catch (error: unknown) {
      toast.error('Erro ao criar usuário', {
        description: getErrorMessage(error),
      });
    } finally {
      setIsCreating(false);
    }
  };

  // --- AÇÃO: RENOVAR ---
  const confirmAddTrial = (userId: string, email: string) => {
    toast('Renovação de Assinatura', {
      description: `Deseja adicionar 30 dias de acesso para ${email}?`,
      action: {
        label: 'Confirmar',
        onClick: () => executeAddTrial(userId),
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => toast.dismiss(),
      },
      duration: 8000,
    });
  };

  const executeAddTrial = async (userId: string) => {
    setUpdatingUser(userId);
    const toastId = toast.loading('Processando renovação...');
    try {
      const result = await addSubscriptionDays(userId, 30);
      if (result.success) {
        toast.success(`Assinatura renovada!`, {
          id: toastId,
          description: `Novo vencimento: ${new Date(result.newDate!).toLocaleDateString('pt-BR')}`,
          duration: 5000,
        });
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
    if (!user.subscription?.current_period_end) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400">
          Sem plano
        </span>
      );
    }
    const date = new Date(user.subscription.current_period_end);
    const now = new Date();
    const isExpired = date.getTime() < now.getTime();
    return (
      <div className="flex flex-col">
        <span
          className={`text-sm font-medium ${isExpired ? 'text-red-600' : 'text-green-600'}`}
        >
          {date.toLocaleDateString('pt-BR')}
        </span>
        <span className="text-[10px] text-gray-400">
          {isExpired ? 'Expirado' : 'Ativo'}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* HEADER E AÇÕES */}
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
              className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full md:w-64 bg-white dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
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

      {/* TABELA */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto shadow-sm border border-gray-100 rounded-lg">
          <table className="w-full text-sm text-left min-w-full">
            <thead className="bg-gray-50 dark:bg-slate-950 text-gray-500 dark:text-slate-400 font-medium border-b border-gray-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Cadastro</th>
                <th className="px-6 py-4">Vencimento</th>
                <th className="px-6 py-4 text-right">Ações</th>
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
                    <td className="px-6 py-4">
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
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${user.role === 'master' || user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800' : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}
                      >
                        {user.role || 'user'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-slate-400">
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">{renderExpirationDate(user)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => confirmAddTrial(user.id, user.email)}
                          disabled={updatingUser === user.id}
                          className="p-2 text-green-600 bg-green-50 border border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/40 rounded-lg transition-all disabled:opacity-50"
                          title="Renovar Assinatura"
                        >
                          {updatingUser === user.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <CalendarPlus size={16} />
                          )}
                        </button>
                        <button
                          onClick={() => handleImpersonate(user.email)}
                          className="p-2 text-gray-400 border border-transparent hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/30 dark:hover:text-white rounded-lg transition-all"
                          title="Logar como usuário"
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

      {/* MODAL DE CRIAÇÃO MANUAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-800 animate-in slide-in-from-bottom-5">
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Plus className="text-indigo-600" /> Novo Usuário
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Email de Acesso
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="usuario@exemplo.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Senha Provisória
                </label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 flex items-center gap-1">
                    <Shield size={12} /> Permissão
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="user">Usuário Comum</option>
                    <option value="admin">Administrador</option>
                    <option value="master">Master</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 flex items-center gap-1">
                    <CreditCard size={12} /> Plano Inicial
                  </label>
                  <select
                    value={formData.planName}
                    onChange={(e) =>
                      setFormData({ ...formData, planName: e.target.value })
                    }
                    className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="Basic">Basic</option>
                    <option value="Pro">Pro</option>
                    <option value="Enterprise">Enterprise</option>
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
