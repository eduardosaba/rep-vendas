'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  updateThemeColors,
  applyThemeColors,
  applyDashboardFont,
} from '@/lib/theme';
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
  ImageIcon,
  X,
  Plus,
  DollarSign,
  Tag,
  CreditCard,
  Package,
  AlertTriangle,
  Zap,
  Brush,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { Lock } from 'lucide-react';
import { SYSTEM_FONTS } from '@/lib/fonts';
import { Button } from '@/components/ui/Button';
import { usePlan } from '@/hooks/use-plan';

// Componentes extraídos
import { ToggleSetting } from './components/ToggleSetting';
import SmartImageUpload from '@/components/SmartImageUpload';
import { TabGeneral } from './components/TabGeneral';

interface CatalogSettings {
  show_top_benefit_bar: boolean;
  show_top_info_bar?: boolean;
  top_benefit_text: string;
  show_installments: boolean;
  max_installments: string;
  show_discount_tag: boolean;
  cash_price_discount_percent: string;
  manage_stock: boolean;
  global_allow_backorder: boolean;
  show_cost_price: boolean;
  show_sale_price: boolean;
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
  const [showPricePassword, setShowPricePassword] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'general' | 'appearance' | 'display' | 'stock'
  >('general');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    catalog_slug: '',
    // Fonte do representante (nullable) - se null usa fonte do sistema
    font_family: null as string | null,
    // URL pública da fonte customizada (se o usuário fez upload)
    font_url: null as string | null,
    plan_type: 'free',
    primary_color: '#b9722e',
    secondary_color: '#0d1b2c',
    header_background_color: '#ffffff',
    footer_background_color: '#0d1b2c',
    price_password: '',
    footer_message: '',
    representative_name: '',
    whatsapp_message_template:
      'Olá {{cliente}}! Recebi seu pedido #{{pedido_id}} aqui no sistema. 🎉\n\nEm breve entro em contato para combinarmos a entrega.\n\nAtenciosamente,\n{{representante}}',
  });

  const [catalogSettings, setCatalogSettings] = useState<CatalogSettings>({
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

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [currentBanners, setCurrentBanners] = useState<string[]>([]);
  const [currentBannersMobile, setCurrentBannersMobile] = useState<string[]>(
    []
  );

  // Loja Online / Offline
  const [isActive, setIsActive] = useState<boolean>(true);

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

  // Estados de imagem e alinhamento
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

  const [newBannerFiles, setNewBannerFiles] = useState<
    { file: File | null; preview: string; tooSmall?: boolean }[]
  >([]);
  const [newBannerFilesMobile, setNewBannerFilesMobile] = useState<
    { file: File | null; preview: string; tooSmall?: boolean }[]
  >([]);
  const [logoUploading, setLogoUploading] = useState(false);

  const [allowCustomFonts, setAllowCustomFonts] = useState<boolean>(true);

  // IMPORTANT: Declare este hook ANTES do early return para respeitar Rules of Hooks
  const [useSystemFont, setUseSystemFont] = useState<boolean>(
    formData.font_family ? false : true
  );

  const RECOMMENDED_BANNER = { width: 1400, height: 400 };
  const RECOMMENDED_BANNER_MOBILE = { width: 768, height: 400 };

  const { planType: planTypeHook } = usePlan();

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
    setUseSystemFont(formData.font_family ? false : true);
  }, [formData.font_family]);

  // Aplica a fonte ao dashboard em tempo real (preview)
  useEffect(() => {
    if (!useSystemFont && formData.font_family) {
      applyDashboardFont(formData.font_family);
    } else {
      applyDashboardFont(null); // Remove fonte customizada
    }
  }, [useSystemFont, formData.font_family]);

  // Cleanup de blob URLs para evitar memory leaks
  useEffect(() => {
    return () => {
      // Limpa preview da logo se for blob URL
      if (logoPreview && logoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreview);
      }
      // Limpa previews dos novos banners
      newBannerFiles.forEach((banner) => {
        if (banner.preview.startsWith('blob:')) {
          URL.revokeObjectURL(banner.preview);
        }
      });
      // Limpa previews dos novos banners mobile
      newBannerFilesMobile.forEach((banner) => {
        if (banner.preview.startsWith('blob:')) {
          URL.revokeObjectURL(banner.preview);
        }
      });
      // Limpa preview da top benefit image se for blob URL
      if (
        topBenefitImagePreview &&
        topBenefitImagePreview.startsWith('blob:')
      ) {
        URL.revokeObjectURL(topBenefitImagePreview);
      }
    };
  }, [
    logoPreview,
    newBannerFiles,
    newBannerFilesMobile,
    topBenefitImagePreview,
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
            font_family: settings.font_family ?? null,
            font_url: settings.font_url ?? null,
            plan_type: settings.plan_type || 'free',
            primary_color: settings.primary_color || '#b9722e',
            secondary_color: settings.secondary_color || '#0d1b2c',
            header_background_color:
              settings.header_background_color || '#ffffff',
            footer_background_color:
              settings.footer_background_color || '#0d1b2c',
            price_password: settings.price_password || '',
            footer_message: settings.footer_message || '',
            representative_name: settings.representative_name || '',
            whatsapp_message_template:
              settings.whatsapp_message_template ||
              'Olá {{cliente}}! Recebi seu pedido #{{pedido_id}} aqui no sistema. 🎉\n\nEm breve entro em contato para combinarmos a entrega.\n\nAtenciosamente,\n{{representante}}',
          });
          // manter campo `price_password` como está (sem hash)
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
            manage_stock: settings.manage_stock ?? false,
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
              settings.primary_color ||
              '#b9722e'
          );

          if (settings.top_benefit_image_fit)
            setTopBenefitImageFit(settings.top_benefit_image_fit);
          if (settings.top_benefit_image_scale)
            setTopBenefitImageScale(settings.top_benefit_image_scale);
          if (settings.top_benefit_text_align)
            setTopBenefitTextAlign(settings.top_benefit_text_align);
          if (settings.top_benefit_image_align)
            setTopBenefitImageAlign(settings.top_benefit_image_align);

          setIsActive(settings.is_active ?? true);

          if (Array.isArray(settings.banners))
            setCurrentBanners(settings.banners);
          if (Array.isArray(settings.banners_mobile))
            setCurrentBannersMobile(settings.banners_mobile);
        }
        // buscar configuração global para gating (allow_custom_fonts)
        try {
          const res = await fetch('/api/global_config');
          const json = await res.json();
          if (json && typeof json.allow_custom_fonts === 'boolean') {
            setAllowCustomFonts(json.allow_custom_fonts);
            if (!json.allow_custom_fonts) {
              // se o sistema não permite fontes customizadas, reset local
              if (settings.font_family) {
                setFormData((p) => ({ ...p, font_family: null }));
                setUseSystemFont(true);
              }
            }
          }
        } catch (err) {
          // ignore
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
    const file = e.target.files?.[0];
    if (!file) return;

    // Revoga o blob URL anterior se existir
    if (logoPreview && logoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreview);
    }

    // Cria preview imediatamente
    const objectURL = URL.createObjectURL(file);
    setLogoFile(file);
    setLogoPreview(objectURL);
    toast.success('Logo carregada! Fazendo upload em segundo plano...');

    // Upload imediato (fire-and-forget, o handleSave não re-enviará se logoFile for null)
    (async () => {
      try {
        setLogoUploading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('Login necessário');
        const fileExt = file.name.split('.').pop();
        const fileName = `public/${user.id}/branding/logo-${Date.now()}.${fileExt}`;
        const { error } = await supabase.storage
          .from('product-images')
          .upload(fileName, file, { upsert: true });
        if (!error) {
          const { data } = supabase.storage
            .from('product-images')
            .getPublicUrl(fileName);
          // Substitui preview temporário pelo URL público
          setLogoPreview(data.publicUrl);
          // limpa o file porque já foi enviado
          setLogoFile(null);
          toast.success('Logo enviada com sucesso!');
        } else {
          throw error;
        }
      } catch (err: any) {
        console.error('Logo upload failed', err);
        toast.error('Falha ao enviar logo. Preview mantido localmente.');
      } finally {
        setLogoUploading(false);
      }
    })();
  };
  const handleBannerFile = async (file: File, isMobile = false) => {
    const preview = URL.createObjectURL(file);
    // Check dimensions according to mobile/desktop recommended sizes
    const rec = isMobile ? RECOMMENDED_BANNER_MOBILE : RECOMMENDED_BANNER;
    const tooSmall = await new Promise<boolean>((resolve) => {
      const img = new Image();
      img.src = preview;
      img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const recW = rec.width;
        const recH = rec.height;
        const recRatio = recW / recH;
        const imgRatio = w / h;
        const widthOk = w >= recW * 0.6;
        const ratioOk = Math.abs(imgRatio - recRatio) / recRatio <= 0.12;
        resolve(!(widthOk && ratioOk) && (w < recW || h < recH));
      };
      img.onerror = () => resolve(true);
    });

    // Add to state immediately
    const entry = { file, preview, tooSmall } as any;
    if (isMobile) {
      setNewBannerFilesMobile((prev) => [...prev, entry]);
    } else {
      setNewBannerFiles((prev) => [...prev, entry]);
    }

    toast.success('Banner adicionado! Fazendo upload em segundo plano...');

    // Start background upload and replace preview when done
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const fileExt = file.name.split('.').pop();
        const suffix = Math.random().toString(36).slice(2);
        const fileName = `public/${user.id}/banners/${isMobile ? 'mobile' : 'banner'}-${Date.now()}-${suffix}.${fileExt}`;
        const { error } = await supabase.storage
          .from('product-images')
          .upload(fileName, file, { upsert: true });
        if (!error) {
          const { data } = supabase.storage
            .from('product-images')
            .getPublicUrl(fileName);
          if (isMobile) {
            setNewBannerFilesMobile((prev) =>
              prev.map((p) =>
                p.preview === preview
                  ? { ...p, preview: data.publicUrl, file: null }
                  : p
              )
            );
          } else {
            setNewBannerFiles((prev) =>
              prev.map((p) =>
                p.preview === preview
                  ? { ...p, preview: data.publicUrl, file: null }
                  : p
              )
            );
          }
          setTimeout(() => {
            try {
              URL.revokeObjectURL(preview);
            } catch {}
          }, 2000);
        }
      } catch (err) {
        console.error('banner upload failed', err);
      }
    })();
  };

  const removeNewBanner = (index: number) => {
    setNewBannerFiles((prev) => {
      // Revoga o blob URL do banner removido
      const bannerToRemove = prev[index];
      if (bannerToRemove?.preview.startsWith('blob:')) {
        URL.revokeObjectURL(bannerToRemove.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleBannerMobileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);
    const processed = await Promise.all(
      filesArray.map(async (file) => {
        const preview = URL.createObjectURL(file);
        const tooSmall = await new Promise<boolean>((resolve) => {
          const img = new window.Image();
          img.src = preview;
          img.onload = () => {
            const w = img.naturalWidth;
            const h = img.naturalHeight;
            const recW = RECOMMENDED_BANNER_MOBILE.width;
            const recH = RECOMMENDED_BANNER_MOBILE.height;
            const recRatio = recW / recH;
            const imgRatio = w / h;
            const widthOk = w >= recW * 0.6;
            const ratioOk = Math.abs(imgRatio - recRatio) / recRatio <= 0.12;
            resolve(!(widthOk && ratioOk) && (w < recW || h < recH));
          };
          img.onerror = () => resolve(true);
        });

        (async () => {
          try {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (!user) return;
            const fileExt = file.name.split('.').pop();
            const fileName = `public/${user.id}/banners/mobile-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
            const { error } = await supabase.storage
              .from('product-images')
              .upload(fileName, file, { upsert: true });
            if (!error) {
              const { data } = supabase.storage
                .from('product-images')
                .getPublicUrl(fileName);
              setNewBannerFilesMobile((prev) =>
                prev.map((p) =>
                  p.preview === preview
                    ? { ...p, preview: data.publicUrl, file: null }
                    : p
                )
              );
              setTimeout(() => {
                try {
                  URL.revokeObjectURL(preview);
                } catch {}
              }, 2000);
            }
          } catch (err) {
            console.error('mobile banner upload failed', err);
          }
        })();

        return { file, preview, tooSmall };
      })
    );
    setNewBannerFilesMobile((prev) => [...prev, ...processed]);
    toast.success(
      `${processed.length} banner(s) mobile adicionado(s)! Confira o preview acima.`
    );
  };

  const removeNewBannerMobile = (index: number) => {
    setNewBannerFilesMobile((prev) => {
      // Revoga o blob URL do banner removido
      const bannerToRemove = prev[index];
      if (bannerToRemove?.preview.startsWith('blob:')) {
        URL.revokeObjectURL(bannerToRemove.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  // Funções para reordenar banners
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

  const moveNewBanner = (index: number, direction: 'up' | 'down') => {
    setNewBannerFiles((prev) => {
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

  const moveNewBannerMobile = (index: number, direction: 'up' | 'down') => {
    setNewBannerFilesMobile((prev) => {
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

  const handleTopBenefitImageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files?.[0]) return;
    // Revoga o blob URL anterior se existir
    if (topBenefitImagePreview && topBenefitImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(topBenefitImagePreview);
    }
    const file = e.target.files[0];
    const objectURL = URL.createObjectURL(file);
    setTopBenefitImageFile(file);
    setTopBenefitImagePreview(objectURL);
    toast.success('Imagem da barra de benefícios carregada! Fazendo upload...');

    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const fileExt = file.name.split('.').pop();
        const fileName = `public/${user.id}/topbar/top-benefit-${Date.now()}.${fileExt}`;
        const { error } = await supabase.storage
          .from('product-images')
          .upload(fileName, file, { upsert: true });
        if (!error) {
          const { data } = supabase.storage
            .from('product-images')
            .getPublicUrl(fileName);
          setTopBenefitImagePreview(data.publicUrl);
          setTopBenefitImageFile(null);
          toast.success('Imagem da barra carregada com sucesso!');
        }
      } catch (err) {
        console.error('top benefit upload failed', err);
      }
    })();
  };

  const removeTopBenefitImage = () => {
    // Revoga o blob URL se existir
    if (topBenefitImagePreview && topBenefitImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(topBenefitImagePreview);
    }
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

      // otimização: fazer uploads em paralelo (logo + banners)
      const uploadSingleBanner = async (
        item: { file: File; preview: string },
        folder: string,
        index: number
      ) => {
        try {
          const fileExt = item.file.name.split('.').pop();
          const fileName = `public/${currentUserId}/${folder}/banner-${Date.now()}-${index}.${fileExt}`;
          const { error } = await supabase.storage
            .from('product-images')
            .upload(fileName, item.file, { upsert: true });
          if (!error) {
            const { data } = supabase.storage
              .from('product-images')
              .getPublicUrl(fileName);
            return data.publicUrl;
          }
        } catch (err) {
          console.error('Erro upload banner', err);
        }
        return null;
      };

      const uploadBanners = async (
        files: { file: File | null; preview: string }[],
        folder: string
      ) => {
        if (!files || files.length === 0) return [];
        // Preserve already-uploaded previews (file === null && preview is a public URL)
        const alreadyUploaded = files
          .filter(
            (f) =>
              !f.file &&
              typeof f.preview === 'string' &&
              /^https?:\/\//.test(f.preview)
          )
          .map((f) => f.preview);

        // Items that still need uploading
        const itemsToUpload = files.filter((f) => f.file) as {
          file: File;
          preview: string;
        }[];

        if (itemsToUpload.length === 0) return alreadyUploaded;

        const promises = itemsToUpload.map((item, idx) =>
          uploadSingleBanner(item, folder, idx)
        );
        const results = await Promise.all(promises);
        return [...alreadyUploaded, ...results.filter(Boolean)] as string[];
      };

      const uploadLogo = async () => {
        if (!logoFile) return logoPreview;
        try {
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
            return data.publicUrl;
          }
        } catch (err) {
          console.error('Erro upload logo', err);
        } finally {
          setLogoUploading(false);
        }
        return logoPreview;
      };

      const [uploadedBanners, uploadedBannersMobile, logoResult] =
        await Promise.all([
          uploadBanners(newBannerFiles, 'banners'),
          uploadBanners(newBannerFilesMobile, 'banners'),
          uploadLogo(),
        ]);
      const uploadedBannersSafe = uploadedBanners || [];
      const uploadedBannersMobileSafe = uploadedBannersMobile || [];
      const finalBanners = [...currentBanners, ...uploadedBannersSafe];
      const finalBannersMobile = [
        ...currentBannersMobile,
        ...uploadedBannersMobileSafe,
      ];
      let logoUrl = logoResult || logoPreview;

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
      const finalEnableStock = catalogSettings.manage_stock ?? false;

      const fullSettings = {
        user_id: currentUserId,
        ...formData,
        ...catalogSettings,
        font_url: formData.font_url ?? null,
        logo_url: logoUrl,
        banners: finalBanners,
        banners_mobile: finalBannersMobile,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      };

      const { normalizePhone } = await import('@/lib/phone');
      fullSettings.phone = normalizePhone(fullSettings.phone);

      const { error } = await supabase
        .from('settings')
        .upsert(fullSettings, { onConflict: 'user_id' });

      if (error) {
        if (error.code === '23505')
          throw new Error('Este link da loja já está em uso.');
        throw error;
      }

      // mantemos o fluxo simples: senha (se informada) é gravada em `price_password`

      setNewBannerFiles([]);
      setNewBannerFilesMobile([]);
      setCurrentBanners(finalBanners);
      setCurrentBannersMobile(finalBannersMobile);
      updateThemeColors({
        primary: formData.primary_color,
        secondary: formData.secondary_color,
        headerBg: formData.header_background_color,
      });

      // não bloquear o salvamento aguardando o sync do catálogo: fire-and-forget
      fetch('/api/public_catalogs/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUserId,
          slug: formData.catalog_slug,
          store_name: formData.name,
          logo_url: logoUrl,
          banners: finalBanners,
          banners_mobile: finalBannersMobile,
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
          footer_background_color: formData.footer_background_color,
          phone: formData.phone,
          email: formData.email,
          footer_message: formData.footer_message,
          font_family: formData.font_family,
          font_url: formData.font_url ?? null,
          representative_name: formData.representative_name,
          whatsapp_message_template: formData.whatsapp_message_template,
          show_sale_price: finalShowSale,
          show_cost_price: finalShowCost,
          show_installments: finalShowInstallments,
          max_installments: finalMaxInstallments,
          show_cash_discount: finalShowCashDiscount,
          cash_price_discount_percent: finalCashDiscountPercent,
          manage_stock: finalEnableStock,
          header_background_color: formData.header_background_color,
          top_benefit_image_url: topBenefitImageUrl,
          top_benefit_height: topBenefitHeight,
          top_benefit_text_size: topBenefitTextSize,
          top_benefit_bg_color: topBenefitBgColor,
          top_benefit_text_color: topBenefitTextColor,
          top_benefit_image_fit: topBenefitImageFit,
          top_benefit_image_scale: topBenefitImageScale,
          top_benefit_text_align: topBenefitTextAlign,
          top_benefit_image_align: topBenefitImageAlign,
          top_benefit_text: catalogSettings.top_benefit_text,
          show_top_benefit_bar: catalogSettings.show_top_benefit_bar,
          is_active: isActive,
        }),
      }).catch((err) => console.error('Sync error (non-blocking):', err));

      toast.success('Configurações salvas!', { id: toastId });
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao salvar', {
        id: toastId,
        description: errorMessage,
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

  const isPro = formData.plan_type === 'pro';
  const isMaster = planTypeHook === 'master';
  const canCustomize = (isMaster || isPro) && allowCustomFonts;

  // Helpers for Preview
  const isValidHex = (hex?: string) =>
    !!hex && /^#([0-9A-F]{3}|[0-9A-F]{6})$/i.test(hex);
  const _validatedTopBg = isValidHex(topBenefitBgColor)
    ? topBenefitBgColor
    : '#f3f4f6';
  const _validatedTopTextColor = isValidHex(topBenefitTextColor)
    ? topBenefitTextColor
    : formData.primary_color || '#b9722e';
  const _validatedTopHeight = Math.min(
    120,
    Math.max(20, Number(topBenefitHeight || 36))
  );
  const _validatedTopTextSize = Math.min(
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

      {/* STATUS CARD: Loja Online / Offline */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 flex items-center gap-4">
          <div
            className={`h-10 w-10 flex items-center justify-center rounded-full ${isActive ? 'bg-green-50' : 'bg-red-50'}`}
          >
            <Power
              className={`${isActive ? 'text-green-600' : 'text-red-600'} animate-pulse`}
            />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {isActive ? 'Loja Online' : 'Loja Offline'}
            </div>
            <div className="text-xs text-gray-500 dark:text-slate-400">
              Produtos públicos serão exibidos apenas quando Online.
            </div>
          </div>
          <div className="ml-auto">
            <button
              onClick={() => setIsActive((v) => !v)}
              className={`px-3 py-1 rounded-lg font-medium border ${isActive ? 'border-green-600 text-green-700 bg-green-50 hover:bg-green-100' : 'border-red-600 text-red-700 bg-red-50 hover:bg-red-100'}`}
            >
              {isActive ? 'Desativar' : 'Ativar'}
            </button>
          </div>
        </div>
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
                onClick={() =>
                  setActiveTab(
                    tab.id as 'general' | 'appearance' | 'display' | 'stock'
                  )
                }
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
          showPassword={showPricePassword}
          onToggleShowPassword={() => setShowPricePassword((v) => !v)}
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

          {/* FONT SETTINGS */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-gray-900 dark:text-white flex gap-2">
                  <Type size={18} className="text-[var(--primary)]" /> Fonte do
                  Catálogo
                </h3>
                {!isPro && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase">
                    <Lock size={12} /> Recurso Premium
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (!canCustomize) return;
                      const next = !useSystemFont;
                      setUseSystemFont(next);
                      if (next)
                        setFormData((p) => ({
                          ...p,
                          font_family: null,
                          font_url: null,
                        }));
                    }}
                    className={`px-3 py-1 rounded-full text-sm font-bold transition-all ${useSystemFont ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-600'} ${!canCustomize ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={
                      !canCustomize
                        ? 'Fonte customizada desativada (política ou plano)'
                        : ''
                    }
                  >
                    {useSystemFont
                      ? 'Usando fonte do sistema'
                      : 'Fonte Customizada'}
                  </button>

                  {/* Upload de fonte - apenas se pode customizar */}
                  <label
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium cursor-pointer border ${!canCustomize ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <input
                      type="file"
                      accept=".woff2,.woff,.ttf,.otf"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        if (!canCustomize) return;
                        const fd = new FormData();
                        fd.append('file', f);
                        fd.append(
                          'name',
                          f.name.replace(/\.(woff2|woff|ttf|otf)$/i, '')
                        );
                        try {
                          const res = await fetch('/api/fonts/upload', {
                            method: 'POST',
                            body: fd,
                          });
                          const json = await res.json();
                          if (json?.url) {
                            const name =
                              json.name ||
                              f.name.replace(/\.(woff2|woff|ttf|otf)$/i, '');
                            setFormData((p) => ({
                              ...p,
                              font_family: name,
                              font_url: json.url,
                            }));
                            toast.success('Fonte carregada com sucesso!');
                          } else {
                            toast.error('Falha ao enviar a fonte');
                          }
                        } catch (err) {
                          console.error('upload font error', err);
                          toast.error('Erro no upload');
                        }
                      }}
                    />
                    <span className="text-xs">Enviar Fonte</span>
                  </label>
                </div>
              </div>
            </div>
            {!useSystemFont && (
              <div>
                {formData.font_url && (
                  <div className="mb-3 p-3 rounded-md bg-gray-50 dark:bg-slate-950 border border-gray-100 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Fonte Carregada</div>
                      <div className="text-xs text-gray-500">
                        {formData.font_family}
                      </div>
                    </div>
                    <div>
                      <button
                        className="text-sm underline"
                        onClick={() =>
                          setFormData((p) => ({
                            ...p,
                            font_family: null,
                            font_url: null,
                          }))
                        }
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                )}
                {!canCustomize && (
                  <div className="mb-3 text-sm text-yellow-700 bg-yellow-50 p-3 rounded">
                    Customização de fontes indisponível.{' '}
                    <button
                      className="underline font-bold"
                      onClick={() =>
                        window.open('/dashboard/billing', '_blank')
                      }
                    >
                      Solicite upgrade
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {SYSTEM_FONTS.map((f) => (
                    <button
                      key={f.name}
                      onClick={() =>
                        canCustomize &&
                        setFormData((p) => ({ ...p, font_family: f.name }))
                      }
                      style={{ fontFamily: f.family }}
                      disabled={!canCustomize}
                      className={`p-3 rounded-lg border transition-all text-left ${formData.font_family === f.name ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'} ${!canCustomize ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="text-lg">Aa Bb Cc</div>
                      <div className="text-[10px] font-bold text-gray-600 mt-1">
                        {f.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
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
                <SmartImageUpload
                  onUploadReady={async (file) => {
                    try {
                      // revoke previous blob preview if any
                      if (logoPreview && logoPreview.startsWith('blob:')) {
                        try {
                          URL.revokeObjectURL(logoPreview);
                        } catch {}
                      }
                      const objectURL = URL.createObjectURL(file as File);
                      setLogoFile(file as File);
                      setLogoPreview(objectURL);
                      toast.success(
                        'Logo carregada! Fazendo upload em segundo plano...'
                      );

                      setLogoUploading(true);
                      const {
                        data: { user },
                      } = await supabase.auth.getUser();
                      if (!user) throw new Error('Login necessário');
                      const fileExt = (file as File).name.split('.').pop();
                      const fileName = `public/${user.id}/branding/logo-${Date.now()}.${fileExt}`;
                      const { error } = await supabase.storage
                        .from('product-images')
                        .upload(fileName, file as File, { upsert: true });
                      if (!error) {
                        const { data } = supabase.storage
                          .from('product-images')
                          .getPublicUrl(fileName);
                        setLogoPreview(data.publicUrl);
                        setLogoFile(null);
                        toast.success('Logo enviada com sucesso!');
                      }
                    } catch (err) {
                      console.error('Logo upload failed (Smart):', err);
                      toast.error(
                        'Falha ao enviar logo. Preview mantido localmente.'
                      );
                    } finally {
                      setLogoUploading(false);
                    }
                  }}
                />
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
                  {/* Ordem */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => moveBanner(i, 'up')}
                      disabled={i === 0}
                      className="bg-white/90 dark:bg-slate-800/90 text-gray-700 dark:text-gray-300 p-1 rounded shadow-md hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={() => moveBanner(i, 'down')}
                      disabled={i === currentBanners.length - 1}
                      className="bg-white/90 dark:bg-slate-800/90 text-gray-700 dark:text-gray-300 p-1 rounded shadow-md hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                  {/* Remover */}
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
                    Lançamento
                  </div>
                  {/* Ordem */}
                  <div className="absolute bottom-2 left-2 flex gap-1">
                    <button
                      onClick={() => moveNewBanner(idx, 'up')}
                      disabled={idx === 0}
                      className="bg-white/90 dark:bg-slate-800/90 text-gray-700 dark:text-gray-300 p-1 rounded shadow-md hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={() => moveNewBanner(idx, 'down')}
                      disabled={idx === newBannerFiles.length - 1}
                      className="bg-white/90 dark:bg-slate-800/90 text-gray-700 dark:text-gray-300 p-1 rounded shadow-md hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                  {/* Remover */}
                  <button
                    onClick={() => removeNewBanner(idx)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-lg shadow-md hover:bg-red-600 transition-all"
                  >
                    <X size={14} />
                  </button>
                  {nb.tooSmall && (
                    <div className="absolute bottom-2 right-2 bg-yellow-50 dark:bg-yellow-900/80 text-yellow-800 dark:text-yellow-200 text-[10px] px-2 py-1 rounded shadow-sm">
                      ⚠️ Recomendado: {RECOMMENDED_BANNER.width}x
                      {RECOMMENDED_BANNER.height}px
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
                <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">
                  {RECOMMENDED_BANNER.width}x{RECOMMENDED_BANNER.height}px
                </span>
                <SmartImageUpload
                  multiple
                  onUploadReady={(file) =>
                    handleBannerFile(file as File, false)
                  }
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
                  {/* Ordem */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => moveBannerMobile(i, 'up')}
                      disabled={i === 0}
                      className="bg-white/90 dark:bg-slate-800/90 text-gray-700 dark:text-gray-300 p-1 rounded shadow-md hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={() => moveBannerMobile(i, 'down')}
                      disabled={i === currentBannersMobile.length - 1}
                      className="bg-white/90 dark:bg-slate-800/90 text-gray-700 dark:text-gray-300 p-1 rounded shadow-md hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                  {/* Remover */}
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
                    Mobile Lançamento
                  </div>
                  {/* Ordem */}
                  <div className="absolute bottom-2 left-2 flex gap-1">
                    <button
                      onClick={() => moveNewBannerMobile(idx, 'up')}
                      disabled={idx === 0}
                      className="bg-white/90 dark:bg-slate-800/90 text-gray-700 dark:text-gray-300 p-1 rounded shadow-md hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={() => moveNewBannerMobile(idx, 'down')}
                      disabled={idx === newBannerFilesMobile.length - 1}
                      className="bg-white/90 dark:bg-slate-800/90 text-gray-700 dark:text-gray-300 p-1 rounded shadow-md hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                  {/* Remover */}
                  <button
                    onClick={() => removeNewBannerMobile(idx)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-lg shadow-md hover:bg-red-600 transition-all"
                  >
                    <X size={14} />
                  </button>
                  {nb.tooSmall && (
                    <div className="absolute bottom-2 right-2 bg-yellow-50 dark:bg-yellow-900/80 text-yellow-800 dark:text-yellow-200 text-[10px] px-2 py-1 rounded shadow-sm">
                      ⚠️ Recomendado: {RECOMMENDED_BANNER_MOBILE.width}x
                      {RECOMMENDED_BANNER_MOBILE.height}px
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
                <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">
                  {RECOMMENDED_BANNER_MOBILE.width}x
                  {RECOMMENDED_BANNER_MOBILE.height}px
                </span>
                <SmartImageUpload
                  multiple
                  onUploadReady={(file) => handleBannerFile(file as File, true)}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'display' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
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

                    {/* Novos controles de imagem */}
                    {topBenefitImagePreview && (
                      <>
                        <div>
                          <label className="text-xs text-gray-500">
                            Ajuste da Imagem
                          </label>
                          <select
                            value={topBenefitImageFit}
                            onChange={(e) =>
                              setTopBenefitImageFit(
                                e.target.value as 'cover' | 'contain'
                              )
                            }
                            className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-slate-950 dark:border-slate-700 dark:text-white text-sm"
                          >
                            <option value="cover">Preencher (Cover)</option>
                            <option value="contain">Ajustar (Contain)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">
                            Escala ({topBenefitImageScale}%)
                          </label>
                          <input
                            type="range"
                            min={50}
                            max={200}
                            step={5}
                            value={topBenefitImageScale}
                            onChange={(e) =>
                              setTopBenefitImageScale(Number(e.target.value))
                            }
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">
                            Alinhamento da Imagem
                          </label>
                          <select
                            value={topBenefitImageAlign}
                            onChange={(e) =>
                              setTopBenefitImageAlign(
                                e.target.value as 'left' | 'center' | 'right'
                              )
                            }
                            className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-slate-950 dark:border-slate-700 dark:text-white text-sm"
                          >
                            <option value="left">Esquerda</option>
                            <option value="center">Centro</option>
                            <option value="right">Direita</option>
                          </select>
                        </div>
                      </>
                    )}

                    <div>
                      <label className="text-xs text-gray-500">
                        Alinhamento do Texto
                      </label>
                      <select
                        value={topBenefitTextAlign}
                        onChange={(e) =>
                          setTopBenefitTextAlign(
                            e.target.value as 'left' | 'center' | 'right'
                          )
                        }
                        className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-slate-950 dark:border-slate-700 dark:text-white text-sm"
                      >
                        <option value="left">Esquerda</option>
                        <option value="center">Centro</option>
                        <option value="right">Direita</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ToggleSetting>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm mb-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
              Preview: Barra de Benefícios
            </h4>
            <div className="mb-3">
              <div
                className="w-full flex items-center"
                style={{
                  backgroundColor: _validatedTopBg,
                  height: _validatedTopHeight,
                  color: _validatedTopTextColor,
                  fontSize: _validatedTopTextSize,
                  padding: '0 12px',
                  display: catalogSettings.show_top_benefit_bar
                    ? 'flex'
                    : 'none',
                  justifyContent:
                    topBenefitImageAlign === 'center'
                      ? 'center'
                      : topBenefitImageAlign === 'right'
                        ? 'flex-end'
                        : 'flex-start',
                  gap: '12px',
                }}
              >
                {topBenefitImagePreview ? (
                  catalogSettings.top_benefit_text ? (
                    <>
                      <div
                        className="flex-shrink-0 overflow-hidden rounded"
                        style={{
                          maxHeight: _validatedTopHeight,
                          width: 'auto',
                          height: `${topBenefitImageScale}%`,
                        }}
                      >
                        <img
                          src={topBenefitImagePreview}
                          alt="preview"
                          className="h-full w-auto"
                          style={{
                            objectFit: topBenefitImageFit,
                            maxHeight: '100%',
                          }}
                        />
                      </div>
                      <div
                        className="flex-1 px-3 py-2"
                        style={{
                          textAlign: topBenefitTextAlign,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent:
                            topBenefitTextAlign === 'center'
                              ? 'center'
                              : topBenefitTextAlign === 'right'
                                ? 'flex-end'
                                : 'flex-start',
                        }}
                      >
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
                      className="h-full w-auto"
                      style={{
                        objectFit: topBenefitImageFit,
                        maxHeight: `${topBenefitImageScale}%`,
                      }}
                    />
                  )
                ) : (
                  <div
                    className="flex items-center gap-2 w-full"
                    style={{
                      justifyContent:
                        topBenefitTextAlign === 'center'
                          ? 'center'
                          : topBenefitTextAlign === 'right'
                            ? 'flex-end'
                            : 'flex-start',
                    }}
                  >
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
            <div className="mt-4">
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preview Mobile
              </h5>
              <div className="w-[360px] rounded-lg overflow-hidden border border-gray-200 dark:border-slate-800">
                <div
                  style={{
                    backgroundColor: _validatedTopBg,
                    height: _validatedTopHeight,
                    color: _validatedTopTextColor,
                    fontSize: _validatedTopTextSize,
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

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <DollarSign size={20} className="text-[var(--primary)]" /> Tipo de
              Preço
            </h3>
            <div className="space-y-3">
              <ToggleSetting
                label="Modo Preço de Venda"
                name="show_sale_price"
                description="Usa o preço de venda ao invés do preço de custo."
                checked={catalogSettings.show_sale_price}
                onChange={() => handlePriceTypeChange('sale')}
                icon={DollarSign}
              />

              <ToggleSetting
                label="Mostrar Preço de Custo (Tabela)"
                name="show_cost_price"
                description="Exibe o preço de custo nos produtos."
                checked={catalogSettings.show_cost_price}
                onChange={() => handlePriceTypeChange('cost')}
                icon={Tag}
              />

              {catalogSettings.show_sale_price && (
                <div className="mt-3 space-y-3">
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
                </div>
              )}
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
              name="manage_stock"
              description="Habilita o controle de quantidades."
              checked={catalogSettings.manage_stock}
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
