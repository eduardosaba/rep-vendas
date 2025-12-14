'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Search, LogIn, CalendarPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { addSubscriptionDays } from '@/app/admin/actions';

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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Estado para bloquear o botão enquanto processa
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profileError) throw profileError;

      const { data: subscriptions, error: subError } = await supabase
        .from('subscriptions')
        .select('user_id, current_period_end, status');

      const safeSubscriptions = subError ? [] : subscriptions;

      const mergedData = (profiles || []).map((profile) => {
        const sub = safeSubscriptions?.find((s) => s.user_id === profile.id);
        return {
          ...profile,
          subscription: sub || null,
        };
      });

      setUsers(mergedData);
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao carregar usuários', {
        description: 'Verifique sua conexão.',
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

  // --- ETAPA 1: PERGUNTA (Toast com Ação) ---
  const confirmAddTrial = (userId: string, email: string) => {
    toast('Renovação de Assinatura', {
      description: `Deseja adicionar 30 dias de acesso para ${email}?`,
      action: {
        label: 'Confirmar',
        onClick: () => executeAddTrial(userId), // Chama a execução se clicar
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => toast.dismiss(),
      },
      duration: 8000, // Dá tempo para pensar
    });
  };

  // --- ETAPA 2: EXECUÇÃO (Server Action) ---
  const executeAddTrial = async (userId: string) => {
    setUpdatingUser(userId);

    // Feedback imediato de carregamento
    const toastId = toast.loading('Processando renovação...');

    try {
      const result = await addSubscriptionDays(userId, 30);

      if (result.success) {
        toast.success(`Assinatura renovada!`, {
          id: toastId,
          description: `Novo vencimento: ${new Date(result.newDate!).toLocaleDateString('pt-BR')}`,
          duration: 5000,
        });

        fetchUsers(); // Atualiza a tabela
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast.error('Falha ao renovar', {
        id: toastId,
        description: error.message,
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Gerenciar Usuários
        </h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Buscar por email ou ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border rounded-lg text-sm w-64 bg-white dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
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
                      className="animate-spin text-indigo-600"
                      size={24}
                    />
                    <span>Carregando base de usuários...</span>
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
                      <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800">
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
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        user.role === 'master' || user.role === 'admin'
                          ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
                          : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                      }`}
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
                      {/* Ao clicar, chama a função de confirmação visual */}
                      <button
                        onClick={() => confirmAddTrial(user.id, user.email)}
                        disabled={updatingUser === user.id}
                        className="p-2 text-green-600 bg-green-50 border border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/40 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Adicionar +30 dias de acesso"
                      >
                        {updatingUser === user.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <CalendarPlus size={16} />
                        )}
                      </button>

                      <button
                        onClick={() => handleImpersonate(user.email)}
                        className="p-2 text-gray-400 border border-transparent hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/30 dark:hover:text-white dark:hover:border-indigo-800 rounded-lg transition-all"
                        title="Logar como este usuário"
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
  );
}
