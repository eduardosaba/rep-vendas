'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Settings } from '@/lib/types';
import { useToast } from '@/hooks/useToast';
import {
  Save,
  Loader2,
  Palette,
  Lock,
  Store,
  LayoutTemplate,
  UploadCloud,
  Check,
} from 'lucide-react';

export default function SettingsPage() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Estado inicial com valores padrão
  const [settings, setSettings] = useState<Settings>({
    user_id: '',
    name: '',
    email: '',
    phone: '',
    primary_color: '#4F46E5', // Indigo padrão
    catalog_slug: '',
    catalog_price_password: '',
    show_filter_price: true,
    show_filter_category: true,
    show_installments: true,
    show_shipping: true,
  });

  // Carregar Configurações
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        setUserId(user.id);

        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (data) {
          setSettings(data);
        } else {
          // Se não existir, prepara o estado com o ID do utilizador para criar depois
          setSettings((prev) => ({ ...prev, user_id: user.id }));
        }
      } catch (error) {
        console.error(error);
        // Não mostramos erro aqui porque pode ser o primeiro acesso (sem settings criados)
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Salvar (Upsert)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);

    try {
      // Upsert: Cria se não existir, Atualiza se existir
      const { error } = await supabase.from('settings').upsert(
        {
          ...settings,
          user_id: userId, // Garante que o ID está correto
          updated_at: new Date().toISOString(), // Se tiver coluna updated_at
        },
        { onConflict: 'user_id' }
      );

      if (error) throw error;

      addToast({ title: 'Configurações salvas com sucesso!', type: 'success' });
    } catch (error: any) {
      console.error(error);
      addToast({
        title: 'Erro ao salvar',
        description: error.message,
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  // Handler genérico para inputs de texto
  const handleChange = (field: keyof Settings, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Configurações da Loja
          </h1>
          <p className="text-sm text-gray-500">
            Personalize o seu catálogo e preferências
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-70"
        >
          {saving ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <Save size={20} />
          )}
          Salvar Alterações
        </button>
      </div>

      <form
        onSubmit={handleSave}
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
      >
        {/* Coluna Esquerda: Identidade e Marca */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Informações Básicas */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 border-b pb-3">
              <Store size={20} className="text-gray-400" /> Informações da Loja
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Loja
                </label>
                <input
                  type="text"
                  value={settings.name || ''}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ex: Calçados Silva"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email de Contato
                </label>
                <input
                  type="email"
                  value={settings.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="tel"
                  value={settings.phone || ''}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug do Catálogo (Link)
                </label>
                <div className="flex items-center">
                  <span className="bg-gray-100 border border-r-0 rounded-l-lg px-3 py-2 text-gray-500 text-sm">
                    repvendas.com/catalog/
                  </span>
                  <input
                    type="text"
                    value={settings.catalog_slug || ''}
                    onChange={(e) =>
                      handleChange(
                        'catalog_slug',
                        e.target.value.toLowerCase().replace(/\s+/g, '-')
                      )
                    }
                    className="flex-1 p-2 border rounded-r-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="minha-loja"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card: Aparência */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 border-b pb-3">
              <Palette size={20} className="text-gray-400" /> Aparência
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cor Principal
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings.primary_color || '#4F46E5'}
                  onChange={(e) =>
                    handleChange('primary_color', e.target.value)
                  }
                  className="h-10 w-20 rounded cursor-pointer border p-1"
                />
                <div className="text-sm text-gray-500">
                  Usada em botões, links e destaques do seu catálogo.
                </div>
              </div>
            </div>

            {/* Upload de Logo (Simplificado - usa URL por enquanto ou componente de upload futuro) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL do Logo
              </label>
              <input
                type="text"
                value={settings.logo_url || ''}
                onChange={(e) => handleChange('logo_url', e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="https://..."
              />
              <p className="text-xs text-gray-400 mt-1">
                Para fazer upload, use a aba de Produtos &gt; Importar Fotos e
                copie o link.
              </p>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Configurações Técnicas */}
        <div className="space-y-6">
          {/* Card: Segurança (Acesso Restrito) */}
          <div className="bg-white p-6 rounded-xl border border-orange-200 bg-orange-50/30 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 border-b pb-3">
              <Lock size={20} className="text-orange-500" /> Acesso e Preços
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Senha do Catálogo
              </label>
              <input
                type="text"
                value={settings.catalog_price_password || ''}
                onChange={(e) =>
                  handleChange('catalog_price_password', e.target.value)
                }
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none font-mono"
                placeholder="Ex: 12345"
              />
              <p className="text-xs text-gray-500 mt-2">
                Se definido, os clientes precisarão desta senha para ver os
                preços dos produtos.
              </p>
            </div>
          </div>

          {/* Card: Opções de Exibição */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 border-b pb-3">
              <LayoutTemplate size={20} className="text-gray-400" /> Exibição
            </h3>

            <div className="space-y-3">
              <Toggle
                label="Mostrar Filtro de Preço"
                checked={settings.show_filter_price}
                onChange={(v) => handleChange('show_filter_price', v)}
              />
              <Toggle
                label="Mostrar Categorias"
                checked={settings.show_filter_category}
                onChange={(v) => handleChange('show_filter_category', v)}
              />
              <Toggle
                label="Mostrar info de Parcelamento"
                checked={settings.show_installments}
                onChange={(v) => handleChange('show_installments', v)}
              />
              <Toggle
                label="Mostrar info de Frete"
                checked={settings.show_shipping}
                onChange={(v) => handleChange('show_shipping', v)}
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

// Componente Auxiliar de Toggle
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked || false}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
      </div>
    </label>
  );
}
