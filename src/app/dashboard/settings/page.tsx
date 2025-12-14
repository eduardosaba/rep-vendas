'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Save,
  Loader2,
  UploadCloud,
  Store,
  Palette,
  Phone,
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
  Brush,
  CreditCard,
  Layout,
  Settings as SettingsIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

// --- Função Auxiliar de Contraste ---
function getContrastColor(hexColor: string): string {
  if (!hexColor) return '#ffffff';
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#0f172a' : '#ffffff';
}

interface CatalogSettings {
  show_top_benefit_bar: boolean;
  top_benefit_text: string;
  show_installments: boolean;
  max_installments: string;
  show_discount_tag: boolean;
  cash_price_discount_percent: string;
  enable_stock_management: boolean;
  global_allow_backorder: boolean;
  show_cost_price?: boolean;
  show_sale_price?: boolean;
}

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

// --- COMPONENTE TOGGLE MELHORADO ---
const ToggleSetting = ({
  label,
  name,
  description,
  checked,
  onChange,
  icon: Icon,
  children,
}: any) => (
  <div
    className={`p-4 bg-white dark:bg-slate-900 rounded-xl border transition-all ${
      checked
        ? 'border-indigo-500 ring-1 ring-indigo-500/20 shadow-sm'
        : 'border-gray-200 dark:border-slate-800'
    }`}
  >
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div
          className={`p-2 rounded-lg ${checked ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-400'}`}
        >
          <Icon size={18} />
        </div>
        <div>
          <label
            htmlFor={name}
            className="font-medium text-gray-900 dark:text-white cursor-pointer select-none block"
          >
            {label}
          </label>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      <label className="relative inline-flex items-center cursor-pointer shrink-0">
        <input
          type="checkbox"
          id={name}
          name={name}
          checked={checked}
          onChange={onChange}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
      </label>
    </div>

    {/* Conteúdo Expansível (Inputs de Configuração) */}
    {checked && children && (
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 animate-in slide-in-from-top-2 fade-in pl-[52px]">
        {children}
      </div>
    )}
  </div>
);

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'general' | 'appearance' | 'display' | 'stock'
  >('general');

  // Dados do Formulário
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
    show_cost_price: false,
    show_sale_price: true,
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [currentBanners, setCurrentBanners] = useState<string[]>([]);
  const [newBannerFiles, setNewBannerFiles] = useState<
    { file: File; preview: string; tooSmall?: boolean }[]
  >([]);

  const RECOMMENDED_BANNER = { width: 1400, height: 400 };
  const [logoUploading, setLogoUploading] = useState(false);

  // --- LIVE PREVIEW ---
  useEffect(() => {
    const root = document.documentElement;
    if (formData.primary_color) {
      root.style.setProperty('--primary', formData.primary_color);
      root.style.setProperty(
        '--primary-foreground',
        getContrastColor(formData.primary_color)
      );
    }
    if (formData.secondary_color) {
      root.style.setProperty('--secondary', formData.secondary_color);
      root.style.setProperty(
        '--secondary-foreground',
        getContrastColor(formData.secondary_color)
      );
    }
    if (formData.header_background_color) {
      root.style.setProperty('--header-bg', formData.header_background_color);
    }
  }, [
    formData.primary_color,
    formData.secondary_color,
    formData.header_background_color,
  ]);

  // --- CARREGAR DADOS ---
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: settings, error } = await supabase
          .from('settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) console.error('Erro ao buscar settings:', error);

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
            show_cost_price: settings.show_cost_price ?? false,
            show_sale_price: settings.show_sale_price ?? true,
          });

          if (Array.isArray(settings.banners)) {
            setCurrentBanners(settings.banners);
          }
        }
      } catch (error) {
        console.error('Erro Crítico ao carregar:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [supabase]);

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
          new Promise<{ file: File; preview: string; tooSmall?: boolean }>(
            (resolve) => {
              const preview = URL.createObjectURL(file);
              const img = new Image();
              img.src = preview;
              img.onload = () => {
                const tooSmall =
                  img.naturalWidth < RECOMMENDED_BANNER.width ||
                  img.naturalHeight < RECOMMENDED_BANNER.height;
                resolve({ file, preview, tooSmall });
              };
              img.onerror = () => resolve({ file, preview, tooSmall: true });
            }
          )
      )
    );
    processed.forEach((p) => {
      if (p.tooSmall)
        toast(`Imagem ${p.file.name} menor que o recomendado`, {
          description: 'Qualidade pode ser afetada.',
        });
    });
    setNewBannerFiles((prev) => [...prev, ...processed]);
  };

  const applyTheme = (theme: (typeof THEME_PRESETS)[0]) => {
    setFormData((prev) => ({
      ...prev,
      primary_color: theme.primary,
      secondary_color: theme.secondary,
      header_background_color: theme.header,
    }));
    toast.success(`Tema ${theme.name} aplicado!`);
  };

  // --- SALVAR ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user)
        throw new Error('Sessão expirada. Recarregue a página.');

      const currentUserId = user.id;
      let logoUrl = logoPreview;

      // Upload Logo
      if (logoFile) {
        setLogoUploading(true);
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logo-${currentUserId}-${Date.now()}.${fileExt}`;
        const { error } = await supabase.storage
          .from('product-images')
          .upload(`public/${fileName}`, logoFile);
        if (!error) {
          const { data } = supabase.storage
            .from('product-images')
            .getPublicUrl(`public/${fileName}`);
          logoUrl = data.publicUrl;
        }
        setLogoUploading(false);
      }

      // Upload Banners
      const uploadedBanners = [];
      if (newBannerFiles.length > 0) {
        for (let i = 0; i < newBannerFiles.length; i++) {
          const item = newBannerFiles[i];
          const fileExt = item.file.name.split('.').pop();
          const fileName = `banner-${currentUserId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}.${fileExt}`;
          const { error } = await supabase.storage
            .from('product-images')
            .upload(`public/${fileName}`, item.file);
          if (!error) {
            const { data } = await supabase.storage
              .from('product-images')
              .getPublicUrl(`public/${fileName}`);
            uploadedBanners.push(data.publicUrl);
          }
        }
      }

      const finalBanners = [...currentBanners, ...uploadedBanners];

      const { error } = await supabase.from('settings').upsert(
        {
          user_id: currentUserId,
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
          show_cost_price: catalogSettings.show_cost_price ?? false,
          show_sale_price: catalogSettings.show_sale_price ?? true,
        },
        { onConflict: 'user_id' }
      );

      if (error) {
        if (error.code === '23505')
          throw new Error('Este link da loja já está em uso.');
        throw error;
      }

      setNewBannerFiles([]);
      setCurrentBanners(finalBanners);
      toast.success('Configurações salvas com sucesso!');
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao salvar', { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center h-[50vh] items-center">
        <Loader2 className="animate-spin text-indigo-600 h-8 w-8" />
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'Geral', icon: Store },
    { id: 'appearance', label: 'Aparência', icon: Palette },
    { id: 'display', label: 'Exibição', icon: Layout },
    { id: 'stock', label: 'Estoque', icon: Package },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 p-4 sm:p-6 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-30 bg-gray-50/90 dark:bg-slate-950/90 backdrop-blur-md py-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <SettingsIcon className="text-gray-400" /> Configurações
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Personalize sua loja e catálogo.
          </p>
        </div>
        <Button
          onClick={handleSave}
          isLoading={saving}
          leftIcon={<Save size={18} />}
          variant="primary"
          className="px-6 py-2.5 shadow-md w-full sm:w-auto"
        >
          Salvar Alterações
        </Button>
      </div>

      {/* TABS */}
      <div className="border-b border-gray-200 dark:border-slate-800 overflow-x-auto scrollbar-hide">
        <nav className="-mb-px flex space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`group flex items-center gap-2 py-4 px-4 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-white dark:hover:border-slate-600'
                }`}
              >
                <Icon
                  size={18}
                  className={
                    isActive
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-400 group-hover:text-gray-500 dark:text-slate-500'
                  }
                />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* --- CONTEÚDO DAS ABAS --- */}

      {/* ABA: GERAL */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-left-4 duration-300">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm md:col-span-2 space-y-6">
            <h3 className="font-semibold text-gray-900 dark:text-white flex gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
              <Store size={18} className="text-indigo-500" /> Dados da Loja
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Nome da Loja
                </label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full p-2.5 border rounded-lg bg-gray-50 dark:bg-slate-950 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="Ex: Minha Loja Incrível"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block flex items-center gap-2">
                  <Phone size={14} /> Telefone/WhatsApp
                </label>
                <input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full p-2.5 border rounded-lg bg-gray-50 dark:bg-slate-950 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Email de Contato
                </label>
                <input
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full p-2.5 border rounded-lg bg-gray-50 dark:bg-slate-950 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="contato@loja.com"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-6">
            <h3 className="font-semibold text-gray-900 dark:text-white flex gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
              <Lock size={18} className="text-indigo-500" /> Acesso e Segurança
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Link do Catálogo
              </label>
              <div className="flex rounded-lg shadow-sm">
                <span className="bg-gray-100 dark:bg-slate-800 border border-r-0 border-gray-300 dark:border-slate-700 rounded-l-lg px-3 py-2.5 text-gray-500 text-sm hidden sm:flex items-center select-none">
                  loja.com/
                </span>
                <input
                  type="text"
                  name="catalog_slug"
                  value={formData.catalog_slug}
                  onChange={handleSlugChange}
                  className="flex-1 p-2.5 border border-gray-300 dark:border-slate-700 rounded-r-lg sm:rounded-l-none rounded-l-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-indigo-600 dark:text-indigo-400 font-bold bg-white dark:bg-slate-950"
                  placeholder="minha-loja"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Este será o endereço público da sua loja.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                Senha de Preços (Opcional)
              </label>
              <input
                name="price_password"
                value={formData.price_password}
                onChange={handleChange}
                className="w-full p-2.5 border rounded-lg font-mono bg-gray-50 dark:bg-slate-950 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="123456"
              />
              <p className="text-xs text-gray-500 mt-1">
                Se definido, o cliente precisará digitar para ver preços.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-6">
            <h3 className="font-semibold text-gray-900 dark:text-white flex gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
              <MessageSquare size={18} className="text-indigo-500" /> Mensagens
            </h3>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                Rodapé (Footer)
              </label>
              <textarea
                name="footer_message"
                value={formData.footer_message}
                onChange={handleChange}
                className="w-full p-2.5 border rounded-lg bg-gray-50 dark:bg-slate-950 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                rows={4}
                placeholder="Ex: Enviamos para todo o Brasil. Aceitamos Pix e Cartão."
              />
            </div>
          </div>
        </div>
      )}

      {/* ABA: APARÊNCIA */}
      {activeTab === 'appearance' && (
        <div className="grid gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-semibold text-gray-900 dark:text-white flex gap-2 mb-4">
              <Brush size={18} className="text-indigo-500" /> Temas Predefinidos
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {THEME_PRESETS.map((theme, idx) => (
                <button
                  key={idx}
                  onClick={() => applyTheme(theme)}
                  className="border border-gray-200 dark:border-slate-700 rounded-xl p-4 hover:border-indigo-500 hover:ring-2 hover:ring-indigo-500/20 transition-all text-left group bg-gray-50 dark:bg-slate-800/50"
                >
                  <div className="flex gap-1 mb-3 h-10 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-600 shadow-sm">
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
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    {theme.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-6">
            <h3 className="font-semibold text-gray-900 dark:text-white flex gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
              <Palette size={18} className="text-indigo-500" /> Cores
              Personalizadas
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Cor Primária
                </label>
                <div className="flex items-center gap-3 p-2 border rounded-lg bg-gray-50 dark:bg-slate-950 dark:border-slate-700">
                  <input
                    type="color"
                    name="primary_color"
                    value={formData.primary_color}
                    onChange={handleChange}
                    className="h-10 w-10 rounded cursor-pointer border-0 p-0 shadow-sm"
                  />
                  <span className="text-sm font-mono text-gray-600 dark:text-gray-400 uppercase">
                    {formData.primary_color}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Cor Secundária
                </label>
                <div className="flex items-center gap-3 p-2 border rounded-lg bg-gray-50 dark:bg-slate-950 dark:border-slate-700">
                  <input
                    type="color"
                    name="secondary_color"
                    value={formData.secondary_color}
                    onChange={handleChange}
                    className="h-10 w-10 rounded cursor-pointer border-0 p-0 shadow-sm"
                  />
                  <span className="text-sm font-mono text-gray-600 dark:text-gray-400 uppercase">
                    {formData.secondary_color}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Fundo do Header
                </label>
                <div className="flex items-center gap-3 p-2 border rounded-lg bg-gray-50 dark:bg-slate-950 dark:border-slate-700">
                  <input
                    type="color"
                    name="header_background_color"
                    value={formData.header_background_color}
                    onChange={handleChange}
                    className="h-10 w-10 rounded cursor-pointer border-0 p-0 shadow-sm"
                  />
                  <span className="text-sm font-mono text-gray-600 dark:text-gray-400 uppercase">
                    {formData.header_background_color}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-6">
            <h3 className="font-semibold text-gray-900 dark:text-white flex gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
              <UploadCloud size={18} className="text-indigo-500" /> Logo da Loja
            </h3>
            <div className="flex items-center gap-6">
              <div className="relative h-32 w-32 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-slate-950 hover:bg-gray-100 transition-colors">
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoPreview}
                    className="w-full h-full object-contain p-2"
                    alt="Logo Preview"
                  />
                ) : (
                  <div className="text-center p-2">
                    <ImageIcon
                      className="mx-auto text-gray-300 mb-1"
                      size={24}
                    />
                    <span className="text-xs text-gray-400 block">
                      Sem Logo
                    </span>
                  </div>
                )}
                {logoUploading && (
                  <div className="absolute inset-0 bg-white/80 dark:bg-black/80 flex items-center justify-center backdrop-blur-sm">
                    <Loader2 className="animate-spin text-indigo-600" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  id="logo-upload"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
                <label
                  htmlFor="logo-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                >
                  <UploadCloud size={16} />
                  Escolher Imagem
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  Recomendado: PNG Transparente ou JPG (500x500px)
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-6">
            <h3 className="font-semibold text-gray-900 dark:text-white flex gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
              <ImageIcon size={18} className="text-indigo-500" /> Banners
              Promocionais
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentBanners.map((b, i) => (
                <div
                  key={`cur-${i}`}
                  className="relative h-32 bg-gray-100 dark:bg-slate-800 rounded-xl overflow-hidden group shadow-sm border border-gray-200 dark:border-slate-700"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={b}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    alt="Banner"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  <button
                    onClick={() =>
                      setCurrentBanners((prev) =>
                        prev.filter((_, idx) => idx !== i)
                      )
                    }
                    className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 shadow-md hover:bg-red-600 transition-all transform scale-90 group-hover:scale-100"
                    title="Remover banner"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 hover:border-indigo-300 transition-all group">
                <div className="p-3 bg-gray-100 dark:bg-slate-800 rounded-full group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors mb-2">
                  <Plus
                    size={24}
                    className="text-gray-400 group-hover:text-indigo-600"
                  />
                </div>
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400 group-hover:text-indigo-600">
                  Adicionar Banner
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleBannerChange}
                />
              </label>
            </div>
            <p className="text-xs text-gray-400">
              Tamanho recomendado: 1400x400px
            </p>
          </div>
        </div>
      )}

      {/* ABA: EXIBIÇÃO */}
      {activeTab === 'display' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="grid gap-4">
            <ToggleSetting
              label="Mostrar Parcelamento"
              name="show_installments"
              description="Exibe 'ou 12x de R$' nos produtos."
              checked={catalogSettings.show_installments}
              onChange={handleCatalogSettingsChange}
              icon={CreditCard}
            >
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Máximo de Parcelas
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  name="max_installments"
                  value={catalogSettings.max_installments}
                  onChange={handleCatalogSettingsChange}
                  className="w-24 p-2 border rounded-lg bg-gray-50 dark:bg-slate-950 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </ToggleSetting>

            <ToggleSetting
              label="Barra de Benefícios"
              name="show_top_benefit_bar"
              description="Faixa colorida no topo da loja com aviso."
              checked={catalogSettings.show_top_benefit_bar}
              onChange={handleCatalogSettingsChange}
              icon={DollarSign}
            >
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Texto da Barra
                </label>
                <input
                  type="text"
                  name="top_benefit_text"
                  value={catalogSettings.top_benefit_text}
                  onChange={handleCatalogSettingsChange}
                  placeholder="Ex: Frete Grátis para todo Brasil!"
                  className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-slate-950 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </ToggleSetting>

            <ToggleSetting
              label="Tag de Desconto à Vista"
              name="show_discount_tag"
              description="Mostra selo de % OFF no preço à vista."
              checked={catalogSettings.show_discount_tag}
              onChange={handleCatalogSettingsChange}
              icon={Tag}
            >
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Percentual de Desconto (%)
                </label>
                <div className="relative w-32">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    name="cash_price_discount_percent"
                    value={catalogSettings.cash_price_discount_percent}
                    onChange={handleCatalogSettingsChange}
                    className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-slate-950 dark:border-slate-700 dark:text-white pr-8 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-gray-400 font-bold">
                    %
                  </span>
                </div>
              </div>
            </ToggleSetting>

            <div className="grid md:grid-cols-2 gap-4">
              <ToggleSetting
                label="Mostrar Preço de Venda"
                name="show_sale_price"
                description="Exibe o preço sugerido (De: R$)."
                checked={catalogSettings.show_sale_price ?? true}
                onChange={handleCatalogSettingsChange}
                icon={DollarSign}
              />
              <ToggleSetting
                label="Mostrar Preço de Custo"
                name="show_cost_price"
                description="Exibe o preço de custo (apenas interno)."
                checked={catalogSettings.show_cost_price ?? false}
                onChange={handleCatalogSettingsChange}
                icon={Lock}
              />
            </div>
          </div>
        </div>
      )}

      {/* ABA: ESTOQUE */}
      {activeTab === 'stock' && (
        <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
              <Package size={18} className="text-indigo-500" /> Controle de
              Estoque
            </h3>
            <div className="space-y-6">
              <ToggleSetting
                label="Ativar Gestão de Estoque"
                name="enable_stock_management"
                description="Habilita o controle de quantidades disponíveis por produto."
                checked={catalogSettings.enable_stock_management}
                onChange={handleCatalogSettingsChange}
                icon={Package}
              >
                <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 p-4 rounded-xl mt-2">
                  <h4 className="text-sm font-bold text-yellow-800 dark:text-yellow-500 flex items-center gap-2 mb-3">
                    <AlertTriangle size={16} /> Política de Venda sem Estoque
                  </h4>
                  <ToggleSetting
                    label="Permitir Backorder (Venda sem Estoque)"
                    name="global_allow_backorder"
                    description="Permite que clientes comprem produtos mesmo com estoque zerado."
                    checked={catalogSettings.global_allow_backorder}
                    onChange={handleCatalogSettingsChange}
                    icon={Zap}
                  />
                </div>
              </ToggleSetting>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
