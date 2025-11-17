'use client';

import { useEffect, useState, FormEvent } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Edit,
  Trash2,
  Users,
  User,
  Phone,
  Mail,
  MapPin,
  Save,
  X,
} from 'lucide-react';

interface User {
  id: string;
  email?: string;
}

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  user_id: string;
  created_at: string;
}

interface ClientFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export default function ClientsPage() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        setUser(user);
        loadClients(user.id);
      }
    };
    getUser();
  }, [router]);

  const loadClients = async (userId: string) => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data && !error) {
      setClients(data);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const clientData = {
      user_id: user.id,
      name: formData.name.trim(),
      email: formData.email?.trim() || null,
      phone: formData.phone?.trim() || null,
      address: formData.address?.trim() || null,
    };

    try {
      if (editingClient) {
        // Atualizar cliente existente
        const { error } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', editingClient.id)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Criar novo cliente
        const { error } = await supabase.from('clients').insert(clientData);

        if (error) throw error;
      }

      // Recarregar clientes
      loadClients(user.id);

      // Resetar formulário
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
      });
      setEditingClient(null);
      setShowModal(false);
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      alert('Erro ao salvar cliente. Tente novamente.');
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (clientId: string) => {
    if (!user) return;

    if (!confirm('Tem certeza que deseja excluir este cliente?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId)
        .eq('user_id', user.id);

      if (error) throw error;

      loadClients(user.id);
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      alert('Erro ao excluir cliente. Tente novamente.');
    }
  };

  const openModal = () => {
    setEditingClient(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
    });
    setShowModal(true);
  };

  if (!user) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Gerenciar Clientes
            </h1>
            <p>Adicione e gerencie os clientes do seu catálogo</p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Voltar ao Dashboard
            </button>
            <button
              onClick={openModal}
              className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus className="mr-2 h-5 w-5" />
              Novo Cliente
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Stats */}
          <div className="mb-8">
            <div className="overflow-hidden rounded-lg bg-white shadow">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="truncate text-sm font-medium text-gray-500">
                        Total de Clientes
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {clients.length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Clients Table */}
          <div className="overflow-hidden bg-white shadow sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {clients.map((client) => (
                <li key={client.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
                            <User className="h-5 w-5 text-gray-500" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center">
                            <h3 className="text-sm font-medium text-gray-900">
                              {client.name}
                            </h3>
                          </div>
                          <div className="mt-1 flex items-center space-x-4">
                            {client.email && (
                              <div className="flex items-center text-sm text-gray-500">
                                <Mail className="mr-1 h-4 w-4" />
                                {client.email}
                              </div>
                            )}
                            {client.phone && (
                              <div className="flex items-center text-sm text-gray-500">
                                <Phone className="mr-1 h-4 w-4" />
                                {client.phone}
                              </div>
                            )}
                          </div>
                          {client.address && (
                            <div className="mt-1 flex items-center text-sm text-gray-500">
                              <MapPin className="mr-1 h-4 w-4" />
                              {client.address}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(client)}
                          className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(client.id)}
                          className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {clients.length === 0 && (
              <div className="py-16 text-center">
                <Users className="mx-auto mb-4 h-24 w-24 text-gray-300" />
                <h3 className="mb-2 text-xl font-medium text-gray-900">
                  Nenhum cliente cadastrado
                </h3>
                <p className="mb-6 text-gray-600">
                  Comece adicionando seu primeiro cliente.
                </p>
                <button
                  onClick={openModal}
                  className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Adicionar Primeiro Cliente
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 h-full w-full overflow-y-auto bg-gray-600 bg-opacity-50">
          <div className="relative top-20 mx-auto w-full max-w-lg rounded-md border bg-white p-5 shadow-lg">
            <div className="mt-3">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Nome do Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    placeholder="Nome completo do cliente"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    placeholder="cliente@email.com"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Endereço
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                    className="h-20 w-full rounded border border-gray-300 px-3 py-2"
                    placeholder="Endereço completo"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {editingClient ? 'Atualizar' : 'Salvar'} Cliente
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
