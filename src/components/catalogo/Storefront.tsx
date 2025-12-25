'use client';

import React, { useMemo } from 'react';
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
  /**
   * 1. MAPEAMENTO DE DADOS (Multi-tenant)
   * Transformamos o registro público do catálogo na interface de Settings usada pelo sistema.
   */
  const store: StoreSettings = useMemo(
    () => ({
      user_id: catalog.user_id,
      name: catalog.store_name,
      logo_url: catalog.logo_url,
      primary_color: catalog.primary_color || '#b9722e',
      secondary_color: catalog.secondary_color || '#0d1b2c',
      phone: catalog.phone,
      email: catalog.email,
      footer_message: catalog.footer_message,

      // Configurações de exibição vindas da tabela public_catalogs
      show_cost_price: catalog.show_cost_price,
      show_sale_price: catalog.show_sale_price,
      show_installments: catalog.show_installments,
      max_installments: catalog.max_installments,
      show_cash_discount: catalog.show_cash_discount,
      cash_price_discount_percent: catalog.cash_price_discount_percent,
      enable_stock_management: catalog.enable_stock_management,
      price_password_hash: catalog.price_password_hash,
    }),
    [catalog]
  );

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
      '--header-bg': catalog.header_background_color || '#ffffff',
      '--footer-bg': catalog.footer_background_color || secondary,
    } as React.CSSProperties;
  }, [store, catalog]);

  // Helpers de Formatação (Poderiam ser movidos para @/lib/utils no futuro)
  const formatWhatsappUrl = (phone?: string) => {
    if (!phone) return '#';
    const digits = phone.replace(/\D/g, '');
    return `https://wa.me/${digits.startsWith('55') ? digits : `55${digits}`}`;
  };

  if (!catalog) return null; // Proteção contra slug não encontrado

  return (
    <StoreProvider
      store={store}
      initialProducts={initialProducts}
      startProductId={startProductId}
    >
      <div
        style={cssVars}
        className="min-h-screen bg-gray-50 font-sans flex flex-col selection:bg-primary/20 selection:text-primary"
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
