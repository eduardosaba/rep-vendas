'use client';

import React, { useMemo, useEffect } from 'react';
import { Phone } from 'lucide-react';
import { StoreProvider } from './store-context';
import {
  StoreTopBar,
  StoreHeader,
  StoreSidebar,
  StoreMobileActionBar,
  StoreFooter,
} from './store-layout';
import { StoreBanners, ProductGrid } from './product-components';
import { StoreModals } from './store-modals-container';
import { InstallPrompt } from './InstallPrompt';
import { FloatingCart } from './FloatingCart';
import { hexToRgb } from '@/lib/colors'; // Importando nossa função utilitária
import { SYSTEM_FONTS } from '@/lib/fonts';

import type {
  Product,
  Settings as StoreSettings,
  PublicCatalog,
} from '@/lib/types';

interface StorefrontProps {
  catalog: PublicCatalog;
  initialProducts: Product[];
  startProductId?: string;
}

export function Storefront({
  catalog,
  initialProducts,
  startProductId,
}: StorefrontProps) {
  const c = catalog as unknown as Record<string, unknown>;
  /**
   * 1. MAPEAMENTO DE DADOS (Multi-tenant)
   * Transformamos o registro público do catálogo na interface de Settings usada pelo sistema.
   */
  const store: StoreSettings = useMemo(
    () => ({
      user_id: (c['user_id'] as string) || '',
      name: (c['store_name'] as string) || '',
      logo_url: (c['logo_url'] as string) || null,
      // catalog slug from public_catalogs (used to build home links)
      catalog_slug: (c['slug'] as string) || undefined,
      primary_color: (c['primary_color'] as string) || '#b9722e',
      secondary_color: (c['secondary_color'] as string) || '#0d1b2c',
      phone: (c['phone'] as string) || undefined,
      email: (c['email'] as string) || undefined,
      footer_message: (c['footer_message'] as string) || undefined,

      // Configurações de exibição vindas da tabela public_catalogs
      show_cost_price: catalog.show_cost_price,
      show_sale_price: catalog.show_sale_price,
      show_installments: catalog.show_installments,
      max_installments: catalog.max_installments,
      show_cash_discount: catalog.show_cash_discount,
      cash_price_discount_percent: catalog.cash_price_discount_percent,
      enable_stock_management: catalog.enable_stock_management,
      price_password_hash: catalog.price_password_hash,
      // Top benefit / banner
      top_benefit_image_url:
        (c['top_benefit_image_url'] as string) || undefined,
      top_benefit_image_fit:
        (c['top_benefit_image_fit'] as string) || undefined,
      top_benefit_image_scale:
        (c['top_benefit_image_scale'] as number) || undefined,
      top_benefit_height: (c['top_benefit_height'] as number) || undefined,
      top_benefit_text_size:
        (c['top_benefit_text_size'] as number) || undefined,
      top_benefit_bg_color: (c['top_benefit_bg_color'] as string) || undefined,
      top_benefit_text_color:
        (c['top_benefit_text_color'] as string) || undefined,
      top_benefit_text: (c['top_benefit_text'] as string) || undefined,
      show_top_benefit_bar: (c['show_top_benefit_bar'] as boolean) || false,
      show_top_info_bar: (c['show_top_info_bar'] as boolean) || false,
      // Banners
      banners: (c['banners'] as string[]) || null,
      banners_mobile: (c['banners_mobile'] as string[]) || null,
    }),
    [catalog, c]
  );

  // share_banner_url may exist on the public_catalogs row (not part of Settings type)
  const shareBanner = (c['share_banner_url'] as string) || undefined;

  // Normalize image URLs to absolute when they are relative paths
  const PUBLIC_BASE =
    typeof window !== 'undefined'
      ? process.env.NEXT_PUBLIC_APP_URL || ''
      : process.env.NEXT_PUBLIC_APP_URL || '';
  const resolveUrl = (u?: string | null) => {
    if (!u) return u ?? null;

    // Se é URL do Supabase Storage, roteia pelo proxy
    if (u.includes('supabase.co/storage') || u.includes('/storage/v1/object')) {
      // Extrai o path após '/storage/v1/object/public/'
      const match = u.match(/\/storage\/v1\/object\/public\/(.+)$/);
      if (match && match[1]) {
        return `/api/storage-image?path=${encodeURIComponent(match[1])}`;
      }
      // Fallback: passa URL completa pro proxy
      return `/api/storage-image?path=${encodeURIComponent(u)}`;
    }

    // URLs externas (HTTP/HTTPS não-storage)
    if (u.startsWith('http') || u.startsWith('//')) return u;

    // Paths relativos
    if (u.startsWith('/')) return `${PUBLIC_BASE}${u}`;

    return u;
  };

  // If a single share banner exists but banners is empty, prefer showing it
  if (!store.banners || store.banners.length === 0) {
    if (shareBanner) {
      (store.banners as any) = [resolveUrl(shareBanner) as any];
    }
  } else {
    (store.banners as any) = (store.banners || []).map((s: any) =>
      resolveUrl(s as string)
    );
  }

  if (store.banners_mobile && store.banners_mobile.length > 0) {
    (store.banners_mobile as any) = store.banners_mobile.map((s: any) =>
      resolveUrl(s as string)
    );
  }

  if (store.logo_url)
    (store.logo_url as any) = resolveUrl(store.logo_url) as any;
  if (store.top_benefit_image_url)
    (store.top_benefit_image_url as any) = resolveUrl(
      store.top_benefit_image_url
    ) as any;

  /**
   * 2. GESTÃO DE CORES DINÂMICAS
   * Injetamos as variáveis CSS no topo do DOM do catálogo para evitar FOUC (Flash of Unstyled Content).
   */
  const cssVars = useMemo(() => {
    const primary = store.primary_color || '#b9722e';
    const secondary = store.secondary_color || '#0d1b2c';

    return {
      '--primary': primary,
      '--primary-rgb': hexToRgb(primary), // Habilita opacidades dinâmicas
      '--secondary': secondary,
      '--secondary-rgb': hexToRgb(secondary),
      '--header-bg': (c['header_background_color'] as string) || '#ffffff',
      '--footer-bg': (c['footer_background_color'] as string) || secondary,
    } as React.CSSProperties;
  }, [store, c]);

  // Helpers de Formatação (Poderiam ser movidos para @/lib/utils no futuro)
  const formatWhatsappUrl = (phone?: string) => {
    if (!phone) return '#';
    const digits = phone.replace(/\D/g, '');
    return `https://wa.me/${digits.startsWith('55') ? digits : `55${digits}`}`;
  };

  // FONT OPTIONS centralizadas via src/lib/fonts

  const [globalFont, setGlobalFont] = React.useState<string | null>(null);
  const [allowCustomFonts, setAllowCustomFonts] = React.useState(true);

  const selectedFontName = (c['font_family'] as string) || null;

  // Fetch global config to support cascade: store.font_family -> global.font_family -> Inter
  useEffect(() => {
    let mounted = true;
    fetch('/api/global_config')
      .then((r) => r.json())
      .then((j) => {
        if (!mounted) return;
        setGlobalFont(j?.font_family ?? null);
        setAllowCustomFonts(
          typeof j?.allow_custom_fonts === 'boolean'
            ? j.allow_custom_fonts
            : true
        );
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Se o admin global desabilitou fontes customizadas, respeitamos essa escolha
  const finalSelectedName =
    allowCustomFonts === false
      ? globalFont || 'Inter'
      : selectedFontName || globalFont || 'Inter';
  const finalSelected = SYSTEM_FONTS.find((f) => f.name === finalSelectedName);
  const finalFamily = finalSelected ? finalSelected.family : finalSelectedName;

  // If the catalog provides a direct font URL (uploaded by user or admin), inject @font-face
  const catalogFontUrl = (c['font_url'] as string) || null;
  const globalFontUrlFromApi = React.useRef<string | null>(null);

  // fetch global_config.font_url if needed
  useEffect(() => {
    let mounted = true;
    fetch('/api/global_config')
      .then((r) => r.json())
      .then((j) => {
        if (!mounted) return;
        globalFontUrlFromApi.current = j?.font_url ?? null;
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const fontUrl = catalogFontUrl || globalFontUrlFromApi.current;
    if (fontUrl) {
      const familyName = finalSelectedName || 'CustomFont';
      const id = `rv-font-face-${familyName.replace(/\s+/g, '-')}`;
      if (document.getElementById(id)) return;
      const style = document.createElement('style');
      style.id = id;
      style.innerHTML = `@font-face{font-family:'${familyName}';src: url('${fontUrl}') format('woff2');font-weight:400;font-style:normal;font-display:swap;}`;
      document.head.appendChild(style);
    } else if (finalSelected && finalSelected.import) {
      if (
        !document.querySelector(`link[data-rv-font="${finalSelected.name}"]`)
      ) {
        const l = document.createElement('link');
        l.setAttribute('rel', 'stylesheet');
        l.setAttribute('href', finalSelected.import as string);
        l.setAttribute('data-rv-font', finalSelected.name);
        document.head.appendChild(l);
      }
    }
  }, [catalogFontUrl, finalSelected, finalSelectedName]);

  return (
    <StoreProvider
      store={store}
      initialProducts={initialProducts}
      startProductId={startProductId}
    >
      <div
        style={{ ...cssVars, fontFamily: finalFamily }}
        className="min-h-screen bg-gray-50 flex flex-col selection:bg-primary/20 selection:text-primary"
      >
        {/* Barra de Informações do Topo */}
        {(store.name || store.phone) && (
          <div className="w-full bg-secondary border-b border-white/10">
            <div className="max-w-[1920px] mx-auto px-4 lg:px-8 py-2 text-[11px] sm:text-xs flex items-center justify-between gap-4 text-white/80">
              <div className="flex items-center gap-4">
                <span className="font-bold uppercase tracking-wider hidden sm:inline">
                  {store.name}
                </span>
                {store.email && (
                  <a
                    href={`mailto:${store.email}`}
                    className="hover:text-white transition-colors"
                  >
                    {store.email}
                  </a>
                )}
              </div>

              <div className="flex items-center gap-4 ml-auto">
                {store.phone && (
                  <a
                    href={formatWhatsappUrl(store.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-white transition-all font-bold"
                  >
                    <Phone size={12} className="text-primary" />
                    <span>WhatsApp Suporte</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Componentes de Layout do Catálogo */}
        <StoreTopBar />
        <StoreHeader />
        <StoreBanners />

        {/* Grid Principal com Sidebar de Filtros */}
        <main className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12 flex flex-col md:flex-row gap-8 flex-1 relative">
          <StoreSidebar />
          <div className="flex-1 w-full min-w-0">
            <ProductGrid />
          </div>
        </main>

        {/* Camadas de Interação e Modais */}
        <StoreMobileActionBar />
        <div className="hidden md:block">
          <FloatingCart />
        </div>
        <StoreModals />
        <StoreFooter />
        <InstallPrompt />
      </div>
    </StoreProvider>
  );
}
