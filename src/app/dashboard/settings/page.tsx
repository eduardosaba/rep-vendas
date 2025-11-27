'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/useToast';
import {
  Save,
  Loader2,
  UploadCloud,
  Store,
  Palette,
  Phone,
  Globe,
  Lock,
  MessageSquare,
  Image as ImageIcon,
  X,
  Plus,
} from 'lucide-react';

export default function SettingsPage() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'appearance'>(
    'general'
  );

  // Estados do Formulário
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    catalog_slug: '',
    primary_color: '#0d1b2c',
    price_password: '123456',
    footer_message: '',
  });

  // Imagens
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // Banners
  const [currentBanners, setCurrentBanners] = useState<string[]>([]);
  const [newBannerFiles, setNewBannerFiles] = useState<File[]>([]);
  const [newBannerPreviews, setNewBannerPreviews] = useState<string[]>([]);

  // 1. Carregar Dados Atuais
  useEffect(() => {
    const loadSettings = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: settings } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (settings) {
        setFormData({
          name: settings.name || '',
          phone: settings.phone || '',
          email: settings.email || '',
          catalog_slug: settings.catalog_slug || '',
          primary_color: settings.primary_color || '#0d1b2c',
          price_password: settings.price_password || '123456',
          footer_message: settings.footer_message || '',
        });
        setLogoPreview(settings.logo_url);

        // Carrega banners existentes (JSONB array)
        if (Array.isArray(settings.banners)) {
          setCurrentBanners(settings.banners);
        }
      }
      setLoading(false);
    };

    loadSettings();
  }, []);

  // 2. Manipuladores
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setNewBannerFiles((prev) => [...prev, ...files]);
      const previews = files.map((f) => URL.createObjectURL(f));
      setNewBannerPreviews((prev) => [...prev, ...previews]);
    }
  };

  const removeCurrentBanner = (index: number) => {
    setCurrentBanners((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewBanner = (index: number) => {
    setNewBannerFiles((prev) => prev.filter((_, i) => i !== index));
    setNewBannerPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // 3. Salvar Alterações
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let logoUrl = logoPreview;

      // Upload Logo
      if (logoFile && userId) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logo-${userId}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(`public/${fileName}`, logoFile);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage
          .from('product-images')
          .getPublicUrl(`public/${fileName}`);
        logoUrl = data.publicUrl;
      }

      // Upload Novos Banners
      const uploadedBanners = [];
      if (newBannerFiles.length > 0 && userId) {
        for (const file of newBannerFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `banner-${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(`public/${fileName}`, file);
          if (!uploadError) {
            const { data } = supabase.storage
              .from('product-images')
              .getPublicUrl(`public/${fileName}`);
            uploadedBanners.push(data.publicUrl);
          }
        }
      }

      // Combinar banners antigos (que não foram removidos) com os novos
      const finalBanners = [...currentBanners, ...uploadedBanners];

      // Atualiza tabela settings
      const { error } = await supabase
        .from('settings')
        .update({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          primary_color: formData.primary_color,
          logo_url: logoUrl,
          price_password: formData.price_password,
          footer_message: formData.footer_message,
          banners: finalBanners,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) throw error;

      // Limpar estados temporários de banner
      setNewBannerFiles([]);
      setNewBannerPreviews([]);
      setCurrentBanners(finalBanners);

      addToast({ title: 'Configurações salvas!', type: 'success' });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header Fixo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Configurações da Loja
          </h1>
          <p className="text-sm text-gray-500">
            Personalize o visual e as informações do seu catálogo.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-70 transition-colors shadow-sm font-medium w-full sm:w-auto"
        >
          {saving ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <Save size={20} />
          )}
          Salvar Tudo
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('general')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === 'general'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Informações Gerais
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === 'appearance'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Aparência e Banners
          </button>
        </nav>
      </div>

      {/* CONTEÚDO DA ABA: GERAL */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-left-4 duration-300">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-2 border-b pb-2">
              <Store size={18} className="text-gray-400" /> Dados da Empresa
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Loja
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full rounded-lg border-gray-300 border px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Phone size={14} /> WhatsApp / Telefone
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full rounded-lg border-gray-300 border px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email de Contato
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full rounded-lg border-gray-300 border px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-2 border-b pb-2">
              <Lock size={18} className="text-gray-400" /> Segurança do Catálogo
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha dos Preços
                </label>
                <input
                  type="text"
                  name="price_password"
                  value={formData.price_password}
                  onChange={handleChange}
                  className="w-full rounded-lg border-gray-300 border px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  placeholder="Ex: 123456"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Oculte os preços dos seus produtos. O cliente precisará
                  digitar esta senha para ver os valores.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 self-start">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Globe size={14} /> Link do Catálogo
                  </span>
                  <a
                    href={`/catalog/${formData.catalog_slug}`}
                    target="_blank"
                    className="text-indigo-600 hover:underline text-xs font-bold"
                  >
                    Visitar Loja
                  </a>
                </div>
                <div className="truncate text-sm text-gray-500 font-mono break-all">
                  repvendas.com/catalog/
                  <span className="font-bold text-gray-900">
                    {formData.catalog_slug}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-2 border-b pb-2">
              <MessageSquare size={18} className="text-gray-400" /> Mensagens
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mensagem de Rodapé
              </label>
              <textarea
                rows={2}
                name="footer_message"
                value={formData.footer_message}
                onChange={handleChange}
                className="w-full rounded-lg border-gray-300 border px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Ex: Enviamos para todo o Brasil. Consulte frete."
              />
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA: APARÊNCIA */}
      {activeTab === 'appearance' && (
        <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-2 border-b pb-2">
              <Palette size={18} className="text-gray-400" /> Identidade Visual
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Logotipo
                </label>
                <div className="flex items-center gap-4">
                  <div className="h-24 w-24 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center overflow-hidden bg-gray-50">
                    {logoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logoPreview}
                        alt="Logo"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <UploadCloud className="text-gray-400" />
                    )}
                  </div>
                  <label className="cursor-pointer bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors">
                    Alterar Logo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Cor da Marca
                </label>
                <div className="flex gap-4 items-center p-3 border border-gray-100 rounded-xl bg-gray-50">
                  <input
                    type="color"
                    name="primary_color"
                    value={formData.primary_color}
                    onChange={handleChange}
                    className="h-12 w-12 rounded cursor-pointer border-0 p-0 shadow-sm"
                  />
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {formData.primary_color}
                    </p>
                    <p className="text-xs text-gray-500">
                      Usada no cabeçalho e botões.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-2 border-b pb-2">
              <ImageIcon size={18} className="text-gray-400" /> Banners do
              Catálogo
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Adicione imagens promocionais para aparecer no topo da sua loja.
              (Formato recomendado: 1200x300px)
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Banners Atuais */}
              {currentBanners.map((url, index) => (
                <div
                  key={`old-${index}`}
                  className="relative aspect-[3/1] bg-gray-100 rounded-lg overflow-hidden border border-gray-200 group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt="Banner"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeCurrentBanner(index)}
                    className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}

              {/* Novos Banners */}
              {newBannerPreviews.map((url, index) => (
                <div
                  key={`new-${index}`}
                  className="relative aspect-[3/1] bg-gray-50 rounded-lg overflow-hidden border border-green-200 ring-2 ring-green-100 group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt="Novo Banner"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeNewBanner(index)}
                    className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  >
                    <X size={14} />
                  </button>
                  <div className="absolute bottom-0 inset-x-0 bg-green-600 text-white text-[10px] text-center py-1 font-bold uppercase">
                    Novo
                  </div>
                </div>
              ))}

              {/* Botão Adicionar */}
              <label className="cursor-pointer flex flex-col items-center justify-center aspect-[3/1] border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Plus size={32} className="text-gray-400 mb-2" />
                <span className="text-sm font-medium text-gray-600">
                  Adicionar Banner
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handleBannerChange}
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
