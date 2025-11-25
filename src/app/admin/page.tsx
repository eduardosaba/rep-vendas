'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { UserProfile } from '@/lib/types';
import {
  Shield,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';

export default function AdminDashboard() {
  const { addToast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // --- CARREGAR DADOS ---
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar usuários:', error);
      addToast({ title: 'Erro ao carregar usuários', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // --- AÇÕES DE GESTÃO ---

  const updateUserStatus = async (userId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', userId);

      if (error) throw error;

      // Atualiza a lista localmente para feedback instantâneo
      setUsers(
        users.map((u) =>
          u.id === userId ? { ...u, status: newStatus as any } : u
        )
      );
      addToast({
        title: `Status atualizado para: ${newStatus}`,
        type: 'success',
      });
    } catch (error) {
      console.error(error);
      addToast({ title: 'Erro ao atualizar status', type: 'error' });
    }
  };

  const extendLicense = async (userId: string, days: number) => {
    try {
      // Calcular nova data (Hoje + dias)
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + days);
      const isoDate = newDate.toISOString();

      const { error } = await supabase
        .from('profiles')
        .update({
          license_expires_at: isoDate,
          status: 'active', // Reativa automaticamente ao estender
        })
        .eq('id', userId);

      if (error) throw error;

      setUsers(
        users.map((u) =>
          u.id === userId
            ? { ...u, license_expires_at: isoDate, status: 'active' }
            : u
        )
      );
      addToast({
        title: `Licença renovada por ${days} dias!`,
        type: 'success',
      });
    } catch (error) {
      addToast({ title: 'Erro ao renovar licença', type: 'error' });
    }
  };

  // --- RENDERIZAÇÃO AUXILIAR ---

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold">
            <CheckCircle size={12} /> Ativo
          </span>
        );
      case 'trial':
        return (
          <span className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">
            <Clock size={12} /> Trial
          </span>
        );
      case 'blocked':
        return (
          <span className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold">
            <XCircle size={12} /> Bloqueado
          </span>
        );
      default:
        return (
          <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
            {status}
          </span>
        );
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Shield className="text-indigo-600 h-8 w-8" />
              Torre de Controle
            </h1>
            <p className="text-gray-500 mt-1">
              Gerenciamento global de licenças e usuários.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white p-2 rounded-lg border shadow-sm">
            <Search className="text-gray-400 h-5 w-5 ml-2" />
            <input
              type="text"
              placeholder="Buscar usuário..."
              className="outline-none text-sm w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Stats Rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl border shadow-sm">
            <p className="text-xs text-gray-500 font-bold uppercase">
              Total de Usuários
            </p>
            <p className="text-2xl font-bold text-gray-900">{users.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border shadow-sm">
            <p className="text-xs text-gray-500 font-bold uppercase">
              Licenças Ativas
            </p>
            <p className="text-2xl font-bold text-green-600">
              {users.filter((u) => u.status === 'active').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border shadow-sm">
            <p className="text-xs text-gray-500 font-bold uppercase">
              Em Trial
            </p>
            <p className="text-2xl font-bold text-blue-600">
              {users.filter((u) => u.status === 'trial').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border shadow-sm">
            <p className="text-xs text-gray-500 font-bold uppercase">
              Bloqueados / Expirados
            </p>
            <p className="text-2xl font-bold text-red-600">
              {
                users.filter(
                  (u) => u.status === 'blocked' || u.status === 'inactive'
                ).length
              }
            </p>
          </div>
        </div>

        {/* Tabela de Usuários */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 border-b">
                <tr>
                  <th className="px-6 py-4 font-medium">Usuário</th>
                  <th className="px-6 py-4 font-medium">Cargo</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Expira em</th>
                  <th className="px-6 py-4 font-medium text-right">
                    Ações Rápidas
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                      Carregando dados...
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    // Proteção: Verifica se a data existe antes de calcular
                    const daysLeft = user.license_expires_at
                      ? Math.ceil(
                          (new Date(user.license_expires_at).getTime() -
                            new Date().getTime()) /
                            (1000 * 60 * 60 * 24)
                        )
                      : 0; // Se não tiver data, assume 0 dias restantes ou trata como 'Sem data'

                    const isExpired = daysLeft < 0;

                    return (
                      <tr
                        key={user.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">
                              {user.full_name || 'Sem nome'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {user.email}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-bold ${user.role === 'master' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}
                          >
                            {user.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(user.status)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-gray-400" />
                            <span
                              className={`${isExpired ? 'text-red-600 font-bold' : 'text-gray-700'}`}
                            >
                              {user.license_expires_at
                                ? new Date(
                                    user.license_expires_at
                                  ).toLocaleDateString('pt-BR')
                                : 'Sem data definida'}
                            </span>
                          </div>
                          <span
                            className={`text-xs ${isExpired ? 'text-red-500' : 'text-gray-400'}`}
                          >
                            {user.license_expires_at
                              ? isExpired
                                ? `Venceu há ${Math.abs(daysLeft)} dias`
                                : `Faltam ${daysLeft} dias`
                              : ''}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Botão Renovar (+30 dias) */}
                            <button
                              onClick={() => extendLicense(user.id, 30)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg tooltip"
                              title="Renovar por 30 dias"
                            >
                              <RefreshCw size={18} />
                            </button>

                            {/* Botão Bloquear/Desbloquear */}
                            {user.status === 'blocked' ? (
                              <button
                                onClick={() =>
                                  updateUserStatus(user.id, 'active')
                                }
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                title="Desbloquear"
                              >
                                <CheckCircle size={18} />
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  updateUserStatus(user.id, 'blocked')
                                }
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                title="Bloquear Acesso"
                              >
                                <XCircle size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
