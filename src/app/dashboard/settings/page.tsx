'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
// Substituindo o hook customizado pela lib direta
import { toast } from 'sonner';
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
  DollarSign,
  Zap,
  Tag,
  Eye,
  Package,
  AlertTriangle,
  Check,
  Brush,
} from 'lucide-react';

interface CatalogSettings {
  show_top_benefit_bar: boolean;
  top_benefit_text: string;
  show_installments: boolean;
  max_installments: string;
  show_discount_tag: boolean;
  cash_price_discount_percent: string;
  enable_stock_management: boolean;
  global_allow_backorder: boolean;
}

// --- PREDEFINIÇÕES DE TEMA ---
const THEME_PRESETS = [
  {
    name: 'Padrão (Rep-Vendas)',
    primary: '#b9722e',
    secondary: '#0d1b2c',
    header: '#ffffff',
  },
  {
    name: 'Minimalista Dark',
    primary: '#e4e4e7',
    secondary: '#18181b',
    header: '#09090b',
  },
  {
    name: 'Varejo Hot (Ofertas)',
    primary: '#fbbf24',
    secondary: '#dc2626',
    header: '#ffffff',
  },
  {
    name: 'Natureza & Saúde',
    primary: '#86efac',
    secondary: '#15803d',
    header: '#FFFFFF',
  },
  {
    name: 'Tech & Inovação',
    primary: '#60a5fa',
    secondary: '#2563eb',
    header: '#FFFFFF',
  },
  {
    name: 'Moda & Boutique',
    primary: '#fbcfe8',
    secondary: '#be185d',
    header: '#FFFFFF',
  },
  {
    name: 'Luxo & Gold',
    primary: '#cca43b',
    secondary: '#000000',
    header: '#1c1c1c',
  },
  {
    name: 'Roxo Criativo',
    primary: '#d8b4fe',
    secondary: '#7e22ce',
    header: '#FFFFFF',
  },
];

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<
    'general' | 'appearance' | 'display' | 'stock'
  >('general');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    catalog_slug: '',
    primary_color: '#0d1b2c',
    secondary_color: '#b9722e',
    header_background_color: '#ffffff',
    price_password: '123456',
    footer_message: '',
  });

  const [catalogSettings, setCatalogSettings] = useState<CatalogSettings>({
    show_top_benefit_bar: false,
    top_benefit_text: '',
    show_installments: false,
    max_installments: '12',
    show_discount_tag: false,
    cash_price_discount_percent: '5',
    enable_stock_management: false,
    global_allow_backorder: false,
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [currentBanners, setCurrentBanners] = useState<string[]>([]);
  const [newBannerFiles, setNewBannerFiles] = useState<
    {
      file: File;
      preview: string;
      width?: number;
      height?: number;
      tooSmall?: boolean;
    }[]
  >([]);
  const RECOMMENDED_BANNER = { width: 1400, height: 400 };
  const [logoUploading, setLogoUploading] = useState(false);
  const [uploadingBannerIndex, setUploadingBannerIndex] = useState<
    number | null
  >(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
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
            secondary_color: settings.secondary_color || '#b9722e',
            header_background_color:
              settings.header_background_color || '#ffffff',
            price_password: settings.price_password || '123456',
            footer_message: settings.footer_message || '',
          });
          setLogoPreview(settings.logo_url);

          setCatalogSettings({
            show_top_benefit_bar: settings.show_top_benefit_bar ?? false,
            top_benefit_text: settings.top_benefit_text || '',
            show_installments: settings.show_installments ?? false,
            max_installments: String(settings.max_installments || 12),
            show_discount_tag: settings.show_discount_tag ?? false,
            cash_price_discount_percent: String(
              settings.cash_price_discount_percent || 5
            ),
            enable_stock_management: settings.enable_stock_management ?? false,
            global_allow_backorder: settings.global_allow_backorder ?? false,
          });

          if (Array.isArray(settings.banners)) {
            setCurrentBanners(settings.banners);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    setFormData((prev) => ({ ...prev, catalog_slug: value }));
  };

  const handleCatalogSettingsChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setCatalogSettings((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
      setCatalogSettings((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files);
    const processed = await Promise.all(
      files.map(
        (file) =>
          new Promise<{
            file: File;
            preview: string;
            width?: number;
            height?: number;
            tooSmall?: boolean;
          }>((resolve) => {
            const preview = URL.createObjectURL(file);
            const img = new Image();
            img.src = preview;
            img.onload = () => {
              const w = img.naturalWidth;
              const h = img.naturalHeight;
              const tooSmall =
                w < RECOMMENDED_BANNER.width || h < RECOMMENDED_BANNER.height;
              resolve({ file, preview, width: w, height: h, tooSmall });
            };
            img.onerror = () => {
              resolve({ file, preview, tooSmall: true });
            };
          })
      )
    );

    // warn for small images
    processed.forEach((p) => {
      if (p.tooSmall) {
        toast(
          `Imagem ${p.file.name} menor que o recomendado (${RECOMMENDED_BANNER.width}x${RECOMMENDED_BANNER.height})`,
          { description: 'A qualidade pode ficar ruim em displays grandes' }
        );
      }
    });

    setNewBannerFiles((prev) => [...prev, ...processed]);
  };

  const removeNewBannerFile = (index: number) =>
    setNewBannerFiles((prev) => prev.filter((_, i) => i !== index));

  // --- FUNÇÃO PARA APLICAR TEMA ---
  const applyTheme = (theme: (typeof THEME_PRESETS)[0]) => {
    setFormData((prev) => ({
      ...prev,
      primary_color: theme.primary,
      secondary_color: theme.secondary,
      header_background_color: theme.header,
    }));
    toast.success(`Tema ${theme.name} selecionado!`, {
      description: 'Clique em Salvar para confirmar.',
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let logoUrl = logoPreview;

      if (logoFile && userId) {
        setLogoUploading(true);
        try {
          const fileExt = logoFile.name.split('.').pop();
          const fileName = `logo-${userId}-${Date.now()}.${fileExt}`;
          const { error } = await supabase.storage
            .from('product-images')
            .upload(`public/${fileName}`, logoFile);
          if (!error) {
            const { data } = supabase.storage
              .from('product-images')
              .getPublicUrl(`public/${fileName}`);
            logoUrl = data.publicUrl;
          }
        } finally {
          setLogoUploading(false);
        }
      }

      const uploadedBanners = [];
      if (newBannerFiles.length > 0 && userId) {
        for (let i = 0; i < newBannerFiles.length; i++) {
          const item = newBannerFiles[i];
          const file = item.file;
          setUploadingBannerIndex(i);
          const fileExt = file.name.split('.').pop();
          const fileName = `banner-${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}.${fileExt}`;
          const { error } = await supabase.storage
            .from('product-images')
            .upload(`public/${fileName}`, file);
          if (!error) {
            const { data } = await supabase.storage
              .from('product-images')
              .getPublicUrl(`public/${fileName}`);
            uploadedBanners.push(data.publicUrl);
          }
        }
        setUploadingBannerIndex(null);
      }

      const finalBanners = [...currentBanners, ...uploadedBanners];

      const { error } = await supabase
        .from('settings')
        .update({
          ...formData,
          logo_url: logoUrl,
          catalog_slug: formData.catalog_slug,
          banners: finalBanners,
          updated_at: new Date().toISOString(),
          show_top_benefit_bar: catalogSettings.show_top_benefit_bar,
          top_benefit_text: catalogSettings.top_benefit_text,
          show_installments: catalogSettings.show_installments,
          max_installments: Number(catalogSettings.max_installments),
          show_discount_tag: catalogSettings.show_discount_tag,
          cash_price_discount_percent: Number(
            catalogSettings.cash_price_discount_percent
          ),
          enable_stock_management: catalogSettings.enable_stock_management,
          global_allow_backorder: catalogSettings.global_allow_backorder,
        })
        .eq('user_id', userId);

      if (error) {
        if (error.code === '23505')
          throw new Error('Este link da loja já está em uso.');
        throw error;
      }

      setNewBannerFiles([]);
      setCurrentBanners(finalBanners);

      toast.success('Configurações salvas!');
    } catch (error: any) {
      toast.error('Erro ao salvar', { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const ToggleSetting = ({
    label,
    name,
    description,
    checked,
    onChange,
    icon: Icon,
  }: any) => (
    <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-start gap-3">
        <Icon size={20} className="text-indigo-500 mt-0.5 flex-shrink-0" />
        <div>
          <label
            htmlFor={name}
            className="font-medium text-gray-900 cursor-pointer"
          >
            {label}
          </label>
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>
      </div>
      <input
        type="checkbox"
        id={name}
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
      />
    </div>
  );

  if (loading)
    return (
      <div className="flex justify-center h-96 items-center">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-70"
        >
          {saving ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <Save size={20} />
          )}{' '}
          Salvar
        </button>
      </div>

      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="-mb-px flex space-x-8">
          {['general', 'appearance', 'display', 'stock'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm capitalize whitespace-nowrap ${activeTab === tab ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {
                {
                  general: 'Geral',
                  appearance: 'Aparência',
                  display: 'Exibição',
                  stock: 'Estoque & Logística',
                }[tab as string]
              }
            </button>
          ))}
        </nav>
      </div>

      {/* ABA: GERAL */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-left-4 duration-300">
          <div className="bg-white p-6 rounded-xl border shadow-sm md:col-span-2 space-y-4">
            <h3 className="font-semibold text-gray-900 flex gap-2">
              <Store size={18} /> Dados da Loja
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Nome</label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Telefone/Zap</label>
                <input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <input
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900 flex gap-2">
              <Lock size={18} /> Acesso e Segurança
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link do Catálogo
              </label>
              <div className="flex">
                <span className="bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg px-3 py-2 text-gray-500 text-sm hidden sm:flex items-center">
                  repvendas.com/
                </span>
                <input
                  type="text"
                  name="catalog_slug"
                  value={formData.catalog_slug}
                  onChange={handleSlugChange}
                  className="flex-1 p-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-indigo-700 font-bold"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Senha de Preços</label>
              <input
                name="price_password"
                value={formData.price_password}
                onChange={handleChange}
                className="w-full p-2 border rounded font-mono"
                placeholder="123456"
              />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900 flex gap-2">
              <MessageSquare size={18} /> Mensagens
            </h3>
            <div>
              <label className="text-sm font-medium">Rodapé</label>
              <textarea
                name="footer_message"
                value={formData.footer_message}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                rows={3}
              />
            </div>
          </div>
        </div>
      )}

      {/* ABA: APARÊNCIA */}
      {activeTab === 'appearance' && (
        <div className="grid gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
          {/* SELEÇÃO DE TEMAS (NOVO) */}
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="font-semibold text-gray-900 flex gap-2 mb-4">
              <Brush size={18} /> Temas Predefinidos
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {THEME_PRESETS.map((theme, idx) => (
                <button
                  key={idx}
                  onClick={() => applyTheme(theme)}
                  className="border border-gray-200 rounded-lg p-3 hover:border-indigo-500 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex gap-1 mb-2 h-8 rounded-md overflow-hidden border border-gray-100">
                    <div
                      className="w-1/2 h-full"
                      style={{ backgroundColor: theme.primary }}
                    ></div>
                    <div
                      className="w-1/4 h-full"
                      style={{ backgroundColor: theme.secondary }}
                    ></div>
                    <div
                      className="w-1/4 h-full"
                      style={{ backgroundColor: theme.header }}
                    ></div>
                  </div>
                  <span className="text-xs font-medium text-gray-700 group-hover:text-indigo-600">
                    {theme.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
            <h3 className="font-semibold text-gray-900 flex gap-2">
              <Palette size={18} /> Ajuste Fino de Cores
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Cor Primária
                </label>
                <div className="flex items-center gap-3 p-2 border rounded bg-gray-50">
                  <input
                    type="color"
                    name="primary_color"
                    value={formData.primary_color}
                    onChange={handleChange}
                    className="h-10 w-10 rounded cursor-pointer"
                  />
                  <span className="text-sm font-mono">
                    {formData.primary_color}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Cor Secundária
                </label>
                <div className="flex items-center gap-3 p-2 border rounded bg-gray-50">
                  <input
                    type="color"
                    name="secondary_color"
                    value={formData.secondary_color}
                    onChange={handleChange}
                    className="h-10 w-10 rounded cursor-pointer"
                  />
                  <span className="text-sm font-mono">
                    {formData.secondary_color}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Fundo Header
                </label>
                <div className="flex items-center gap-3 p-2 border rounded bg-gray-50">
                  <input
                    type="color"
                    name="header_background_color"
                    value={formData.header_background_color}
                    onChange={handleChange}
                    className="h-10 w-10 rounded cursor-pointer"
                  />
                  <span className="text-sm font-mono">
                    {formData.header_background_color}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900 flex gap-2">
              <UploadCloud size={18} /> Logo
            </h3>
            <div className="flex items-center gap-4">
              <div className="relative h-24 w-24 border border-dashed rounded-lg flex items-center justify-center overflow-hidden bg-gray-50">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    className="w-full h-full object-contain"
                    alt="Logo"
                  />
                ) : (
                  <span className="text-xs text-gray-400">Sem Logo</span>
                )}
                {logoUploading && (
                  <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                    <Loader2 className="animate-spin" />
                  </div>
                )}
              </div>
              <input type="file" accept="image/*" onChange={handleLogoChange} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900 flex gap-2">
              <ImageIcon size={18} /> Banners
            </h3>
            <p className="text-xs text-gray-500">
              Tamanho recomendado: {RECOMMENDED_BANNER.width}x
              {RECOMMENDED_BANNER.height} px — use imagens em alta resolução
              para evitar perda de qualidade.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {currentBanners.map((b, i) => (
                <div
                  key={`cur-${i}`}
                  className="relative h-24 bg-gray-100 rounded overflow-hidden group"
                >
                  <img
                    src={b}
                    className="w-full h-full object-cover"
                    alt="Banner"
                  />
                  <button
                    onClick={() =>
                      setCurrentBanners((prev) =>
                        prev.filter((_, idx) => idx !== i)
                      )
                    }
                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              {newBannerFiles.map((item, idx) => (
                <div
                  key={`new-${idx}`}
                  className="relative h-24 bg-gray-50 rounded overflow-hidden group flex items-center justify-center"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.preview}
                    className="w-full h-full object-cover"
                    alt={item.file.name}
                  />
                  <button
                    onClick={() => removeNewBannerFile(idx)}
                    className="absolute top-1 right-1 bg-white text-red-500 p-1 rounded opacity-0 group-hover:opacity-100"
                  >
                    <X size={12} />
                  </button>
                  {item.tooSmall && (
                    <div className="absolute left-1 top-1 bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded">
                      {item.width}x{item.height}
                    </div>
                  )}
                  {uploadingBannerIndex === idx && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                      <Loader2 className="animate-spin" />
                    </div>
                  )}
                </div>
              ))}

              <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed rounded cursor-pointer hover:bg-gray-50">
                <Plus className="text-gray-400" />
                <span className="text-xs text-gray-500">Adicionar</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleBannerChange}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ABA: EXIBIÇÃO */}
      {activeTab === 'display' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900 flex gap-2">
              <Eye size={18} /> Opções de Exibição
            </h3>
            <ToggleSetting
              label="Mostrar Parcelamento"
              name="show_installments"
              description="Exibe 'ou 12x de R$...'."
              checked={catalogSettings.show_installments}
              onChange={handleCatalogSettingsChange}
              icon={Zap}
            />
            {catalogSettings.show_installments && (
              <div className="ml-8 mt-2">
                <label className="text-sm font-medium">Máx Parcelas</label>
                <input
                  type="number"
                  name="max_installments"
                  value={catalogSettings.max_installments}
                  onChange={handleCatalogSettingsChange}
                  className="ml-2 border p-1 rounded w-16"
                />
              </div>
            )}
            <ToggleSetting
              label="Barra de Benefícios"
              name="show_top_benefit_bar"
              description="Faixa no topo."
              checked={catalogSettings.show_top_benefit_bar}
              onChange={handleCatalogSettingsChange}
              icon={DollarSign}
            />
            {catalogSettings.show_top_benefit_bar && (
              <div className="ml-8 mt-2">
                <label className="text-sm font-medium">Texto</label>
                <input
                  type="text"
                  name="top_benefit_text"
                  value={catalogSettings.top_benefit_text}
                  onChange={handleCatalogSettingsChange}
                  className="ml-2 border p-1 rounded w-full max-w-md"
                />
              </div>
            )}
            <ToggleSetting
              label="Tag de Desconto"
              name="show_discount_tag"
              description="Mostra selo de % OFF."
              checked={catalogSettings.show_discount_tag}
              onChange={handleCatalogSettingsChange}
              icon={Tag}
            />
            {catalogSettings.show_discount_tag && (
              <div className="ml-8 mt-2">
                <label className="text-sm font-medium">Desc. à Vista (%)</label>
                <input
                  type="number"
                  name="cash_price_discount_percent"
                  value={catalogSettings.cash_price_discount_percent}
                  onChange={handleCatalogSettingsChange}
                  className="ml-2 border p-1 rounded w-16"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA: ESTOQUE */}
      {activeTab === 'stock' && (
        <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-2 border-b pb-2">
              <Package size={18} className="text-gray-400" /> Controle de
              Estoque
            </h3>
            <div className="space-y-6">
              <ToggleSetting
                label="Ativar Gestão de Estoque"
                name="enable_stock_management"
                description="Se ativado, você poderá definir a quantidade disponível de cada produto."
                checked={catalogSettings.enable_stock_management}
                onChange={handleCatalogSettingsChange}
                icon={Package}
              />
              {catalogSettings.enable_stock_management && (
                <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-lg ml-8 animate-in slide-in-from-top-2">
                  <h4 className="text-sm font-bold text-yellow-800 flex items-center gap-2 mb-2">
                    <AlertTriangle size={14} /> Política de Venda sem Estoque
                  </h4>
                  <ToggleSetting
                    label="Permitir Venda sem Estoque (Backorder)"
                    name="global_allow_backorder"
                    description="Se marcado, o cliente poderá comprar mesmo que o estoque seja 0."
                    checked={catalogSettings.global_allow_backorder}
                    onChange={handleCatalogSettingsChange}
                    icon={Zap}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
