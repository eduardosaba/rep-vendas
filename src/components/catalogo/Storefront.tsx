'use client';

import React from 'react';
import { StoreProvider } from './store-context';
import {
  StoreTopBar,
  StoreHeader,
  StoreSidebar,
  StoreMobileActionBar,
} from './store-layout';
import { StoreBanners, ProductGrid } from './product-components';
import { StoreModals } from './store-modals-container';
import { InstallPrompt } from './InstallPrompt';
import { FloatingCart } from './FloatingCart';

import type {
  Product as LibProduct,
  Settings as LibSettings,
  PublicCatalog,
} from '@/lib/types';

export type Product = LibProduct;
export type StoreSettings = LibSettings;

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
  // Mapear catalog (público) para store
  const store: StoreSettings = {
    user_id: catalog.user_id,
    name: catalog.store_name,
    logo_url: catalog.logo_url,
    primary_color: catalog.primary_color,
    secondary_color: catalog.secondary_color,
    show_cost_price: (catalog as any).show_cost_price,
    show_sale_price: (catalog as any).show_sale_price,
    price_password_hash: (catalog as any).price_password_hash,
    footer_message: catalog.footer_message,
    enable_stock_management: (catalog as any).enable_stock_management,
    show_installments: (catalog as any).show_installments,
    max_installments: (catalog as any).max_installments,
    show_cash_discount: (catalog as any).show_cash_discount,
    cash_price_discount_percent: (catalog as any).cash_price_discount_percent,

    // NOVO: Passando o Hash da senha para o contexto
    // Usamos 'as any' caso o tipo StoreSettings ainda não tenha esse campo definido
    price_password_hash: (catalog as any).price_password_hash,
  } as StoreSettings;

  // ... (Resto do código de cores e estilos mantido igual) ...
  // Diagnóstico rápido
  if (typeof window !== 'undefined') {
    // console.log para debug se necessário
  }

  const primaryColor = store.primary_color || '#4f46e5';
  const secondaryColor = store.secondary_color || '#64748b';
  const headerBg =
    (catalog as any).header_background_color ||
    store.header_background_color ||
    '#ffffff';

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

  const cssVars = {
    ['--primary']: primaryColor,
    ['--primary-hover']: shadeColor(primaryColor, -18),
    ['--secondary']: secondaryColor,
    ['--header-bg']: headerBg,
  } as React.CSSProperties;

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
        {/* Barra Superior */}
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

        {store.show_top_benefit_bar !== false && <StoreTopBar />}
        <StoreHeader />
        <StoreBanners />

        <main className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8 flex flex-col md:flex-row gap-8 items-start flex-1 relative">
          <StoreSidebar />
          <div className="flex-1 w-full min-w-0">
            <ProductGrid />
          </div>
        </main>

        <StoreMobileActionBar />
        <div className="hidden md:block">
          <FloatingCart />
        </div>
        <StoreModals />
        <InstallPrompt />
      </div>
    </StoreProvider>
  );
}
