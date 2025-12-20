'use client';

import React from 'react';
// FIX: Importando do arquivo local na mesma pasta (catalogo)
import { StoreProvider } from './store-context';
import {
  StoreTopBar,
  StoreHeader,
  StoreSidebar,
  StoreMobileActionBar,
} from './store-layout';
import { StoreBanners, ProductGrid } from './product-components';
import { StoreModals } from './store-modals-container';
import { InstallPrompt } from './InstallPrompt'; // Certifique-se que este arquivo existe nesta pasta ou remova
import { FloatingCart } from './FloatingCart';

import type {
  Product as LibProduct,
  Settings as LibSettings,
} from '@/lib/types';

export type Product = LibProduct;
export type StoreSettings = LibSettings;

interface StorefrontProps {
  store: StoreSettings;
  initialProducts: Product[];
  startProductId?: string;
}

export function Storefront({
  store,
  initialProducts,
  startProductId,
}: StorefrontProps) {
  // Diagnóstico rápido: verificar se alguma dependência de componente é undefined
  if (typeof window !== 'undefined') {
    // apenas em cliente

    console.log('Storefront components:', {
      StoreTopBar: typeof StoreTopBar,
      StoreHeader: typeof StoreHeader,
      StoreSidebar: typeof StoreSidebar,
      StoreBanners: typeof StoreBanners,
      ProductGrid: typeof ProductGrid,
      StoreModals: typeof StoreModals,
      InstallPrompt: typeof InstallPrompt,
      FloatingCart: typeof FloatingCart,
    });
  }
  // Configuração de Cores (com fallbacks padrão)
  const primaryColor = store.primary_color || '#4f46e5'; // Fallback: Indigo-600
  const secondaryColor = store.secondary_color || '#64748b'; // Fallback: Slate-500
  const headerBg = store.header_background_color || '#ffffff';

  // Função auxiliar para gerar cores hover (darken/lighten)
  const shadeColor = (hex: string, percent: number) => {
    let c = hex.replace('#', '');
    if (c.length === 3)
      c = c
        .split('')
        .map((ch) => ch + ch)
        .join('');
    const num = parseInt(c, 16);
    const r = (num >> 16) + percent;
    const g = ((num >> 8) & 0x00ff) + percent;
    const b = (num & 0x0000ff) + percent;
    return (
      '#' +
      (
        (Math.max(0, Math.min(255, r)) << 16) |
        (Math.max(0, Math.min(255, g)) << 8) |
        Math.max(0, Math.min(255, b))
      )
        .toString(16)
        .padStart(6, '0')
    );
  };

  // Variáveis CSS Dinâmicas para o Tema da Loja
  const cssVars = {
    ['--primary']: primaryColor,
    ['--primary-hover']: shadeColor(primaryColor, -18),
    ['--secondary']: secondaryColor,
    ['--header-bg']: headerBg,
  } as React.CSSProperties;

  // Lógica de contraste para a barra superior
  const getContrastColor = (hex?: string) => {
    if (!hex) return '#000000';
    let c = hex.replace('#', '');
    if (c.length === 3)
      c = c
        .split('')
        .map((ch) => ch + ch)
        .join('');
    const r = parseInt(c.substring(0, 2), 16) / 255;
    const g = parseInt(c.substring(2, 4), 16) / 255;
    const b = parseInt(c.substring(4, 6), 16) / 255;
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return L > 0.6 ? '#000000' : '#FFFFFF';
  };

  const topBarBg = store.secondary_color || secondaryColor;
  const topBarText = getContrastColor(topBarBg);

  const formatWhatsappUrl = (phone?: string) => {
    if (!phone) return '#';
    const digits = phone.replace(/\D/g, '');
    let num = digits;
    if (!digits.startsWith('55')) {
      if (digits.length <= 11) num = `55${digits}`;
    }
    return `https://wa.me/${num}`;
  };

  return (
    <StoreProvider
      store={store}
      initialProducts={initialProducts}
      startProductId={startProductId}
    >
      <div
        style={cssVars}
        className="min-h-screen bg-[#F4F4F5] font-sans flex flex-col"
      >
        {/* Barra Superior de Contato */}
        {(store.name || store.email || store.phone) && (
          <div
            className="w-full border-b"
            style={{ backgroundColor: topBarBg }}
          >
            <div
              className="max-w-[1920px] mx-auto px-4 lg:px-8 py-2 text-sm flex items-center justify-between gap-4"
              style={{ color: topBarText }}
            >
              <div className="flex items-center gap-4">
                {store.name && (
                  <span className="font-medium hidden sm:inline">
                    {store.name}
                  </span>
                )}
                <div className="flex gap-3 text-xs sm:text-sm">
                  {store.email && (
                    <a
                      href={`mailto:${store.email}`}
                      className="hover:underline opacity-90 hover:opacity-100"
                      style={{ color: topBarText }}
                    >
                      {store.email}
                    </a>
                  )}
                  {store.phone && (
                    <a
                      href={formatWhatsappUrl(store.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline opacity-90 hover:opacity-100"
                      style={{ color: topBarText }}
                    >
                      {store.phone}
                    </a>
                  )}
                </div>
              </div>
              <div className="text-xs opacity-80 hidden md:block">
                {store.footer_message || ''}
              </div>
            </div>
          </div>
        )}

        {/* Top Bar Promocional (Frete Grátis, etc) */}
        {store.show_top_benefit_bar !== false && <StoreTopBar />}

        {/* Header Principal (Logo e Busca) */}
        <StoreHeader />

        {/* Banners Rotativos */}
        <StoreBanners />

        {/* LAYOUT PRINCIPAL: 
            Usa max-w-[1920px] para telas grandes e flex-row para Sidebar + Grid 
        */}
        <main className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8 flex flex-col md:flex-row gap-8 items-start flex-1 relative">
          {/* Sidebar de Filtros (Fixo) */}
          <StoreSidebar />

          {/* Grid de Produtos (Expansível) */}
          <div className="flex-1 w-full min-w-0">
            <ProductGrid />
          </div>
        </main>

        {/* Barra de A\u00e7\u00f5es Mobile (Ver Pre\u00e7os, Pedidos, Favoritos, Carrinho) */}
        <StoreMobileActionBar />

        {/* FloatingCart apenas no Desktop (md+) */}
        <div className="hidden md:block">
          <FloatingCart />
        </div>

        <StoreModals />

        <InstallPrompt />
      </div>
    </StoreProvider>
  );
}
