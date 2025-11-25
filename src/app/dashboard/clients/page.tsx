'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Client } from '@/lib/types';
import Link from 'next/link';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  User,
  MapPin,
  Phone,
  Mail,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';

export default function ClientsPage() {
  const { addToast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Carregar Clientes
  const fetchClients = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error(error);
      addToast({ title: 'Erro ao carregar clientes', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Apagar Cliente
  const handleDelete = async (id: string) => {
    if (
      !confirm(
        'Tem a certeza que deseja apagar este cliente? O histórico de pedidos poderá ser afetado.'
      )
    )
      return;

    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;

      setClients(clients.filter((c) => c.id !== id));
      addToast({ title: 'Cliente removido com sucesso', type: 'success' });
    } catch (error) {
      addToast({ title: 'Erro ao remover', type: 'error' });
    }
  };

  // Filtro de pesquisa
  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meus Clientes</h1>
          <p className="text-sm text-gray-500">
            Gerencie a sua carteira de clientes
          </p>
        </div>

        <Link
          href="/dashboard/clients/new"
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus size={18} />
          Novo Cliente
        </Link>
      </div>

      {/* Barra de Pesquisa */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Pesquisar por nome, email ou telefone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
        />
      </div>

      {/* Lista de Clientes (Cards para melhor adaptação mobile/desktop) */}
      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-indigo-600 h-8 w-8" />
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <User className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <h3 className="text-lg font-medium text-gray-900">
            Nenhum cliente encontrado
          </h3>
          <p className="text-gray-500 mt-1">
            Adicione o seu primeiro cliente para começar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="group relative flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-all hover:border-indigo-200"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 font-bold">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded">
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(client.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900">{client.name}</h3>
                  {client.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <Mail size={14} />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <Phone size={14} />
                      <span>{client.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {client.address && (
                <div className="mt-4 pt-4 border-t border-gray-50">
                  <div className="flex items-start gap-2 text-xs text-gray-500">
                    <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{client.address}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
