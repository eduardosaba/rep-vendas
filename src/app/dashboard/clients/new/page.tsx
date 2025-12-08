'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Loader2,
  Save,
  User,
  MapPin,
  Phone,
  Mail,
} from 'lucide-react';
import Link from 'next/link';

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '', // Endereço ou Cidade/Estado
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast('Nome é obrigatório');
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Inserir Cliente no Banco
      const { error } = await supabase.from('clients').insert({
        user_id: user.id,
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null, // Mapeando para o campo existente na tabela
      });

      if (error) throw error;

      toast.success('Cliente cadastrado com sucesso!');
      router.push('/dashboard/clients');
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao guardar', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/clients"
          className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Novo Cliente</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-900 border-b pb-2">
              <User className="rv-text-primary" size={20} />
              <h3>Dados Pessoais</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome Completo *
              </label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="Ex: João Silva"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="joao@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-900 border-b pb-2">
              <MapPin className="rv-text-primary" size={20} />
              <h3>Localização</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Endereço Completo
              </label>
              <textarea
                rows={3}
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Rua, Número, Bairro, Cidade - UF"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href="/dashboard/clients"
            className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="rv-btn-primary px-6 py-2.5 rounded-lg text-white font-medium flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Save size={20} />
            )}
            Guardar Cliente
          </button>
        </div>
      </form>
    </div>
  );
}
