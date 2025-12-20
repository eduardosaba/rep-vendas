'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Loader2,
  Save,
  User,
  MapPin,
  Phone,
  Mail,
  Building,
} from 'lucide-react';
import Link from 'next/link';

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    document: '', // CPF/CNPJ opcional
    address: '',
    city: '',
    state: '',
  });

  // Máscara simples de telefone (BR)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);

    // (11) 99999-9999
    if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    }
    if (value.length > 9) {
      value = `${value.slice(0, 9)}-${value.slice(9)}`;
    }

    setFormData({ ...formData, phone: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.warning('Nome é obrigatório');
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Sessão inválida');

      // Formatar endereço completo se tiver cidade/estado
      let fullAddress = formData.address;
      if (formData.city) fullAddress += ` - ${formData.city}`;
      if (formData.state) fullAddress += ` / ${formData.state}`;

      const { error } = await supabase.from('clients').insert({
        user_id: user.id,
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.replace(/\D/g, '') || null, // Salva apenas números
        document: formData.document.trim() || null,
        address: fullAddress.trim() || null,
      });

      if (error) throw error;

      toast.success('Cliente cadastrado com sucesso!');
      router.push('/dashboard/clients');
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao salvar', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex items-center justify-between sticky top-0 z-30 bg-gray-50/90 dark:bg-slate-950/90 backdrop-blur-md py-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/clients"
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Novo Cliente
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Preencha os dados abaixo
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* DADOS PESSOAIS */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-slate-800">
            <User className="text-blue-600 dark:text-blue-400" size={20} />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Dados Pessoais
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nome Completo <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                placeholder="Ex: João Silva"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-10 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                  placeholder="joao@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Telefone / WhatsApp
              </label>
              <div className="relative">
                <Phone
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  maxLength={15}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-10 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                CPF / CNPJ{' '}
                <span className="text-xs text-gray-400 font-normal">
                  (Opcional)
                </span>
              </label>
              <div className="relative">
                <Building
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  type="text"
                  value={formData.document}
                  onChange={(e) =>
                    setFormData({ ...formData, document: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-10 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                  placeholder="000.000.000-00"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ENDEREÇO */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-slate-800">
            <MapPin className="text-blue-600 dark:text-blue-400" size={20} />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Localização
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Endereço (Rua, Número, Bairro)
              </label>
              <textarea
                rows={2}
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all resize-none"
                placeholder="Ex: Rua das Flores, 123, Centro"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                  placeholder="Ex: São Paulo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Estado (UF)
                </label>
                <input
                  type="text"
                  maxLength={2}
                  value={formData.state}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      state: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all uppercase"
                  placeholder="SP"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-3 pt-4">
          <Link
            href="/dashboard/clients"
            className="px-6 py-2.5 rounded-lg border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-2.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 shadow-md active:scale-95 transition-all"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Save size={20} />
            )}
            Salvar Cliente
          </button>
        </div>
      </form>
    </div>
  );
}
