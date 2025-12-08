'use client';

import React from 'react';
import { StoreProvider } from './store-context';
import {
  StoreTopBar,
  StoreHeader,
  StoreSidebar,
  StoreFooter,
} from './store-layout';
import { StoreBanners, ProductGrid } from './product-components';
import { StoreModals } from './store-modals-container';
import { InstallPrompt } from './InstallPrompt';

// --- Tipos (Reutilizados para a prop inicial) ---
export interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  reference_code: string;
  brand: string | null;
  category: string | null;
  description?: string | null;
  technical_specs?: string | null;
  images?: string[];
  is_launch?: boolean;
  is_best_seller?: boolean;
  discount_percent?: number | null;
}

export interface StoreSettings {
  user_id: string;
  name: string;
  primary_color: string;
  secondary_color?: string;
  header_background_color?: string;
  logo_url: string | null;
  phone: string;
  email?: string;
  price_password?: string;
  footer_message?: string;
  banners?: string[];
  // Configs de Exibição
  show_top_benefit_bar?: boolean;
  top_benefit_text?: string;
  show_installments?: boolean;
  max_installments?: number;
  show_discount_tag?: boolean;
  cash_price_discount_percent?: number;
  // Estoque
  enable_stock_management?: boolean;
  global_allow_backorder?: boolean;
}

interface StorefrontProps {
  store: StoreSettings;
  initialProducts: Product[];
  startProductId?: string; // NOVO PROP: ID do produto para abrir modal direto
}

export function Storefront({
  store,
  initialProducts,
  startProductId,
}: StorefrontProps) {
  // Gerar cores dinâmicas baseado na configuração da loja
  const primaryColor = store.primary_color || '#0033C6';
  const secondaryColor = store.secondary_color || '#b9722e';
  const headerBg = store.header_background_color || '#ffffff';

  // Função auxiliar para gerar variantes da cor (hover, etc)
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

  // Escolhe cor de texto (preto/branco) com base no contraste da cor de fundo
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
    // luminance
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return L > 0.6 ? '#000000' : '#FFFFFF';
  };

  const topBarBg = store.secondary_color || secondaryColor;
  const topBarText = getContrastColor(topBarBg);

  const formatWhatsappUrl = (phone?: string) => {
    if (!phone) return '#';
    const digits = phone.replace(/\D/g, '');
    // If no country code, assume Brazil (55) for convenience when phone length <= 11
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
        {/* Barra do Representante (nome / email / telefone) */}
        {(store.name || store.email || store.phone) && (
          <div
            className="w-full border-b"
            style={{ backgroundColor: topBarBg }}
          >
            <div
              className="max-w-7xl mx-auto px-4 py-2 text-sm flex items-center justify-between gap-4"
              style={{ color: topBarText }}
            >
              <div className="flex items-center gap-3">
                {store.name && (
                  <span className="font-medium">{store.name}</span>
                )}
                {store.email && (
                  <a
                    href={`mailto:${store.email}`}
                    className="hover:underline"
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
                    className="hover:underline"
                    style={{ color: topBarText }}
                  >
                    {store.phone}
                  </a>
                )}
              </div>
              <div className="text-xs" style={{ color: topBarText }}>
                {store.footer_message || ''}
              </div>
            </div>
          </div>
        )}

        {/* Barras Superiores e Navegação */}
        {store.show_top_benefit_bar !== false && <StoreTopBar />}
        <StoreHeader />

        {/* Banners e Destaques Visuais */}
        <StoreBanners />

        {/* Conteúdo Principal (Grid de Produtos + Sidebar de Filtros) */}
        <main className="max-w-7xl mx-auto px-4 py-8 flex gap-8 items-start flex-1 relative">
          <StoreSidebar />
          <ProductGrid />
        </main>

        {/* Rodapé */}
        <StoreFooter />

        {/* Container de Modais (Carrinho, Zoom, Checkout, Detalhes, etc.) */}
        {/* Este componente carrega toda a lógica pesada de interatividade */}
        <StoreModals />

        {/* Prompt de Instalação (PWA) */}
        <InstallPrompt />
      </div>
    </StoreProvider>
  );
}
