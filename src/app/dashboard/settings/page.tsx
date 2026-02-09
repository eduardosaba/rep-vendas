'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  updateThemeColors,
  applyThemeColors,
  applyDashboardFont,
} from '@/lib/theme';
// Use API route to perform server-side sync (avoids client-side service-role usage)
import {
  Save,
  Loader2,
  UploadCloud,
  Store,
  Palette,
  Layout,
  Type,
  Settings as SettingsIcon,
  Power,
  Brush,
  Share2,
  Package,
  Image as ImageIcon,
  ChevronUp,
  ChevronDown,
  Trash2,
  X,
  Zap,
  DollarSign,
  Tag,
  CreditCard,
  Link as LinkIcon,
  AlertTriangle,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';

// Conjunto de temas prontos usados na UI
const THEME_PRESETS = [
  {
    name: 'Padrão',
    primary: '#b9722e',
    secondary: '#0d1b2c',
    header: '#ffffff',
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
    name: 'Luxo & Gold',
    primary: '#cca43b',
    secondary: '#000000',
    header: '#1c1c1c',
  },
  {
    name: 'Moda & Boutique',
    primary: '#fbcfe8',
    secondary: '#be185d',
    header: '#FFFFFF',
  },
];

// Componentes extraídos
import { ToggleSetting } from './components/ToggleSetting';
import SmartImageUpload from '@/components/SmartImageUpload';
import SharePreview from '@/components/SharePreview';
import WhatsAppLinkGenerator from '@/components/WhatsAppLinkGenerator';
import AnalyticsChartClient from '@/components/AnalyticsChartClient';
import MyShortLinksTable from '@/components/MyShortLinksTable';
import { TabGeneral } from './components/TabGeneral';
import { usePlan } from '@/hooks/use-plan';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const slugRef = useRef<HTMLInputElement | null>(null);
  const [showPricePassword, setShowPricePassword] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'general' | 'appearance' | 'display' | 'marketing' | 'stock' | 'sync'
  >('general');

  // FORM DATA PRINCIPAL
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    catalog_slug: '',
    font_family: null as string | null,
    font_url: null as string | null,
    plan_type: 'free',
    primary_color: '#b9722e',
    secondary_color: '#0d1b2c',
    header_background_color: '#ffffff',
    footer_background_color: '#0d1b2c',
    price_password: '',
    footer_message: '',
    representative_name: '',
    whatsapp_message_template: '',
  });

  // CATALOG SETTINGS
  const [catalogSettings, setCatalogSettings] = useState({
    show_top_benefit_bar: false,
    show_top_info_bar: true,
    top_benefit_text: '',
    show_installments: false,
    max_installments: '12',
    show_discount_tag: false,
    cash_price_discount_percent: '5',
    manage_stock: false,
    global_allow_backorder: false,
    show_cost_price: false,
    show_sale_price: true,
  });

  // ESTADOS DE MÍDIA
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [currentBanners, setCurrentBanners] = useState<string[]>([]);
  const [currentBannersMobile, setCurrentBannersMobile] = useState<string[]>(
    []
  );
  const [ogImagePreview, setOgImagePreview] = useState<string | null>(null);
  const [shareBannerPreview, setShareBannerPreview] = useState<string | null>(
    null
  );
  const [shareUploading, setShareUploading] = useState(false);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [hasPricePassword, setHasPricePassword] = useState(false);

  // BARRA DE BENEFÍCIOS (AVANÇADO)
  const [topBenefitImagePreview, setTopBenefitImagePreview] = useState<
    string | null
  >(null);
  const [topBenefitHeight, setTopBenefitHeight] = useState<number>(36);
  const [topBenefitTextSize, setTopBenefitTextSize] = useState<number>(11);
  const [topBenefitBgColor, setTopBenefitBgColor] = useState<string>('#f3f4f6');
  const [topBenefitTextColor, setTopBenefitTextColor] =
    useState<string>('#b9722e');
  const [topBenefitImageFit, setTopBenefitImageFit] = useState<
    'cover' | 'contain'
  >('cover');
  const [topBenefitImageScale, setTopBenefitImageScale] = useState<number>(100);
  const [topBenefitTextAlign, setTopBenefitTextAlign] = useState<
    'left' | 'center' | 'right'
  >('center');
  const [topBenefitImageAlign, setTopBenefitImageAlign] = useState<
    'left' | 'center' | 'right'
  >('left');

  const { planType: planTypeHook } = usePlan();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return setLoading(false);

        // Verifica papel do usuário para habilitar abas/links administrativos
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();
          if (
            profile &&
            (profile.role === 'admin' || profile.role === 'master')
          )
            setIsAdmin(true);
        } catch (e) {
          // ignore profile fetch errors
        }

        const { data: settings } = await supabase
          .from('settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (settings) {
          // utility to extract a URL from various stored shapes
          // utility to extract a URL from various stored shapes
          const extractUrl = (raw: any): string | null => {
            if (raw == null) return null;
            try {
              if (typeof raw === 'string') {
                const s = raw.trim();
                // JSON string
                if (
                  s.startsWith('{') ||
                  s.startsWith('[') ||
                  s.startsWith('"')
                ) {
                  try {
                    const parsed = JSON.parse(s);
                    if (!parsed) return null;
                    if (typeof parsed === 'string') return parsed;
                    if (Array.isArray(parsed) && parsed.length > 0)
                      return String(parsed[0]);
                    if (parsed.publicUrl) return String(parsed.publicUrl);
                    if (parsed.secureUrl) return String(parsed.secureUrl);
                    if (parsed.url) return String(parsed.url);
                  } catch (e) {
                    // ignore
                  }
                }
                // regex for embedded publicUrl
                const m = s.match(/publicUrl"\s*:\s*"(https?:\/\/[^"]+)"/i);
                if (m && m[1]) return m[1];
                if (/^https?:\/\//i.test(s)) return s;
                const trimmed = s.replace(/^\"|\"$/g, '');
                if (/^https?:\/\//i.test(trimmed)) return trimmed;
                return null;
              }
              if (typeof raw === 'object') {
                if (raw.publicUrl) return String(raw.publicUrl);
                if (raw.secureUrl) return String(raw.secureUrl);
                if (raw.url) return String(raw.url);
                // if it's an array-like object
                if (Array.isArray(raw) && raw.length > 0) return String(raw[0]);
              }
            } catch (e) {
              return null;
            }
            return null;
          };

          const normalizeArray = (arr: any): string[] => {
            if (!arr) return [];
            if (!Array.isArray(arr)) return [];
            return arr.map((i) => extractUrl(i)).filter(Boolean) as string[];
          };

          setFormData({
            name: settings.name || '',
            phone: settings.phone || '',
            email: settings.email || '',
            catalog_slug: settings.catalog_slug || '',
            font_family: settings.font_family || null,
            font_url: settings.font_url || null,
            plan_type: settings.plan_type || 'free',
            primary_color: settings.primary_color || '#b9722e',
            secondary_color: settings.secondary_color || '#0d1b2c',
            header_background_color:
              settings.header_background_color || '#ffffff',
            footer_background_color:
              settings.footer_background_color || '#0d1b2c',
            price_password: '', // never pre-fill plain password
            footer_message: settings.footer_message || '',
            representative_name: settings.representative_name || '',
            whatsapp_message_template: settings.whatsapp_message_template || '',
          });

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
            manage_stock: settings.manage_stock ?? false,
            global_allow_backorder: settings.global_allow_backorder ?? false,
            show_cost_price: settings.show_cost_price ?? false,
            show_sale_price: settings.show_sale_price ?? true,
          });

          // Normalize logo and banners to be strings (public URLs) to avoid rendering errors
          const lp = extractUrl(settings.logo_url) || null;
          setLogoPreview(lp);
          setCurrentBanners(normalizeArray(settings.banners));
          setCurrentBannersMobile(normalizeArray(settings.banners_mobile));
          setTopBenefitImagePreview(
            extractUrl(settings.top_benefit_image_url) || null
          );
          setTopBenefitHeight(settings.top_benefit_height || 36);
          setTopBenefitTextSize(settings.top_benefit_text_size || 11);
          setTopBenefitBgColor(settings.top_benefit_bg_color || '#f3f4f6');
          setTopBenefitTextColor(settings.top_benefit_text_color || '#b9722e');
          setTopBenefitImageFit(settings.top_benefit_image_fit || 'cover');
          setTopBenefitImageScale(settings.top_benefit_image_scale || 100);
          setTopBenefitTextAlign(settings.top_benefit_text_align || 'center');
          setTopBenefitImageAlign(settings.top_benefit_image_align || 'left');
          setOgImagePreview(extractUrl(settings.og_image_url) || null);
          setShareBannerPreview(extractUrl(settings.share_banner_url) || null);
          setIsActive(settings.is_active ?? true);

          // password: indicate existence of saved password (hash) but do not display it
          setHasPricePassword(!!settings.price_password_hash);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, [supabase]);

  const handleChange = (e: any) =>
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleCatalogSettingsChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setCatalogSettings((p) => ({
      ...p,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // --- FUNÇÕES DE REORDENAÇÃO RESTAURADAS ---
  const moveBanner = (index: number, direction: 'up' | 'down') => {
    setCurrentBanners((prev) => {
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.length - 1) return prev;
      const newArray = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newArray[index], newArray[targetIndex]] = [
        newArray[targetIndex],
        newArray[index],
      ];
      return newArray;
    });
  };

  const moveBannerMobile = (index: number, direction: 'up' | 'down') => {
    setCurrentBannersMobile((prev) => {
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.length - 1) return prev;
      const newArray = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newArray[index], newArray[targetIndex]] = [
        newArray[targetIndex],
        newArray[index],
      ];
      return newArray;
    });
  };

  // --- Upload de banners para Storage ---
  const uploadBannersToStorage = async (
    files: File[],
    type: 'desktop' | 'mobile'
  ): Promise<string[]> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const uploadedUrls: string[] = [];
    const toastId = toast.loading(`Enviando ${files.length} banner(s)...`);

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `banner-${type}-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `${user.id}/branding/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        uploadedUrls.push(data.publicUrl);
      }

      toast.success(`${files.length} banner(s) enviado(s)!`, { id: toastId });
      return uploadedUrls;
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar banners', { id: toastId });
      throw err;
    }
  };

  // --- Função para aplicar um tema pronto ---
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

    toast.success(`Tema "${theme.name}" aplicado! Não esqueça de salvar.`);
  };

  const handleSave = async () => {
    setSaving(true);
    const toastId = toast.loading('Salvando alterações...');
    let publicAction: 'created' | 'updated' | null = null;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Hash da senha de preço (se fornecida)
      const hashString = async (s: string) => {
        try {
          const enc = new TextEncoder();
          const data = enc.encode(s);
          const digest = await crypto.subtle.digest('SHA-256', data);
          return Array.from(new Uint8Array(digest))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
        } catch (e) {
          console.error('Hash error', e);
          return null;
        }
      };

      const pricePasswordHash = formData.price_password
        ? await hashString(formData.price_password)
        : null;

      // Normaliza telefone
      const normalizePhone = (
        phone: string | null | undefined
      ): string | null => {
        if (!phone || phone.trim() === '') return null;
        return phone.trim();
      };

      const normalizedPhone = normalizePhone(formData.phone);
      const normalizedEmail = formData.email?.trim() || null;

      // 1. Salvar em settings
      // Antes de salvar, certifique-se que previews `blob:` foram enviados ao Storage
      const ensurePublicUrl = async (val: string | null) => {
        if (!val) return val;
        try {
          if (typeof val === 'string' && val.startsWith('blob:')) {
            const resp = await fetch(val);
            const blob = await resp.blob();
            const fileExt = (blob.type && blob.type.split('/').pop()) || 'webp';
            const fileName = `branding-${Date.now()}.${fileExt}`;
            const filePath = `${user.id}/branding/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from('product-images')
              .upload(filePath, blob as Blob, { upsert: true });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
              .from('product-images')
              .getPublicUrl(filePath);
            return data?.publicUrl ?? null;
          }
        } catch (e) {
          // falha ao subir preview; deixa o valor original para que o fluxo reporte erro
          console.warn('ensurePublicUrl error', e);
        }
        return val;
      };

      const ensureArrayPublic = async (arr: string[] | null) => {
        if (!arr || !Array.isArray(arr)) return arr;
        const out: string[] = [];
        for (const item of arr) {
          if (item && item.startsWith('blob:')) {
            const uploaded = await ensurePublicUrl(item);
            if (uploaded) out.push(uploaded);
          } else if (item) {
            out.push(item);
          }
        }
        return out;
      };

      // Converte previews locais (blob:) para URLs públicas quando necessário
      const safeTopBenefitImage = await ensurePublicUrl(topBenefitImagePreview);
      const safeOgImage = await ensurePublicUrl(ogImagePreview);
      const safeShareBanner = await ensurePublicUrl(shareBannerPreview);
      const safeLogo = await ensurePublicUrl(logoPreview);
      const safeBanners = await ensureArrayPublic(currentBanners);
      const safeBannersMobile = await ensureArrayPublic(currentBannersMobile);

      // atualiza estados com as URLs públicas retornadas (se houver)
      if (safeTopBenefitImage && safeTopBenefitImage !== topBenefitImagePreview)
        setTopBenefitImagePreview(safeTopBenefitImage);
      if (safeOgImage && safeOgImage !== ogImagePreview)
        setOgImagePreview(safeOgImage);
      if (safeShareBanner && safeShareBanner !== shareBannerPreview)
        setShareBannerPreview(safeShareBanner);
      if (safeLogo && safeLogo !== logoPreview) setLogoPreview(safeLogo);
      if (safeBanners) setCurrentBanners(safeBanners);
      if (safeBannersMobile) setCurrentBannersMobile(safeBannersMobile);

      // 1. Send entire settings payload to server-side endpoint which
      //    will upsert `settings` and `profiles` and perform the
      //    `syncPublicCatalog` on the server (atomic and uses service role).
      const serverPayload = {
        slug: formData.catalog_slug || null,
        name: formData.name || null,
        phone: normalizedPhone || null,
        email: normalizedEmail || null,
        primary_color: formData.primary_color || null,
        secondary_color: formData.secondary_color || null,
        header_background_color: formData.header_background_color || null,
        footer_background_color: formData.footer_background_color || null,
        footer_message: formData.footer_message || null,
        banners:
          safeBanners ??
          (currentBanners && currentBanners.length ? currentBanners : null),
        banners_mobile:
          safeBannersMobile ??
          (currentBannersMobile && currentBannersMobile.length
            ? currentBannersMobile
            : null),
        logo_url: safeLogo ?? logoPreview ?? null,
        og_image_url: safeOgImage ?? ogImagePreview ?? null,
        share_banner_url: safeShareBanner ?? shareBannerPreview ?? null,
        top_benefit_image_url:
          safeTopBenefitImage ?? topBenefitImagePreview ?? null,
        top_benefit_image_fit: topBenefitImageFit ?? 'cover',
        top_benefit_image_scale: topBenefitImageScale ?? 100,
        top_benefit_height: topBenefitHeight ?? 36,
        top_benefit_text_size: topBenefitTextSize ?? 11,
        top_benefit_bg_color: topBenefitBgColor ?? '#f3f4f6',
        top_benefit_text_color: topBenefitTextColor ?? '#b9722e',
        top_benefit_text: catalogSettings.top_benefit_text || null,
        show_top_benefit_bar: catalogSettings.show_top_benefit_bar ?? false,
        show_top_info_bar: catalogSettings.show_top_info_bar ?? true,
        show_installments: catalogSettings.show_installments ?? false,
        max_installments: Number(catalogSettings.max_installments || 1),
        show_sale_price: catalogSettings.show_sale_price ?? true,
        show_cost_price: catalogSettings.show_cost_price ?? false,
        manage_stock: catalogSettings.manage_stock ?? false,
        cash_price_discount_percent: Number(
          catalogSettings.cash_price_discount_percent || 5
        ),
        is_active: isActive,
        font_family: formData.font_family || null,
        font_url: formData.font_url ?? null,
        price_password_hash: pricePasswordHash ?? null,
      };

      if (formData.catalog_slug) {
        const res = await fetch('/api/settings/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(serverPayload),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error(
            json?.error || 'Falha ao salvar configurações no servidor'
          );
        publicAction = json?.success ? 'updated' : null;
      }

      const baseMsg = 'Configurações aplicadas com sucesso!';
      const publicMsg = publicAction ? ' (Catálogo público atualizado)' : '';
      toast.success(baseMsg + publicMsg, { id: toastId });
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('slug') || msg.includes('Slug')) {
        toast.error(
          'O slug informado já está em uso por outra loja. Escolha outro slug.',
          { id: toastId }
        );
        try {
          // foca e seleciona o valor do slug para facilitar a correção pelo usuário
          if (slugRef && slugRef.current) {
            slugRef.current.focus();
            slugRef.current.select();
          }
        } catch (e) {
          // ignore
        }
      } else {
        toast.error(msg, { id: toastId });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center h-screen items-center">
        <Loader2 className="animate-spin text-primary h-12 w-12" />
      </div>
    );

  const tabs = [
    { id: 'general', label: 'Geral', icon: Store },
    { id: 'appearance', label: 'Aparência', icon: Palette },
    { id: 'display', label: 'Exibição', icon: Layout },
    { id: 'marketing', label: 'Marketing', icon: Share2 },
    { id: 'stock', label: 'Estoque', icon: Package },
    // A aba 'Sincronização' é visível apenas para administradores/master
    ...(isAdmin ? [{ id: 'sync', label: 'Sincronização', icon: Zap }] : []),
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 p-4 animate-in fade-in duration-500">
      {/* HEADER FIXO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-40 bg-gray-50/90 dark:bg-slate-950/90 backdrop-blur-md py-4 border-b border-gray-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2 tracking-tight">
            <SettingsIcon className="text-primary" /> Ajustes do Sistema
          </h1>
        </div>
        <Button
          onClick={handleSave}
          isLoading={saving}
          leftIcon={<Save size={18} />}
          variant="primary"
          className="shadow-xl"
        >
          Salvar Alterações
        </Button>
      </div>

      {/* TABS NAVEGAÇÃO */}
      {/* Mobile: dropdown para selecionar aba (torna a aba Marketing acessível) */}
      <div className="md:hidden mb-2">
        <label className="sr-only">Selecionar aba</label>
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as any)}
          className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800"
        >
          {tabs.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <nav className="hidden md:flex space-x-1 border-b border-gray-200 dark:border-slate-800 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 py-4 px-6 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </nav>

      {/* --- ABA GERAL --- */}
      {activeTab === 'general' && (
        <TabGeneral
          formData={formData}
          handleChange={handleChange}
          handleSlugChange={(e: any) =>
            setFormData({ ...formData, catalog_slug: e.target.value })
          }
          slugRef={slugRef}
          showPassword={showPricePassword}
          onToggleShowPassword={() => setShowPricePassword(!showPricePassword)}
          isActive={isActive}
          onToggleActive={() => setIsActive(!isActive)}
        />
      )}

      {activeTab === 'appearance' && (
        <div className="space-y-8 animate-in slide-in-from-right-4">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-gray-200 shadow-sm space-y-8">
            <h3 className="font-black text-sm uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Brush size={18} /> Identidade e Banners
            </h3>

            {/* NOVA SEÇÃO: TEMAS PRONTOS RESTAURADA */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-gray-200 shadow-sm space-y-6">
              <h3 className="font-black text-sm uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Brush size={18} /> Sugestões de Estilo
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {THEME_PRESETS.map((theme, idx) => (
                  <button
                    key={idx}
                    onClick={() => applyTheme(theme)}
                    className="group flex flex-col gap-3 p-3 rounded-2xl border-2 border-slate-100 hover:border-primary hover:bg-slate-50 transition-all text-left"
                  >
                    <div className="flex h-10 w-full rounded-lg overflow-hidden border border-slate-200">
                      <div
                        className="w-1/2 h-full"
                        style={{ backgroundColor: theme.primary }}
                      />
                      <div
                        className="w-1/4 h-full"
                        style={{ backgroundColor: theme.secondary }}
                      />
                      <div
                        className="w-1/4 h-full"
                        style={{ backgroundColor: theme.header }}
                      />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-tight text-slate-500 group-hover:text-primary">
                      {theme.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Logo e Cores (seção mantida) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <label className="text-xs font-black uppercase text-slate-500">
                  Logo da Marca
                </label>
                <div className="h-48 w-full border-2 border-dashed rounded-[2rem] flex items-center justify-center bg-slate-50 relative group">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      className="max-h-full p-6 object-contain"
                    />
                  ) : (
                    <ImageIcon className="text-slate-200" size={64} />
                  )}
                  <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2rem]">
                    <span className="text-white font-black text-[10px] uppercase tracking-widest bg-primary px-4 py-2 rounded-xl">
                      Alterar Logo
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        try {
                          const {
                            data: { user },
                          } = await supabase.auth.getUser();
                          if (!user) throw new Error('Usuário não autenticado');

                          // Upload para Supabase Storage
                          const fileExt = file.name.split('.').pop();
                          const fileName = `logo-${Date.now()}.${fileExt}`;
                          const filePath = `${user.id}/branding/${fileName}`;

                          const { error: uploadError } = await supabase.storage
                            .from('product-images')
                            .upload(filePath, file, { upsert: true });

                          if (uploadError) throw uploadError;

                          const { data } = supabase.storage
                            .from('product-images')
                            .getPublicUrl(filePath);

                          setLogoPreview(data.publicUrl);
                          toast.success('Logo carregada com sucesso!');
                        } catch (err: any) {
                          console.error('Erro ao fazer upload da logo:', err);
                          toast.error(err.message || 'Erro ao fazer upload');
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl space-y-4">
                <label className="text-xs font-black uppercase text-slate-500 block">
                  Cores do Tema
                </label>
                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400">
                      Primária
                    </span>
                    <input
                      type="color"
                      name="primary_color"
                      value={formData.primary_color}
                      onChange={handleChange}
                      className="w-full h-12 rounded-xl cursor-pointer"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400">
                      Secundária
                    </span>
                    <input
                      type="color"
                      name="secondary_color"
                      value={formData.secondary_color}
                      onChange={handleChange}
                      className="w-full h-12 rounded-xl cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* BANNERS DESKTOP COM REORDENAÇÃO */}
            <div className="space-y-4 pt-6 border-t">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase text-slate-500">
                  Banners Desktop (1400x400)
                </label>
                <label className="px-4 py-2 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase cursor-pointer hover:bg-primary transition-colors">
                  Adicionar{' '}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (!files.length) return;

                      try {
                        const urls = await uploadBannersToStorage(
                          files,
                          'desktop'
                        );
                        setCurrentBanners((p) => [...p, ...urls]);
                      } catch (err) {
                        console.error('Erro ao enviar banners:', err);
                      }
                    }}
                  />
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentBanners.map((url, i) => (
                  <div
                    key={i}
                    className="relative aspect-[14/4] rounded-2xl overflow-hidden group border-2 border-transparent hover:border-primary transition-all shadow-md"
                  >
                    {url ? (
                      <img src={url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-sm text-gray-400">
                        Imagem indisponível
                      </div>
                    )}

                    {/* Controles de Ordem e Delete */}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => moveBanner(i, 'up')}
                        disabled={i === 0}
                        className="p-2 bg-white rounded-full text-slate-900 disabled:opacity-30 shadow-lg hover:scale-110 transition-transform"
                      >
                        <ChevronUp size={18} />
                      </button>
                      <button
                        onClick={() => moveBanner(i, 'down')}
                        disabled={i === currentBanners.length - 1}
                        className="p-2 bg-white rounded-full text-slate-900 disabled:opacity-30 shadow-lg hover:scale-110 transition-transform"
                      >
                        <ChevronDown size={18} />
                      </button>
                      <button
                        onClick={() =>
                          setCurrentBanners((p) =>
                            p.filter((_, idx) => idx !== i)
                          )
                        }
                        className="p-2 bg-red-500 rounded-full text-white shadow-lg hover:scale-110 transition-transform"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[8px] font-black px-2 py-1 rounded-md uppercase">
                      Posição: {i + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* BANNERS MOBILE COM REORDENAÇÃO */}
            <div className="space-y-4 pt-6 border-t">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase text-slate-500">
                  Banners Mobile (768x400)
                </label>
                <label className="px-4 py-2 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase cursor-pointer hover:bg-primary transition-colors">
                  Adicionar{' '}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (!files.length) return;

                      try {
                        const urls = await uploadBannersToStorage(
                          files,
                          'mobile'
                        );
                        setCurrentBannersMobile((p) => [...p, ...urls]);
                      } catch (err) {
                        console.error('Erro ao enviar banners mobile:', err);
                      }
                    }}
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {currentBannersMobile.map((url, i) => (
                  <div
                    key={i}
                    className="relative aspect-video rounded-2xl overflow-hidden group border shadow-sm border-transparent hover:border-primary transition-all"
                  >
                    {url ? (
                      <img src={url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-sm text-gray-400">
                        Imagem indisponível
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <button
                        onClick={() => moveBannerMobile(i, 'up')}
                        disabled={i === 0}
                        className="p-1.5 bg-white rounded-full text-slate-900 disabled:opacity-30 shadow-md"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => moveBannerMobile(i, 'down')}
                        disabled={i === currentBannersMobile.length - 1}
                        className="p-1.5 bg-white rounded-full text-slate-900 disabled:opacity-30 shadow-md"
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button
                        onClick={() =>
                          setCurrentBannersMobile((p) =>
                            p.filter((_, idx) => idx !== i)
                          )
                        }
                        className="p-1.5 bg-red-500 rounded-full text-white shadow-md"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ABA EXIBIÇÃO (RESTAURADA COM CONTROLE DE IMAGEM) --- */}
      {activeTab === 'display' && (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
          {/* BARRA DE BENEFÍCIOS ULTRA AVANÇADA */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-gray-200 shadow-sm space-y-6">
            <ToggleSetting
              label="Ativar Barra de Benefícios"
              name="show_top_benefit_bar"
              description="Exibe uma faixa promocional ou informativa no topo do catálogo."
              checked={catalogSettings.show_top_benefit_bar}
              onChange={handleCatalogSettingsChange}
              icon={Zap}
            >
              <div className="space-y-8 pt-6 border-t mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  {/* Coluna 1: Conteúdo e Estilo */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                        Texto da Mensagem
                      </label>
                      <input
                        type="text"
                        name="top_benefit_text"
                        value={catalogSettings.top_benefit_text}
                        onChange={handleCatalogSettingsChange}
                        className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-sm"
                        placeholder="Ex: Frete Grátis para toda Bahia!"
                      />
                    </div>

                    <div className="space-y-4 p-5 bg-slate-50 dark:bg-slate-800 rounded-[2rem]">
                      <p className="text-[10px] font-black uppercase text-slate-400">
                        Configuração de Imagem
                      </p>

                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-white overflow-hidden shrink-0">
                          {topBenefitImagePreview ? (
                            <img
                              src={topBenefitImagePreview}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <ImageIcon className="text-slate-200" size={24} />
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <label className="inline-block px-4 py-2 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase cursor-pointer hover:bg-primary transition-all">
                            Escolher Imagem
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f)
                                  setTopBenefitImagePreview(
                                    URL.createObjectURL(f)
                                  );
                              }}
                            />
                          </label>
                          {topBenefitImagePreview && (
                            <button
                              onClick={() => setTopBenefitImagePreview(null)}
                              className="block text-[10px] font-bold text-red-500 underline ml-1"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                      </div>

                      {topBenefitImagePreview && (
                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase text-slate-400">
                              Escala da Imagem ({topBenefitImageScale}%)
                            </label>
                            <input
                              type="range"
                              min="10"
                              max="200"
                              value={topBenefitImageScale}
                              onChange={(e) =>
                                setTopBenefitImageScale(Number(e.target.value))
                              }
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase text-slate-400">
                              Ajuste (Fit)
                            </label>
                            <select
                              value={topBenefitImageFit}
                              onChange={(e) =>
                                setTopBenefitImageFit(e.target.value as any)
                              }
                              className="w-full p-2 rounded-lg bg-white text-[10px] font-bold border-none shadow-sm"
                            >
                              <option value="cover">Preencher</option>
                              <option value="contain">Conter</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400">
                          Alinhamento Texto
                        </label>
                        <select
                          value={topBenefitTextAlign}
                          onChange={(e) =>
                            setTopBenefitTextAlign(e.target.value as any)
                          }
                          className="w-full p-3 rounded-xl bg-slate-50 font-bold text-xs border-none"
                        >
                          <option value="left">Esquerda</option>
                          <option value="center">Centro</option>
                          <option value="right">Direita</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400">
                          Alinhamento Imagem
                        </label>
                        <select
                          value={topBenefitImageAlign}
                          onChange={(e) =>
                            setTopBenefitImageAlign(e.target.value as any)
                          }
                          className="w-full p-3 rounded-xl bg-slate-50 font-bold text-xs border-none"
                        >
                          <option value="left">Esquerda</option>
                          <option value="center">Centro</option>
                          <option value="right">Direita</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Coluna 2: Design e Preview */}
                  <div className="space-y-6">
                    <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem] space-y-6">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                        Ajuste Visual da Barra
                      </p>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500">
                            Fundo
                          </label>
                          <div className="flex items-center gap-2 bg-white p-2 rounded-xl border">
                            <input
                              type="color"
                              value={topBenefitBgColor}
                              onChange={(e) =>
                                setTopBenefitBgColor(e.target.value)
                              }
                              className="h-6 w-6 rounded cursor-pointer border-none"
                            />
                            <span className="text-[10px] font-mono uppercase">
                              {topBenefitBgColor}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500">
                            Texto
                          </label>
                          <div className="flex items-center gap-2 bg-white p-2 rounded-xl border">
                            <input
                              type="color"
                              value={topBenefitTextColor}
                              onChange={(e) =>
                                setTopBenefitTextColor(e.target.value)
                              }
                              className="h-6 w-6 rounded cursor-pointer border-none"
                            />
                            <span className="text-[10px] font-mono uppercase">
                              {topBenefitTextColor}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black uppercase text-slate-400">
                            Altura da Barra: {topBenefitHeight}px
                          </label>
                          <input
                            type="range"
                            min="20"
                            max="100"
                            value={topBenefitHeight}
                            onChange={(e) =>
                              setTopBenefitHeight(Number(e.target.value))
                            }
                            className="w-32"
                          />
                        </div>
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black uppercase text-slate-400">
                            Tamanho da Fonte: {topBenefitTextSize}px
                          </label>
                          <input
                            type="range"
                            min="8"
                            max="24"
                            value={topBenefitTextSize}
                            onChange={(e) =>
                              setTopBenefitTextSize(Number(e.target.value))
                            }
                            className="w-32"
                          />
                        </div>
                      </div>

                      {/* PREVIEW EM TEMPO REAL DENTRO DO CARD */}
                      <div className="space-y-2 mt-4 pt-4 border-t border-slate-200">
                        <p className="text-[9px] font-black uppercase text-slate-400 text-center">
                          Preview do Topo
                        </p>
                        <div
                          style={{
                            backgroundColor: topBenefitBgColor,
                            color: topBenefitTextColor,
                            height: topBenefitHeight,
                            fontSize: topBenefitTextSize,
                            justifyContent:
                              topBenefitTextAlign === 'center'
                                ? 'center'
                                : topBenefitTextAlign === 'right'
                                  ? 'flex-end'
                                  : 'flex-start',
                          }}
                          className="w-full rounded-xl flex items-center px-4 shadow-inner relative overflow-hidden font-black"
                        >
                          {topBenefitImagePreview && (
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                justifyContent:
                                  topBenefitImageAlign === 'center'
                                    ? 'center'
                                    : topBenefitImageAlign === 'right'
                                      ? 'flex-end'
                                      : 'flex-start',
                                alignItems: 'center',
                                zIndex: 0,
                              }}
                            >
                              <img
                                src={topBenefitImagePreview}
                                style={{
                                  height: `${topBenefitImageScale}%`,
                                  objectFit: topBenefitImageFit,
                                  opacity: 0.8,
                                }}
                              />
                            </div>
                          )}
                          <span className="relative z-10">
                            {catalogSettings.top_benefit_text ||
                              'Sua Mensagem Aqui'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ToggleSetting>
          </div>

          {/* REGRAS DE PREÇO (MANTIDAS) */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-gray-200 shadow-sm space-y-8">
            <h3 className="font-black text-sm uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <DollarSign size={18} /> Regras de Negócio e Preços
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl space-y-6">
                <ToggleSetting
                  label="Exibir Preço Sugerido"
                  name="show_sale_price"
                  description="Ativa o preço final de varejo no catálogo."
                  checked={catalogSettings.show_sale_price}
                  onChange={(e: any) => {
                    setCatalogSettings((p) => ({
                      ...p,
                      show_sale_price: e.target.checked,
                      show_cost_price: !e.target.checked,
                    }));
                  }}
                  icon={Tag}
                />

                <ToggleSetting
                  label="Exibir Preço de Custo"
                  name="show_cost_price"
                  description="Exibe o valor da sua tabela para o lojista."
                  checked={catalogSettings.show_cost_price}
                  onChange={(e: any) => {
                    setCatalogSettings((p) => ({
                      ...p,
                      show_cost_price: e.target.checked,
                      show_sale_price: !e.target.checked,
                    }));
                  }}
                  icon={Package}
                />
              </div>

              {catalogSettings.show_sale_price && (
                <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                  <div className="p-6 border-2 border-indigo-100 rounded-3xl space-y-6 bg-indigo-50/20">
                    <ToggleSetting
                      label="Habilitar Parcelamento"
                      name="show_installments"
                      description="Exibe 'Ou 10x de R$ X'."
                      checked={catalogSettings.show_installments}
                      onChange={handleCatalogSettingsChange}
                      icon={CreditCard}
                    >
                      <div className="mt-4 flex items-center gap-3">
                        <span className="text-xs font-bold text-indigo-900">
                          Máximo de parcelas:
                        </span>
                        <input
                          type="number"
                          name="max_installments"
                          value={catalogSettings.max_installments}
                          onChange={handleCatalogSettingsChange}
                          className="w-20 p-2 rounded-lg border-none font-black text-center text-indigo-600 bg-white shadow-sm"
                        />
                      </div>
                    </ToggleSetting>

                    <ToggleSetting
                      label="Tag de Desconto à Vista"
                      name="show_discount_tag"
                      description="Mostra o selo de % OFF no produto."
                      checked={catalogSettings.show_discount_tag}
                      onChange={handleCatalogSettingsChange}
                      icon={Zap}
                    >
                      <div className="mt-4 flex items-center gap-3">
                        <span className="text-xs font-bold text-indigo-900">
                          Percentual (%):
                        </span>
                        <input
                          type="number"
                          name="cash_price_discount_percent"
                          value={catalogSettings.cash_price_discount_percent}
                          onChange={handleCatalogSettingsChange}
                          className="w-20 p-2 rounded-lg border-none font-black text-center text-indigo-600 bg-white shadow-sm"
                        />
                      </div>
                    </ToggleSetting>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- ABA MARKETING (CONTEÚDO ISOLADO) --- */}
      {activeTab === 'marketing' && (
        <div className="space-y-8 animate-in slide-in-from-right-4">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-gray-200 shadow-sm">
            <h3 className="font-black text-sm uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-8">
              <Share2 size={18} /> Estratégia Digital
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-8">
                <WhatsAppLinkGenerator
                  catalogUrl={`https://repvendas.com.br/catalogo/${formData.catalog_slug}`}
                  catalogName={formData.name}
                  imageUrl={shareBannerPreview || logoPreview || '/link.webp'}
                />
                <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl">
                  <p className="text-xs font-black uppercase text-slate-400 mb-4">
                    Banner de Compartilhamento
                  </p>
                  <SmartImageUpload
                    onUploadReady={async (f) => {
                      const file = f as File;
                      setShareUploading(true);
                      try {
                        // Ler o arquivo local como blob (optimizado) e enviar como FormData
                        const reader = new FileReader();
                        const dataUrl: string = await new Promise(
                          (res, rej) => {
                            reader.onerror = rej;
                            reader.onload = () =>
                              res(String(reader.result || ''));
                            reader.readAsDataURL(file);
                          }
                        );

                        // Converte dataURL em Blob
                        const blob = await (await fetch(dataUrl)).blob();

                        // Obtém user id para metadata (safe fallback)
                        const { data: { user } = {} } =
                          await supabase.auth.getUser();
                        const userId = user?.id || 'anon';

                        const form = new FormData();
                        // Nome do arquivo original preservado quando possível
                        const fileObj = new File(
                          [blob],
                          file.name || `share-${Date.now()}.webp`,
                          { type: blob.type || 'image/webp' }
                        );
                        form.append('file', fileObj);
                        form.append('userId', String(userId));
                        form.append(
                          'brandSlug',
                          formData.catalog_slug || 'share'
                        );

                        const resp = await fetch('/api/upload/share-banner', {
                          method: 'POST',
                          body: form,
                        });

                        const json = await resp.json().catch(() => ({}));
                        if (!resp.ok || !json?.publicUrl) {
                          throw new Error(
                            json?.error ||
                              json?.message ||
                              'Upload server falhou'
                          );
                        }

                        setShareBannerPreview(json.publicUrl);
                        toast.success('Banner de compartilhamento carregado');
                      } catch (err: any) {
                        console.error('Erro upload share banner', err);
                        toast.error(err?.message || 'Falha no upload');
                      } finally {
                        setShareUploading(false);
                      }
                    }}
                  />
                  {shareUploading && (
                    <div className="text-sm text-slate-500 mt-2">
                      Enviando banner...
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-4 md:sticky md:top-24">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">
                  Preview WhatsApp
                </label>
                <SharePreview
                  title={formData.name}
                  description={formData.footer_message}
                  imageUrl={shareBannerPreview || logoPreview || '/link.webp'}
                  domain="repvendas.com.br"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-gray-200 shadow-sm overflow-hidden">
            <h3 className="font-black text-sm uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-8">
              <LinkIcon size={18} /> Meus Links Curtos e Performance
            </h3>
            <MyShortLinksTable />
            <div className="mt-12 pt-12 border-t">
              <h4 className="font-black text-sm text-slate-900 dark:text-white mb-6 uppercase tracking-widest">
                Gráfico de Engajamento
              </h4>
              <AnalyticsChartClient />
            </div>
          </div>
        </div>
      )}

      {/* --- ABA ESTOQUE --- */}
      {activeTab === 'stock' && (
        <div className="space-y-8 animate-in slide-in-from-right-4">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-gray-200 shadow-sm">
            <h3 className="font-black text-sm uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-8">
              <Package size={18} /> Gestão de Inventário
            </h3>
            <ToggleSetting
              label="Bloquear venda sem estoque"
              name="manage_stock"
              description="Impede o fechamento do pedido se o item estiver zerado."
              checked={catalogSettings.manage_stock}
              onChange={handleCatalogSettingsChange}
              icon={AlertTriangle}
            >
              <div className="mt-6 p-6 bg-amber-50 rounded-3xl border border-amber-100">
                <ToggleSetting
                  label="Permitir Encomenda (Backorder)"
                  name="global_allow_backorder"
                  description="O cliente pode pedir mesmo sem estoque, sob aviso de prazo."
                  checked={catalogSettings.global_allow_backorder}
                  onChange={handleCatalogSettingsChange}
                  icon={Zap}
                />
              </div>
            </ToggleSetting>
          </div>
        </div>
      )}

      {/* --- ABA SINCRONIZAÇÃO (MASTER ONLY) --- */}
      {activeTab === 'sync' && (
        <div className="space-y-8 animate-in slide-in-from-right-4">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-sm uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Zap size={18} className="text-blue-600" /> Painel de
                Sincronização
              </h3>
              <a
                href="/dashboard/settings/sync"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Zap size={16} />
                Abrir Torre de Controle
              </a>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Gerencie a sincronização de imagens externas para o Supabase
              Storage. Visualize logs em tempo real, monitore o progresso e
              processe imagens pesadas de forma controlada.
            </p>
            <div className="mt-6 p-6 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                💡 Como funciona?
              </h4>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                <li>
                  Importações via Excel marcam imagens como{' '}
                  <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900 rounded">
                    pending
                  </code>
                </li>
                <li>CRON job processa automaticamente à madrugada (2h)</li>
                <li>
                  Painel Master permite disparar sync manual para urgências
                </li>
                <li>Logs em tempo real mostram progresso e erros</li>
                <li>Throttling inteligente previne timeouts e sobrecarga</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
