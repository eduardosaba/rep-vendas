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
  CarouselBrands,
} from './store-layout';
import { StoreBanners, ProductGrid, CategoryBar } from './product-components';
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
      catalog_slug: (c['catalog_slug'] as string) || undefined,
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
      // Grid columns read from public_catalogs (mobile/default and desktop/md)
      grid_cols_default: (c['grid_cols_default'] as number) || undefined,
      grid_cols_md: (c['grid_cols_md'] as number) || undefined,
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

  // NOTE: Normalização de URLs (banners/logo) foi movida para o StoreProvider
  // para evitar double-encoding e centralizar a lógica de proxy (/api/storage-image).

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
    return `https://wa.me/${typeof digits === 'string' && digits.startsWith('55') ? digits : `55${digits}`}`;
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
        {/* Barra de contatos fixa (sempre visível se houver dados) */}
        {(store.email || store.phone) && (
          <div
            className="w-full"
            style={{ backgroundColor: store.secondary_color }}
          >
            <div className="max-w-[1920px] mx-auto px-4 lg:px-8 py-1 sm:py-2 flex justify-between items-center text-white/90 text-xs sm:text-sm border-b border-white/5">
              <span className="inline-flex items-center gap-2 min-w-0">
                {store.email ? (
                  <>
                    <svg
                      className="w-4 h-4 text-white flex-shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M3 8.5L12 13L21 8.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <a
                      href={`mailto:${store.email}`}
                      className="hover:underline font-medium truncate"
                    >
                      {store.email}
                    </a>
                  </>
                ) : null}
              </span>
              <span className="inline-flex items-center gap-2 min-w-0">
                {store.phone ? (
                  <>
                    <svg
                      className="w-4 h-4 text-white flex-shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M22 16.92V21a1 1 0 0 1-1.11 1A19 19 0 0 1 3 5.11 1 1 0 0 1 4 4h4.09a1 1 0 0 1 1 .75c.12.62.36 1.9-.35 3.43a1 1 0 0 1-.22.31l-1.2 1.2a15 15 0 0 0 6.36 6.36l1.2-1.2a1 1 0 0 1 .31-.22c1.53-.71 2.81-.47 3.43-.35a1 1 0 0 1 .75 1V21z"
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <a
                      href={formatWhatsappUrl(store.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline font-medium truncate"
                    >
                      {store.phone}
                    </a>
                  </>
                ) : null}
              </span>
            </div>
          </div>
        )}

        {/* 2. BARRA DE BENEFÍCIOS (configurada no painel) */}
        <StoreTopBar />

        {/* 3. HEADER PRINCIPAL (Logo e Busca) */}
        <StoreHeader />
        <CarouselBrands />
        <CategoryBar />
        <StoreBanners />

        {/* Grid Principal com Sidebar de Filtros */}
        <main className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12 flex flex-col md:flex-row gap-8 flex-1 relative">
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
