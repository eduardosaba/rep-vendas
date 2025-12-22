'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { updateThemeColors } from '@/components/ThemeRegistry';
import { applyThemeColors } from '@/lib/theme';
import {
  Save,
  Loader2,
  UploadCloud,
  Store,
  Palette,
  Layout,
  Settings as SettingsIcon,
  ImageIcon,
  X,
  Plus,
  DollarSign,
  CreditCard,
  Tag,
  Package,
  AlertTriangle,
  Zap,
  Brush,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

// Componentes extraídos
import { ToggleSetting } from './components/ToggleSetting';
import { TabGeneral } from './components/TabGeneral';

interface CatalogSettings {
  show_top_benefit_bar: boolean;
  show_top_info_bar?: boolean;
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

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'general' | 'appearance' | 'display' | 'stock'
  >('general');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    catalog_slug: '',
    primary_color: '#b9722e',
    secondary_color: '#0d1b2c',
    header_background_color: '#ffffff',
    footer_background_color: '#0d1b2c',
    price_password: '',
    footer_message: '',
  });

  const [catalogSettings, setCatalogSettings] = useState<CatalogSettings>({
    show_top_benefit_bar: false,
    show_top_info_bar: true,
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
  const [currentBannersMobile, setCurrentBannersMobile] = useState<string[]>(
    []
  );

  // Top Benefit
  const [topBenefitImagePreview, setTopBenefitImagePreview] = useState<
    string | null
  >(null);
  const [topBenefitImageFile, setTopBenefitImageFile] = useState<File | null>(
    null
  );
  const [topBenefitHeight, setTopBenefitHeight] = useState<number>(36);
  const [topBenefitTextSize, setTopBenefitTextSize] = useState<number>(11);
  const [topBenefitBgColor, setTopBenefitBgColor] = useState<string>('#f3f4f6');
  const [topBenefitTextColor, setTopBenefitTextColor] =
    useState<string>('#b9722e');

  // Estados faltantes para o Preview
  const [topBenefitImageFit, setTopBenefitImageFit] = useState<
    'cover' | 'contain'
  >('cover');
  const [topBenefitImageScale, setTopBenefitImageScale] = useState<number>(100);

  const [newBannerFiles, setNewBannerFiles] = useState<
    { file: File; preview: string; tooSmall?: boolean }[]
  >([]);
  const [newBannerFilesMobile, setNewBannerFilesMobile] = useState<
    { file: File; preview: string; tooSmall?: boolean }[]
  >([]);
  const [logoUploading, setLogoUploading] = useState(false);

  const RECOMMENDED_BANNER = { width: 1400, height: 400 };
  const RECOMMENDED_BANNER_MOBILE = { width: 768, height: 400 };

  useEffect(() => {
    applyThemeColors({
      primary: formData.primary_color,
      secondary: formData.secondary_color,
      headerBg: formData.header_background_color,
    });
  }, [
    formData.primary_color,
    formData.secondary_color,
    formData.header_background_color,
  ]);

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

        const { data: settings } = await supabase
          .from('settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (settings) {
          setFormData({
            name: settings.name || '',
            phone: settings.phone || settings.support_phone || '',
            email: settings.email || settings.support_email || '',
            catalog_slug: settings.catalog_slug || '',
            primary_color: settings.primary_color || '#b9722e',
            secondary_color: settings.secondary_color || '#0d1b2c',
            header_background_color:
              settings.header_background_color || '#ffffff',
            footer_background_color:
              settings.footer_background_color || '#0d1b2c',
            price_password: settings.price_password || '',
            footer_message: settings.footer_message || '',
          });
          setLogoPreview(settings.logo_url);

          setCatalogSettings({
            show_top_benefit_bar: settings.show_top_benefit_bar ?? false,
            show_top_info_bar: settings.show_top_info_bar ?? true,
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

          setTopBenefitImagePreview(settings.top_benefit_image_url || null);
          setTopBenefitHeight(settings.top_benefit_height || 36);
          setTopBenefitTextSize(settings.top_benefit_text_size || 11);
          setTopBenefitBgColor(settings.top_benefit_bg_color || '#f3f4f6');
          setTopBenefitTextColor(
            settings.top_benefit_text_color ||
              formData.primary_color ||
              '#b9722e'
          );

          if (settings.top_benefit_image_fit)
            setTopBenefitImageFit(settings.top_benefit_image_fit);
          if (settings.top_benefit_image_scale)
            setTopBenefitImageScale(settings.top_benefit_image_scale);

          if (Array.isArray(settings.banners))
            setCurrentBanners(settings.banners);
          if (Array.isArray(settings.banners_mobile))
            setCurrentBannersMobile(settings.banners_mobile);
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

  const handlePriceTypeChange = (type: 'sale' | 'cost') => {
    if (type === 'sale') {
      setCatalogSettings((prev) => ({
        ...prev,
        show_sale_price: true,
        show_cost_price: false,
      }));
    } else {
      setCatalogSettings((prev) => ({
        ...prev,
        show_sale_price: false,
        show_cost_price: true,
      }));
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setLogoFile(e.target.files[0]);
      setLogoPreview(URL.createObjectURL(e.target.files[0]));
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
    setNewBannerFiles((prev) => [...prev, ...processed]);
  };

  const removeNewBanner = (index: number) => {
    setNewBannerFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBannerMobileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);
    const processed = await Promise.all(
      filesArray.map(
        (file) =>
          new Promise<{ file: File; preview: string; tooSmall?: boolean }>(
            (resolve) => {
              const preview = URL.createObjectURL(file);
              const img = new window.Image();
              img.src = preview;
              img.onload = () => {
                const tooSmall =
                  img.naturalWidth < RECOMMENDED_BANNER_MOBILE.width ||
                  img.naturalHeight < RECOMMENDED_BANNER_MOBILE.height;
                resolve({ file, preview, tooSmall });
              };
              img.onerror = () => resolve({ file, preview, tooSmall: true });
            }
          )
      )
    );
    setNewBannerFilesMobile((prev) => [...prev, ...processed]);
  };

  const removeNewBannerMobile = (index: number) => {
    setNewBannerFilesMobile((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTopBenefitImageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files?.[0]) return;
    setTopBenefitImageFile(e.target.files[0]);
    setTopBenefitImagePreview(URL.createObjectURL(e.target.files[0]));
  };

  const removeTopBenefitImage = () => {
    setTopBenefitImageFile(null);
    setTopBenefitImagePreview(null);
  };

  const applyTheme = (theme: (typeof THEME_PRESETS)[0]) => {
    setFormData((prev) => ({
      ...prev,
      primary_color: theme.primary,
      secondary_color: theme.secondary,
      header_background_color: theme.header,
    }));
    applyThemeColors({
      primary: theme.primary,
      secondary: theme.secondary,
      headerBg: theme.header,
    });
    toast.success(`Tema ${theme.name} aplicado!`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const toastId = toast.loading('Salvando configurações...');

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user)
        throw new Error('Sessão expirada. Recarregue a página.');

      const currentUserId = user.id;
      let logoUrl = logoPreview;

      if (logoFile) {
        setLogoUploading(true);
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `public/${currentUserId}/branding/logo-${Date.now()}.${fileExt}`;
        const { error } = await supabase.storage
          .from('product-images')
          .upload(fileName, logoFile, { upsert: true });
        if (!error) {
          const { data } = supabase.storage
            .from('product-images')
            .getPublicUrl(fileName);
          logoUrl = data.publicUrl;
        }
        setLogoUploading(false);
      }

      const uploadBanners = async (files: any[], folder: string) => {
        const urls = [];
        for (let i = 0; i < files.length; i++) {
          const item = files[i];
          const fileExt = item.file.name.split('.').pop();
          const fileName = `public/${currentUserId}/${folder}/banner-${Date.now()}-${i}.${fileExt}`;
          const { error } = await supabase.storage
            .from('product-images')
            .upload(fileName, item.file, { upsert: true });
          if (!error) {
            const { data } = supabase.storage
              .from('product-images')
              .getPublicUrl(fileName);
            urls.push(data.publicUrl);
          }
        }
        return urls;
      };

      const uploadedBanners = await uploadBanners(newBannerFiles, 'banners');
      const uploadedBannersMobile = await uploadBanners(
        newBannerFilesMobile,
        'banners'
      );
      const finalBanners = [...currentBanners, ...uploadedBanners];
      const finalBannersMobile = [
        ...currentBannersMobile,
        ...uploadedBannersMobile,
      ];

      let topBenefitImageUrl = topBenefitImagePreview;
      if (topBenefitImageFile) {
        const fileExt = topBenefitImageFile.name.split('.').pop();
        const fileName = `public/${currentUserId}/topbar/top-benefit-${Date.now()}.${fileExt}`;
        const { error } = await supabase.storage
          .from('product-images')
          .upload(fileName, topBenefitImageFile, { upsert: true });
        if (!error) {
          const { data } = supabase.storage
            .from('product-images')
            .getPublicUrl(fileName);
          topBenefitImageUrl = data.publicUrl;
        }
      }

      let finalShowSale = catalogSettings.show_sale_price ?? true;
      let finalShowCost = catalogSettings.show_cost_price ?? false;
      if (finalShowSale && finalShowCost) finalShowCost = false;

      const finalShowInstallments = catalogSettings.show_installments ?? false;
      const finalMaxInstallments = Number(
        catalogSettings.max_installments || 1
      );
      const finalShowCashDiscount = catalogSettings.show_discount_tag ?? false;
      const finalCashDiscountPercent = Number(
        catalogSettings.cash_price_discount_percent || 0
      );
      const finalEnableStock = catalogSettings.enable_stock_management ?? false;

      const { error } = await supabase.from('settings').upsert(
        {
          user_id: currentUserId,
          name: formData.name,
          phone: formData.phone,
          support_phone: formData.phone,
          email: formData.email,
          support_email: formData.email,
          logo_url: logoUrl,
          catalog_slug: formData.catalog_slug,
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
          header_background_color: formData.header_background_color,
          footer_background_color: formData.footer_background_color,
          price_password: formData.price_password,
          footer_message: formData.footer_message,
          banners: finalBanners,
          banners_mobile: finalBannersMobile,
          updated_at: new Date().toISOString(),

          show_top_benefit_bar: catalogSettings.show_top_benefit_bar,
          top_benefit_text: catalogSettings.top_benefit_text,
          show_top_info_bar: catalogSettings.show_top_info_bar,
          top_benefit_image_url: topBenefitImageUrl,
          top_benefit_height: topBenefitHeight,
          top_benefit_text_size: topBenefitTextSize,
          top_benefit_bg_color: topBenefitBgColor,
          top_benefit_text_color: topBenefitTextColor,
          top_benefit_image_fit: topBenefitImageFit,
          top_benefit_image_scale: topBenefitImageScale,

          show_installments: finalShowInstallments,
          max_installments: finalMaxInstallments,
          show_discount_tag: finalShowCashDiscount,
          cash_price_discount_percent: finalCashDiscountPercent,
          enable_stock_management: finalEnableStock,
          global_allow_backorder: catalogSettings.global_allow_backorder,
          show_cost_price: finalShowCost,
          show_sale_price: finalShowSale,
        },
        { onConflict: 'user_id' }
      );

      if (error) {
        if (error.code === '23505')
          throw new Error('Este link da loja já está em uso.');
        throw error;
      }

      setNewBannerFiles([]);
      setNewBannerFilesMobile([]);
      setCurrentBanners(finalBanners);
      setCurrentBannersMobile(finalBannersMobile);
      updateThemeColors({
        primary: formData.primary_color,
        secondary: formData.secondary_color,
        headerBg: formData.header_background_color,
      });

      try {
        await fetch('/api/public_catalogs/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: currentUserId,
            slug: formData.catalog_slug,
            store_name: formData.name,
            logo_url: logoUrl,
            primary_color: formData.primary_color,
            secondary_color: formData.secondary_color,
            footer_background_color: formData.footer_background_color,
            phone: formData.phone,
            email: formData.email,
            footer_message: formData.footer_message,
            show_sale_price: finalShowSale,
            show_cost_price: finalShowCost,
            show_installments: finalShowInstallments,
            max_installments: finalMaxInstallments,
            show_cash_discount: finalShowCashDiscount,
            cash_price_discount_percent: finalCashDiscountPercent,
            enable_stock_management: finalEnableStock,
            header_background_color: formData.header_background_color,
            top_benefit_image_url: topBenefitImageUrl,
            top_benefit_height: topBenefitHeight,
            top_benefit_text_size: topBenefitTextSize,
            top_benefit_bg_color: topBenefitBgColor,
            top_benefit_text_color: topBenefitTextColor,
            top_benefit_text: catalogSettings.top_benefit_text,
            show_top_benefit_bar: catalogSettings.show_top_benefit_bar,
          }),
        });
      } catch (err) {
        console.error(err);
      }

      toast.success('Configurações salvas!', { id: toastId });
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      toast.error('Erro ao salvar', {
        id: toastId,
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center h-[50vh] items-center">
        <Loader2 className="animate-spin text-[var(--primary)] h-8 w-8" />
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'Geral', icon: Store },
    { id: 'appearance', label: 'Aparência', icon: Palette },
    { id: 'display', label: 'Exibição', icon: Layout },
    { id: 'stock', label: 'Estoque', icon: Package },
  ];

  // Helpers for Preview
  const isValidHex = (hex?: string) =>
    !!hex && /^#([0-9A-F]{3}|[0-9A-F]{6})$/i.test(hex);
  const validatedTopBg = isValidHex(topBenefitBgColor)
    ? topBenefitBgColor
    : '#f3f4f6';
  const validatedTopTextColor = isValidHex(topBenefitTextColor)
    ? topBenefitTextColor
    : formData.primary_color || '#b9722e';
  const validatedTopHeight = Math.min(
    120,
    Math.max(20, Number(topBenefitHeight || 36))
  );
  const validatedTopTextSize = Math.min(
    24,
    Math.max(10, Number(topBenefitTextSize || 11))
  );

  // --- REINSERIDO AQUI ---
  const previewErrors: string[] = [];
  if (!isValidHex(topBenefitBgColor))
    previewErrors.push('Cor de fundo inválida');
  if (!isValidHex(topBenefitTextColor))
    previewErrors.push('Cor do texto inválida');

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 p-4 sm:p-6 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-30 bg-gray-50/90 dark:bg-slate-950/90 backdrop-blur-md py-4 -mx-4 px-4 sm:mx-0 sm:px-0 border-b border-gray-200 dark:border-slate-800/50">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <SettingsIcon className="text-[var(--primary)]" /> Configurações da
            Loja
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Personalize sua loja, catálogo e regras de negócio.
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
                    ? 'border-[var(--primary)] text-[var(--primary)]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-white dark:hover:border-slate-600'
                }`}
              >
                <Icon
                  size={18}
                  className={
                    isActive
                      ? 'text-[var(--primary)]'
                      : 'text-gray-400 group-hover:text-gray-500 dark:text-slate-500'
                  }
                />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* CONTEÚDO DAS ABAS */}
      {activeTab === 'general' && (
        <TabGeneral
          formData={formData}
          handleChange={handleChange}
          handleSlugChange={handleSlugChange}
        />
      )}

      {activeTab === 'appearance' && (
        <div className="grid gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
          {/* ... conteúdo de aparência ... */}
          {/* Use aqui o mesmo conteúdo visual de aparência ou o novo componente TabAppearance se tiver criado */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-semibold text-gray-900 dark:text-white flex gap-2 mb-4">
              <Brush size={18} className="text-[var(--primary)]" /> Temas
              Prontos
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {THEME_PRESETS.map((theme, idx) => (
                <button
                  key={idx}
                  onClick={() => applyTheme(theme)}
                  className="border border-gray-200 dark:border-slate-700 rounded-xl p-4 hover:border-[var(--primary)] hover:ring-2 hover:ring-[var(--primary)]/20 transition-all text-left group bg-gray-50 dark:bg-slate-800/50"
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
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 group-hover:text-[var(--primary)]">
                    {theme.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-6">
            <h3 className="font-semibold text-gray-900 dark:text-white flex gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
              <Palette size={18} className="text-[var(--primary)]" />{' '}
              Personalizar Cores
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  label: 'Cor Primária',
                  name: 'primary_color',
                  value: formData.primary_color,
                },
                {
                  label: 'Cor Secundária',
                  name: 'secondary_color',
                  value: formData.secondary_color,
                },
                {
                  label: 'Fundo do Header',
                  name: 'header_background_color',
                  value: formData.header_background_color,
                },
              ].map((colorInput) => (
                <div key={colorInput.name}>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    {colorInput.label}
                  </label>
                  <div className="flex items-center gap-3 p-2 border rounded-lg bg-gray-50 dark:bg-slate-950 dark:border-slate-700">
                    <input
                      type="color"
                      name={colorInput.name}
                      value={colorInput.value}
                      onChange={handleChange}
                      className="h-10 w-10 rounded cursor-pointer border-0 p-0 shadow-sm"
                    />
                    <span className="text-sm font-mono text-gray-600 dark:text-gray-400 uppercase">
                      {colorInput.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-6">
            <h3 className="font-semibold text-gray-900 dark:text-white flex gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
              <UploadCloud size={18} className="text-[var(--primary)]" /> Logo
              da Loja
            </h3>
            <div className="flex items-center gap-6">
              <div className="relative h-32 w-32 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-slate-950 hover:bg-gray-100 transition-colors">
                {logoPreview ? (
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
                    <Loader2 className="animate-spin text-[var(--primary)]" />
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
                  <UploadCloud size={16} /> Escolher Imagem
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  Recomendado: PNG Transparente.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-6">
            <h3 className="font-semibold text-gray-900 dark:text-white flex gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
              <ImageIcon size={18} className="text-[var(--primary)]" /> Banners
              Promocionais
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentBanners.map((b, i) => (
                <div
                  key={`cur-${i}`}
                  className="relative h-32 bg-gray-100 dark:bg-slate-800 rounded-xl overflow-hidden group shadow-sm border border-gray-200 dark:border-slate-700"
                >
                  <img
                    src={b}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    alt="Banner"
                  />
                  <button
                    onClick={() =>
                      setCurrentBanners((prev) =>
                        prev.filter((_, idx) => idx !== i)
                      )
                    }
                    className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 shadow-md hover:bg-red-600 transition-all scale-90 group-hover:scale-100"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {newBannerFiles.map((nb, idx) => (
                <div
                  key={`new-${idx}`}
                  className="relative h-32 bg-gray-50 dark:bg-slate-900 rounded-xl overflow-hidden group shadow-sm border border-dashed border-gray-300 dark:border-slate-700 flex items-center justify-center"
                >
                  <img
                    src={nb.preview}
                    className="w-full h-full object-cover"
                    alt={`Preview ${idx}`}
                  />
                  <div className="absolute left-2 top-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                    Novo
                  </div>
                  <button
                    onClick={() => removeNewBanner(idx)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-lg shadow-md hover:bg-red-600 transition-all"
                  >
                    <X size={14} />
                  </button>
                  {nb.tooSmall && (
                    <div className="absolute bottom-2 left-2 bg-yellow-50 text-yellow-800 text-xs px-2 py-0.5 rounded">
                      Dimensões abaixo do recomendado
                    </div>
                  )}
                </div>
              ))}
              <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 hover:border-[var(--primary)]/50 transition-all group">
                <div className="p-3 bg-gray-100 dark:bg-slate-800 rounded-full group-hover:bg-[var(--primary)]/10 group-hover:text-[var(--primary)] transition-colors mb-2">
                  <Plus
                    size={24}
                    className="text-gray-400 group-hover:text-[var(--primary)]"
                  />
                </div>
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400 group-hover:text-[var(--primary)]">
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
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white flex gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
                <ImageIcon size={18} className="text-[var(--primary)]" />{' '}
                Banners Mobile (Opcional)
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
                Se não adicionar banners mobile, os banners desktop serão
                exibidos com ajuste responsivo.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentBannersMobile.map((b, i) => (
                <div
                  key={`cur-mobile-${i}`}
                  className="relative h-32 bg-gray-100 dark:bg-slate-800 rounded-xl overflow-hidden group shadow-sm border border-gray-200 dark:border-slate-700"
                >
                  <img
                    src={b}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    alt="Banner Mobile"
                  />
                  <button
                    onClick={() =>
                      setCurrentBannersMobile((prev) =>
                        prev.filter((_, idx) => idx !== i)
                      )
                    }
                    className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 shadow-md hover:bg-red-600 transition-all scale-90 group-hover:scale-100"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {newBannerFilesMobile.map((nb, idx) => (
                <div
                  key={`new-mobile-${idx}`}
                  className="relative h-32 bg-gray-50 dark:bg-slate-900 rounded-xl overflow-hidden group shadow-sm border border-dashed border-gray-300 dark:border-slate-700 flex items-center justify-center"
                >
                  <img
                    src={nb.preview}
                    className="w-full h-full object-cover"
                    alt={`Preview mobile ${idx}`}
                  />
                  <div className="absolute left-2 top-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                    Mobile Novo
                  </div>
                  <button
                    onClick={() => removeNewBannerMobile(idx)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-lg shadow-md hover:bg-red-600 transition-all"
                  >
                    <X size={14} />
                  </button>
                  {nb.tooSmall && (
                    <div className="absolute bottom-2 left-2 bg-yellow-50 text-yellow-800 text-xs px-2 py-0.5 rounded">
                      Abaixo do recomendado
                    </div>
                  )}
                </div>
              ))}
              <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 hover:border-[var(--primary)]/50 transition-all group">
                <div className="p-3 bg-gray-100 dark:bg-slate-800 rounded-full group-hover:bg-[var(--primary)]/10 group-hover:text-[var(--primary)] transition-colors mb-2">
                  <Plus
                    size={24}
                    className="text-gray-400 group-hover:text-[var(--primary)]"
                  />
                </div>
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400 group-hover:text-[var(--primary)]">
                  Banner Mobile
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleBannerMobileUpload}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'display' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <DollarSign size={20} className="text-[var(--primary)]" /> Tipo de
              Preço
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div
                onClick={() => handlePriceTypeChange('sale')}
                className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-start gap-3 ${catalogSettings.show_sale_price ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-gray-200 hover:border-gray-300 dark:border-slate-700'}`}
              >
                <div
                  className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center ${catalogSettings.show_sale_price ? 'border-[var(--primary)]' : 'border-gray-400'}`}
                >
                  {catalogSettings.show_sale_price && (
                    <div className="h-2.5 w-2.5 rounded-full bg-[var(--primary)]" />
                  )}
                </div>
                <div>
                  <span className="block font-bold text-gray-900 dark:text-white">
                    Preço de Venda (Sugerido)
                  </span>
                  <p className="text-sm text-gray-500 mt-1">
                    Exibe o preço público. Ideal para catálogo aberto ao
                    consumidor final.
                  </p>
                </div>
              </div>
              <div
                onClick={() => handlePriceTypeChange('cost')}
                className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-start gap-3 ${catalogSettings.show_cost_price ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/10' : 'border-gray-200 hover:border-gray-300 dark:border-slate-700'}`}
              >
                <div
                  className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center ${catalogSettings.show_cost_price ? 'border-indigo-600' : 'border-gray-400'}`}
                >
                  {catalogSettings.show_cost_price && (
                    <div className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
                  )}
                </div>
                <div>
                  <span className="block font-bold text-gray-900 dark:text-white">
                    Preço de Custo
                  </span>
                  <p className="text-sm text-gray-500 mt-1">
                    Exibe o custo. Exige senha para visualizar. Ideal para
                    representantes.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <ToggleSetting
            label="Barra de Benefícios"
            name="show_top_benefit_bar"
            description="Faixa colorida no topo da loja."
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
                className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-slate-950 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-[var(--primary)] outline-none"
              />

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Imagem (opcional)
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-40 bg-gray-50 dark:bg-slate-900 rounded-lg border flex items-center justify-center overflow-hidden">
                      {topBenefitImagePreview ? (
                        <img
                          src={topBenefitImagePreview}
                          className="h-full w-full object-contain"
                          alt="Top Benefit"
                        />
                      ) : (
                        <span className="text-xs text-gray-400">
                          Sem imagem
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor="top-benefit-upload"
                        className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-sm cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <UploadCloud size={14} /> Escolher
                      </label>
                      {topBenefitImagePreview && (
                        <button
                          onClick={removeTopBenefitImage}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Remover
                        </button>
                      )}
                      <input
                        id="top-benefit-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleTopBenefitImageChange}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Estilos
                  </label>
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <div>
                      <label className="text-xs text-gray-500">
                        Altura (px)
                      </label>
                      <input
                        type="number"
                        min={20}
                        max={120}
                        value={topBenefitHeight}
                        onChange={(e) =>
                          setTopBenefitHeight(Number(e.target.value))
                        }
                        className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">
                        Tamanho do texto (px)
                      </label>
                      <input
                        type="number"
                        min={10}
                        max={24}
                        value={topBenefitTextSize}
                        onChange={(e) =>
                          setTopBenefitTextSize(Number(e.target.value))
                        }
                        className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">
                        Cor de Fundo
                      </label>
                      <input
                        type="color"
                        value={topBenefitBgColor}
                        onChange={(e) => setTopBenefitBgColor(e.target.value)}
                        className="w-full h-10 rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">
                        Cor do Texto
                      </label>
                      <input
                        type="color"
                        value={topBenefitTextColor}
                        onChange={(e) => setTopBenefitTextColor(e.target.value)}
                        className="w-full h-10 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ToggleSetting>

          {/* PREVIEW DA BARRA DE BENEFÍCIOS */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm mb-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
              Preview: Barra de Benefícios
            </h4>
            <div className="mb-3">
              <div
                className="w-full flex items-center flex-col md:flex-row"
                style={{
                  backgroundColor: validatedTopBg,
                  height: validatedTopHeight,
                  color: validatedTopTextColor,
                  fontSize: validatedTopTextSize,
                  padding: '0 12px',
                  display: catalogSettings.show_top_benefit_bar
                    ? 'flex'
                    : 'none',
                }}
              >
                {topBenefitImagePreview ? (
                  catalogSettings.top_benefit_text ? (
                    <>
                      <div
                        className="w-full md:w-2/5 flex-shrink-0 overflow-hidden rounded"
                        style={{ maxHeight: validatedTopHeight }}
                      >
                        <img
                          src={topBenefitImagePreview}
                          alt="preview"
                          className="h-full w-full object-cover"
                          style={{ objectFit: 'cover', transform: 'scale(1)' }}
                        />
                      </div>
                      <div className="w-full md:flex-1 md:pl-4 px-3 py-2">
                        <span className="font-bold block">
                          {catalogSettings.top_benefit_text ||
                            'Ex: Frete Grátis para todo Brasil!'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <img
                      src={topBenefitImagePreview}
                      alt="preview"
                      className="h-full w-full object-cover mr-3"
                    />
                  )
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-bold">
                      {catalogSettings.top_benefit_text ||
                        'Ex: Frete Grátis para todo Brasil!'}
                    </span>
                  </div>
                )}
              </div>
              {!catalogSettings.show_top_benefit_bar && (
                <div className="text-sm text-gray-500 mt-2">
                  A barra está desativada (marque "Barra de Benefícios" para
                  visualizar).
                </div>
              )}
            </div>
            {/* MOBILE PREVIEW */}
            <div className="mt-4">
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preview Mobile
              </h5>
              <div className="w-[360px] rounded-lg overflow-hidden border border-gray-200 dark:border-slate-800">
                <div
                  style={{
                    backgroundColor: validatedTopBg,
                    height: validatedTopHeight,
                    color: validatedTopTextColor,
                    fontSize: validatedTopTextSize,
                    display: catalogSettings.show_top_benefit_bar
                      ? 'flex'
                      : 'none',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  {topBenefitImagePreview ? (
                    <>
                      <img
                        src={topBenefitImagePreview}
                        alt="mobile preview"
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ objectFit: 'cover' }}
                      />
                      <div className="relative z-10 px-3 text-center font-bold">
                        {catalogSettings.top_benefit_text ||
                          'Ex: Frete Grátis para todo Brasil!'}
                      </div>
                    </>
                  ) : (
                    <div className="font-bold">
                      {catalogSettings.top_benefit_text ||
                        'Ex: Frete Grátis para todo Brasil!'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* O ERRO ESTAVA AQUI: previewErrors não existia */}
            {previewErrors.length > 0 && (
              <div className="text-sm text-yellow-700 dark:text-yellow-300">
                <strong>Atenção:</strong>
                <ul className="list-disc ml-5 mt-2">
                  {previewErrors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div
            className={`transition-opacity duration-300 ${!catalogSettings.show_sale_price ? 'opacity-50 pointer-events-none grayscale' : ''}`}
          >
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <CreditCard size={18} className="text-gray-500" /> Condições de
                Pagamento
                {!catalogSettings.show_sale_price && (
                  <span className="text-xs text-red-500 font-normal ml-2">
                    (Apenas Modo Preço de Venda)
                  </span>
                )}
              </h3>
              <div className="space-y-4">
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
                      min={1}
                      max={24}
                      name="max_installments"
                      value={catalogSettings.max_installments}
                      onChange={handleCatalogSettingsChange}
                      className="w-24 p-2 border rounded-lg bg-gray-50 dark:bg-slate-950 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-[var(--primary)] outline-none"
                    />
                  </div>
                </ToggleSetting>
                <ToggleSetting
                  label="Tag de Desconto à Vista"
                  name="show_discount_tag"
                  description="Mostra selo de % OFF."
                  checked={catalogSettings.show_discount_tag}
                  onChange={handleCatalogSettingsChange}
                  icon={Tag}
                >
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Percentual (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      name="cash_price_discount_percent"
                      value={catalogSettings.cash_price_discount_percent}
                      onChange={handleCatalogSettingsChange}
                      className="w-24 p-2 border rounded-lg bg-gray-50 dark:bg-slate-950 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-[var(--primary)] outline-none"
                    />
                  </div>
                </ToggleSetting>
                <ToggleSetting
                  label="Controle de Estoque"
                  name="enable_stock_management"
                  description="Habilita o controle de quantidades."
                  checked={catalogSettings.enable_stock_management}
                  onChange={handleCatalogSettingsChange}
                  icon={Package}
                >
                  <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 p-4 rounded-xl mt-2">
                    <h4 className="text-sm font-bold text-yellow-800 dark:text-yellow-500 flex items-center gap-2 mb-3">
                      <AlertTriangle size={16} /> Venda sem Estoque
                    </h4>
                    <ToggleSetting
                      label="Permitir Backorder"
                      name="global_allow_backorder"
                      description="Permite vender mesmo com estoque zerado."
                      checked={catalogSettings.global_allow_backorder}
                      onChange={handleCatalogSettingsChange}
                      icon={Zap}
                    />
                  </div>
                </ToggleSetting>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'stock' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Configurações de Estoque
            </h3>
            <ToggleSetting
              label="Controle de Estoque"
              name="enable_stock_management"
              description="Habilita o controle de quantidades."
              checked={catalogSettings.enable_stock_management}
              onChange={handleCatalogSettingsChange}
              icon={Package}
            >
              <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 p-4 rounded-xl mt-2">
                <h4 className="text-sm font-bold text-yellow-800 dark:text-yellow-500 flex items-center gap-2 mb-3">
                  <AlertTriangle size={16} /> Venda sem Estoque
                </h4>
                <ToggleSetting
                  label="Permitir Backorder"
                  name="global_allow_backorder"
                  description="Permite vender mesmo com estoque zerado."
                  checked={catalogSettings.global_allow_backorder}
                  onChange={handleCatalogSettingsChange}
                  icon={Zap}
                />
              </div>
            </ToggleSetting>
          </div>
        </div>
      )}
    </div>
  );
}
