'use client';

import { useStore } from '@/components/catalogo/store-context';
import {
  Phone,
  Mail,
  Menu,
  ShoppingCart,
  Search,
  Lock,
  Unlock,
  Download,
  ShieldCheck,
  Truck,
  X,
  Zap,
  Star,
  Heart,
  Check,
  Home,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SmartImage } from './SmartImage';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { create } from 'zustand';

// --- Small layout store (used by other components) ---
export const useLayoutStore = create((set: any) => ({
  isSidebarOpen: false,
  toggleSidebar: () => set((s: any) => ({ isSidebarOpen: !s.isSidebarOpen })),
  setIsFilterOpen: (isOpen: boolean) => set({ isSidebarOpen: isOpen }),
  closeSidebar: () => set({ isSidebarOpen: false }),
}));

// --- HELPERS (phone formatting) ---
function normalizePhoneDigits(phone?: string | null) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (!digits.startsWith('55')) digits = `55${digits}`;
  return digits;
}

function whatsappHref(phone?: string | null) {
  const digits = normalizePhoneDigits(phone);
  if (!digits) return '#';
  return `https://wa.me/${digits}`;
}

function formatPhoneDisplay(phone?: string | null) {
  const digits = normalizePhoneDigits(phone);
  if (!digits) return phone || '';
  const local = digits.slice(2);
  if (local.length === 11) {
    return `+${digits.slice(0, 2)} (${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  if (local.length === 10) {
    return `+${digits.slice(0, 2)} (${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }
  return `+${digits}`;
}

// --- Helper: contraste de texto para uma cor de fundo ---
function getContrastColor(hexColor?: string): string {
  if (!hexColor) return '#ffffff';
  try {
    if (typeof hexColor === 'string' && hexColor.startsWith('var(')) return '#ffffff';
    const hex = hexColor.replace('#', '');
    const fullHex =
      hex.length === 3
        ? hex
            .split('')
            .map((c) => c + c)
            .join('')
        : hex;
    const r = parseInt(fullHex.substring(0, 2), 16);
    const g = parseInt(fullHex.substring(2, 4), 16);
    const b = parseInt(fullHex.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#0f172a' : '#ffffff';
  } catch (e) {
    return '#ffffff';
  }
}

// Logo helper with fallback — defined early to avoid HMR reference issues
function LogoImage({ src, alt }: { src: string; alt?: string }) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    const initials = String(alt || '')
      .trim()
      .split(' ')
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();

    return (
      <div className="h-10 w-36 flex items-center justify-center rounded bg-white/20 text-white font-bold text-lg">
        {initials || 'LOJA'}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt || 'Logo'}
      className="h-10 w-auto max-w-[150px] object-contain"
      onError={() => setErrored(true)}
    />
  );
}

// --- Top bar (minimal) ---
export function StoreTopBar() {
  const { store } = useStore();
  if (!store) return null as any;

  // 1) Barra de benefícios configurável pelo admin
  if (store.show_top_benefit_bar) {
    const bg = store.top_benefit_bg_color || 'var(--primary)';
    const textColor =
      store.top_benefit_text_color || getContrastColor(String(bg));
    const height = store.top_benefit_height || 36;
    const [benefitImageErrored, setBenefitImageErrored] = React.useState(false);

    React.useEffect(() => {
      // reset errored state when URL changes
      setBenefitImageErrored(false);
    }, [store.top_benefit_image_url]);

    // Only render the <img> when we have a non-empty URL and it successfully loads.
    const hasImageUrl = Boolean(
      store.top_benefit_image_url && String(store.top_benefit_image_url).trim()
    );

    return (
      <div className="w-full" style={{ backgroundColor: bg, color: textColor }}>
        <div
          className="max-w-[1920px] mx-auto px-4 lg:px-8 flex items-center gap-4"
          style={{ height }}
        >
          {hasImageUrl && !benefitImageErrored ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={store.top_benefit_image_url ?? undefined}
              alt={store.top_benefit_text ?? undefined}
              className="h-full mr-3 object-contain"
              style={{ maxHeight: height }}
              onError={() => setBenefitImageErrored(true)}
              onLoad={() => setBenefitImageErrored(false)}
            />
          ) : null}

          <div
            className="flex-1 text-sm font-bold overflow-hidden"
            style={{
              fontSize: store.top_benefit_text_size
                ? `${store.top_benefit_text_size}px`
                : undefined,
            }}
          >
            {store.top_benefit_text || ''}
          </div>
        </div>
      </div>
    );
  }

  // Apenas renderiza a faixa de benefícios aqui — a barra de contatos é fixa e
  // renderizada pelo `Storefront` para permanecer visível mesmo quando a
  // faixa promocional estiver ativa.
  if (!store.show_top_benefit_bar) return null as any;

  return null as any;
}

// --- Header (simplified, uses existing CarouselBrands component) ---
export function StoreHeader() {
  const {
    store,
    searchTerm,
    setSearchTerm,
    selectedBrand,
    setSelectedBrand,
    setSelectedCategory,
    isPricesVisible,
    setIsPricesVisible,
    cart,
    favorites,
    showFavorites,
    setShowFavorites,
    brandsWithLogos,
    selectedCategory,
    setModal,
  } = useStore();

  const { toggleSidebar } = useLayoutStore();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleSearchInputChange = (v: string) => setSearchTerm(v);

  const getCartCount = (c: any) => {
    if (!c) return 0;
    if (Array.isArray(c))
      return c.reduce((acc, item) => acc + (item?.quantity || 0), 0);
    if (typeof c === 'object')
      return Object.values(c).reduce(
        (acc: number, v: any) => acc + (v?.quantity || 0),
        0
      );
    return 0;
  };
  const cartCount = getCartCount(cart);

  // Determine header text color based on configured header background to avoid
  // invisible white-on-white icons when header has no dark background.
  const headerBg = (store as any)?.header_background_color || null;
  const computedTextColor = getContrastColor(headerBg);
  const isHeaderWhite = computedTextColor === '#0f172a';
  const hoverClass = 'hover:text-[var(--primary)]';

  // Branding: expose primary/secondary as CSS variables for Tailwind usage
  const primaryColor = (store as any)?.primary_color || '#2563eb';
  const secondaryColor = (store as any)?.secondary_color || '#06b6d4';
  const cssVars = {
    ['--primary' as any]: primaryColor,
    ['--secondary' as any]: secondaryColor,
  } as React.CSSProperties;

  return (
    <header style={cssVars}>
      <div className="max-w-[1920px] mx-auto px-4 lg:px-8 py-3 flex items-center gap-4">
        <div className="flex items-center gap-4">
          {store.logo_url ? (
            <a
              href={
                store.catalog_slug
                  ? `/catalogo/${store.catalog_slug}`
                  : `/catalogo/${store.user_id}`
              }
              className="relative h-10 w-auto flex items-center"
            >
              <LogoImage src={store.logo_url} alt={store.name} />
            </a>
          ) : (
            <div
              className={`h-14 px-4 rounded flex items-center justify-center font-bold text-xl ${isHeaderWhite ? 'bg-gray-100 text-gray-900' : 'bg-white/20 text-white'}`}
            >
              {store.name?.substring(0, 10) || 'Loja'}
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar produtos... (ex: filtrar por marca + referência)"
              value={searchTerm || ''}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              className="w-full h-10 lg:h-12 pl-4 pr-12 rounded-lg border-0 shadow-sm outline-none focus:ring-2 focus:ring-[var(--primary)] text-gray-900 transition-all"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => inputRef.current?.focus()}
              className="absolute right-1 top-1/2 -translate-y-1/2 !h-8 !w-10 !p-0 rounded-md"
            >
              <Search size={18} />
            </Button>
          </div>
        </div>

        <div
          className={`hidden md:flex items-center gap-6 text-[10px] font-bold uppercase tracking-wider text-[var(--primary)] ${hoverClass}`}
        >
          {/* Favoritos */}
          <button
            onClick={() => setShowFavorites(!showFavorites)}
            className={`flex flex-col items-center gap-1.5 transition-all hover:scale-110 ${showFavorites ? 'text-red-500' : ''}`}
            aria-label="Favoritos"
          >
            <div className="relative">
              <Heart
                size={22}
                className={showFavorites ? 'fill-current' : ''}
              />
              {Array.isArray(favorites) && favorites.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] h-4 w-4 flex items-center justify-center rounded-full border-2 border-white">
                  {favorites.length}
                </span>
              )}
            </div>
            <span>Favoritos</span>
          </button>

          {/* Ver preços (condicional) */}
          {store.show_cost_price === true && store.show_sale_price !== true && (
            <button
              onClick={() =>
                isPricesVisible
                  ? setIsPricesVisible(false)
                  : setModal('password', true)
              }
              className="flex flex-col items-center gap-1.5 transition-all hover:scale-110"
              aria-label="Ver preços"
            >
              {isPricesVisible ? (
                <Unlock size={22} className="text-green-500" />
              ) : (
                <Lock size={22} />
              )}
              <span>{isPricesVisible ? 'Preços ON' : 'Ver Preços'}</span>
            </button>
          )}

          {/* Pedidos */}
          <button
            onClick={() => setModal('load', true)}
            className="flex flex-col items-center gap-1.5 transition-all hover:scale-110"
            aria-label="Pedidos"
          >
            <Download size={22} />
            <span>Pedidos</span>
          </button>

          {/* Carrinho */}
          <button
            onClick={() => setModal('cart', true)}
            className="flex flex-col items-center gap-1.5 transition-all hover:scale-110"
            aria-label="Carrinho"
          >
            <div className="relative">
              <ShoppingCart size={22} />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[var(--primary)] text-white text-[9px] h-4 w-4 flex items-center justify-center rounded-full border-2 border-white">
                  {cartCount}
                </span>
              )}
            </div>
            <span>Carrinho</span>
          </button>
        </div>
      </div>

      {/* Marcas moved to storefront to preserve visual hierarchy */}
    </header>
  );
}

// --- SIDEBAR ---
export function StoreSidebar() {
  const {
    brands,
    categories,
    genders,
    selectedBrand,
    setSelectedBrand,
    selectedCategory,
    setSelectedCategory,
    selectedGender,
    setSelectedGender,
    favorites,
    showFavorites,
    setShowFavorites,
    showOnlyNew,
    setShowOnlyNew,
    showOnlyBestsellers,
    setShowOnlyBestsellers,
  } = useStore();
  const { isSidebarOpen, toggleSidebar } = useLayoutStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleBrand = (brand: string) => {
    if (brand === 'all') {
      setSelectedBrand('all');
      return;
    }
    const normalized = (s: unknown) =>
      String(s || '')
        .trim()
        .toLowerCase();
    let currentSelection: string[] = Array.isArray(selectedBrand)
      ? [...selectedBrand]
      : selectedBrand && selectedBrand !== 'all'
        ? [selectedBrand as string]
        : [];
    const foundIndex = currentSelection.findIndex(
      (b) => normalized(b) === normalized(brand)
    );
    if (foundIndex >= 0)
      currentSelection = currentSelection.filter((_, i) => i !== foundIndex);
    else currentSelection.push(brand);
    setSelectedBrand(currentSelection.length === 0 ? 'all' : currentSelection);
  };

  const isSelected = (brand: string) => {
    const normalized = (s: unknown) =>
      String(s || '')
        .trim()
        .toLowerCase();
    if (brand === 'all')
      return (
        selectedBrand === 'all' ||
        (Array.isArray(selectedBrand) && selectedBrand.length === 0)
      );
    if (selectedBrand === 'all') return false;
    if (Array.isArray(selectedBrand))
      return selectedBrand.some((b) => normalized(b) === normalized(brand));
    return normalized(selectedBrand) === normalized(brand);
  };

  return (
    <>
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 lg:hidden backdrop-blur-sm"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 w-80 bg-white shadow-2xl transform transition-transform duration-300
          z-50 lg:z-30  
          lg:translate-x-0 lg:shadow-none lg:block 
          lg:sticky lg:top-24 lg:self-start lg:h-[calc(100vh-100px)] 
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
        `}
      >
        <div className="h-full flex flex-col p-4 custom-scrollbar relative border-r border-transparent lg:border-gray-100 overflow-y-auto overflow-x-hidden">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex absolute top-0 -right-3 z-10 bg-white border border-gray-200 rounded-full p-1 text-gray-500 hover:text-[var(--primary)] shadow-sm transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight size={14} />
            ) : (
              <ChevronLeft size={14} />
            )}
          </button>

          <div className="flex justify-between items-center lg:hidden mb-6">
            <h3 className="font-bold text-xl text-gray-900">Filtros</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className="!p-2"
            >
              <X size={20} />
            </Button>
          </div>

          <div className="space-y-6 flex-1">
            <div className="space-y-1">
              {!isCollapsed && (
                <h3 className="font-bold text-sm uppercase tracking-wider mb-3 text-gray-900">
                  Navegue Por
                </h3>
              )}

              <button
                onClick={() => setShowOnlyNew(!showOnlyNew)}
                className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} w-full py-2 text-sm transition-colors rounded-lg 
                  ${showOnlyNew ? 'bg-primary/5 text-primary font-bold' : 'text-gray-600 hover:text-[var(--primary)] hover:bg-gray-50'}`}
              >
                <Zap
                  size={16}
                  className={showOnlyNew ? 'fill-primary text-primary' : ''}
                />
                {!isCollapsed && (
                  <span className="font-medium">Lançamentos</span>
                )}
              </button>

              <button
                onClick={() => setShowOnlyBestsellers(!showOnlyBestsellers)}
                className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} w-full py-2 text-sm transition-colors rounded-lg 
                  ${showOnlyBestsellers ? 'bg-yellow-50 text-yellow-700 font-bold' : 'text-gray-600 hover:text-[var(--primary)] hover:bg-gray-50'}`}
              >
                <Star
                  size={16}
                  className={
                    showOnlyBestsellers ? 'fill-yellow-500 text-yellow-500' : ''
                  }
                />
                {!isCollapsed && (
                  <span className="font-medium">Best Sellers</span>
                )}
              </button>

              <button
                onClick={() => setShowFavorites(!showFavorites)}
                className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} w-full py-2 text-sm transition-colors rounded-lg 
                  ${showFavorites ? 'bg-red-50 text-red-600 font-bold' : 'text-gray-600 hover:text-[var(--primary)] hover:bg-gray-50'}`}
              >
                <Heart
                  size={16}
                  className={showFavorites ? 'fill-red-500 text-red-500' : ''}
                />
                {!isCollapsed && (
                  <span className="font-medium">
                    Favoritos ({favorites.length})
                  </span>
                )}
              </button>
            </div>

            <hr className="border-gray-200" />

            {brands.length > 0 && (
              <div>
                {!isCollapsed && (
                  <h3 className="font-bold text-sm uppercase tracking-wider mb-3 text-gray-900">
                    Marcas
                  </h3>
                )}
                <div
                  className={`space-y-2 ${isCollapsed ? 'text-center' : ''}`}
                >
                  <label
                    className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} cursor-pointer group select-none p-1 rounded hover:bg-gray-50`}
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected('all') ? 'bg-[var(--primary)] border-[var(--primary)]' : 'border-gray-300 bg-white'}`}
                    >
                      {isSelected('all') && (
                        <Check size={12} className="text-white" />
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected('all')}
                      onChange={() => toggleBrand('all')}
                      className="hidden"
                    />
                    {!isCollapsed && (
                      <span className="text-sm text-gray-600 group-hover:text-gray-900">
                        Todas
                      </span>
                    )}
                  </label>

                  {brands.map((brand) => (
                    <label
                      key={brand}
                      className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} cursor-pointer group select-none p-1 rounded hover:bg-gray-50 w-full`}
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected(brand) ? 'bg-[var(--primary)] border-[var(--primary)]' : 'border-gray-300 bg-white'}`}
                      >
                        {isSelected(brand) && (
                          <Check size={12} className="text-white" />
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected(brand)}
                        onChange={() => toggleBrand(brand)}
                        className="hidden"
                      />
                      {!isCollapsed && (
                        <span
                          className="text-sm text-gray-600 group-hover:text-gray-900 truncate flex-1 block text-left"
                          title={brand}
                        >
                          {brand}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {categories && categories.length > 0 && (
              <div className="hidden">
                {!isCollapsed && (
                  <h3 className="font-bold text-sm uppercase tracking-wider mb-3 text-gray-900">
                    Categorias
                  </h3>
                )}
                <div
                  className={`space-y-2 ${isCollapsed ? 'text-center' : ''}`}
                >
                  <label
                    className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} cursor-pointer group select-none p-1 rounded hover:bg-gray-50`}
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selectedCategory === 'all' ? 'bg-[var(--primary)] border-[var(--primary)]' : 'border-gray-300 bg-white'}`}
                    >
                      {selectedCategory === 'all' && (
                        <Check size={12} className="text-white" />
                      )}
                    </div>
                    <input
                      type="radio"
                      name="category"
                      checked={selectedCategory === 'all'}
                      onChange={() => setSelectedCategory('all')}
                      className="hidden"
                    />
                    {!isCollapsed && (
                      <span className="text-sm text-gray-600 group-hover:text-gray-900">
                        Todas
                      </span>
                    )}
                  </label>

                  {categories.map((cat, idx) => (
                    <label
                      key={`sidebar-cat-${String(cat ?? idx)}`}
                      className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} cursor-pointer group select-none p-1 rounded hover:bg-gray-50 w-full`}
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selectedCategory === cat ? 'bg-[var(--primary)] border-[var(--primary)]' : 'border-gray-300 bg-white'}`}
                      >
                        {selectedCategory === cat && (
                          <Check size={12} className="text-white" />
                        )}
                      </div>
                      <input
                        type="radio"
                        name="category"
                        checked={selectedCategory === cat}
                        onChange={() => setSelectedCategory(cat)}
                        className="hidden"
                      />
                      {!isCollapsed && (
                        <span
                          className="text-sm text-gray-600 group-hover:text-gray-900 truncate flex-1 block text-left"
                          title={cat}
                        >
                          {cat}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* --- SEÇÃO DE GÊNERO DINÂMICA (PILLS) --- */}
          {genders && genders.length > 0 && (
            <div className="py-6 border-b border-gray-100">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center justify-between">
                Gênero
                {selectedGender !== 'all' && !isCollapsed && (
                  <button
                    onClick={() => setSelectedGender('all')}
                    className="text-[10px] text-[var(--primary)] hover:underline lowercase font-bold"
                  >
                    limpar
                  </button>
                )}
              </h3>

              <div className="flex flex-col gap-2">
                {/* Opção 'Ver Todos' */}
                <button
                  onClick={() => setSelectedGender('all')}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all ${
                    selectedGender === 'all'
                      ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>Todos os gêneros</span>
                  {selectedGender === 'all' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
                  )}
                </button>

                {genders.map((g) => (
                  <button
                    key={g}
                    onClick={() => setSelectedGender(g)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all ${
                      selectedGender === g
                        ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="capitalize">
                      {String(g).toLowerCase()}
                    </span>
                    {selectedGender === g && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

// --- MOBILE ACTION BAR (Fixed Bottom) ---
export function StoreMobileActionBar() {
  const {
    store,
    isPricesVisible,
    setIsPricesVisible,
    setModal,
    cart,
    favorites,
    showFavorites,
    setShowFavorites,
    setSelectedCategory,
    setSearchTerm,
    setSelectedBrand,
  } = useStore();
  const { closeSidebar } = useLayoutStore();

  const getCartCount = (c: any) => {
    if (!c) return 0;
    if (Array.isArray(c))
      return c.reduce((acc, item) => acc + (item?.quantity || 0), 0);
    if (typeof c === 'object') {
      return Object.values(c).reduce((acc: number, v: any) => {
        if (typeof v === 'number') return acc + v;
        if (v && typeof v === 'object') return acc + (v.quantity || v.qty || 0);
        return acc;
      }, 0);
    }
    return 0;
  };
  const cartCount = getCartCount(cart);

  const goHome = () => {
    setSelectedCategory('all');
    setSelectedBrand('all');
    setSearchTerm('');
    setShowFavorites(false);
    closeSidebar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 shadow-lg pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5 h-16 max-w-screen-sm mx-auto">
        {/* 1. Início */}
        <button
          onClick={goHome}
          className="flex flex-col items-center justify-center gap-0.5 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors min-w-0 px-1"
        >
          <Home
            size={18}
            className="text-gray-600 dark:text-gray-400 flex-shrink-0"
          />
          <span className="text-[9px] font-medium text-gray-700 dark:text-gray-300 truncate w-full text-center">
            Início
          </span>
        </button>

        {/* 2. Ver Preços OU Buscar (condicional) */}
        <button
          onClick={() => {
            if (store.show_cost_price) {
              if (isPricesVisible) {
                setIsPricesVisible(false);
              } else {
                setModal('password', true);
              }
            } else {
              setModal('search', true);
            }
          }}
          className="flex flex-col items-center justify-center gap-0.5 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors min-w-0 px-1"
        >
          {store.show_cost_price ? (
            isPricesVisible ? (
              <Unlock size={18} className="text-green-600 flex-shrink-0" />
            ) : (
              <Lock
                size={18}
                className="text-gray-600 dark:text-gray-400 flex-shrink-0"
              />
            )
          ) : (
            <Search
              size={18}
              className="text-gray-600 dark:text-gray-400 flex-shrink-0"
            />
          )}
          <span className="text-[9px] font-medium text-gray-700 dark:text-gray-300 truncate w-full text-center">
            {store.show_cost_price
              ? isPricesVisible
                ? 'Preços'
                : 'Preços'
              : 'Buscar'}
          </span>
        </button>

        {/* 3. CARRINHO - DESTAQUE CENTRAL */}
        <button
          onClick={() => setModal('cart', true)}
          className="flex flex-col items-center justify-center gap-1 relative -mt-4 bg-gradient-to-br from-[var(--primary)] to-[var(--primary)]/80 hover:from-[var(--primary)]/90 hover:to-[var(--primary)]/70 rounded-full h-14 w-14 mx-auto shadow-lg transition-all flex-shrink-0"
        >
          <ShoppingCart size={22} className="text-white" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </button>

        {/* 4. Favoritos */}
        <button
          onClick={() => setShowFavorites(!showFavorites)}
          className="flex flex-col items-center justify-center gap-0.5 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors relative min-w-0 px-1"
        >
          <div className="relative flex-shrink-0">
            <Heart
              size={18}
              className={
                showFavorites
                  ? 'fill-current text-red-500'
                  : 'text-gray-600 dark:text-gray-400'
              }
            />
            {favorites.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold h-3.5 w-3.5 flex items-center justify-center rounded-full">
                {favorites.length > 9 ? '9+' : favorites.length}
              </span>
            )}
          </div>
          <span className="text-[9px] font-medium text-gray-700 dark:text-gray-300 truncate w-full text-center">
            Favoritos
          </span>
        </button>

        {/* 5. Pedidos */}
        <button
          onClick={() => setModal('load', true)}
          className="flex flex-col items-center justify-center gap-0.5 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors min-w-0 px-1"
        >
          <Download
            size={18}
            className="text-gray-600 dark:text-gray-400 flex-shrink-0"
          />
          <span className="text-[9px] font-medium text-gray-700 dark:text-gray-300 truncate w-full text-center">
            Pedidos
          </span>
        </button>
      </div>
    </div>
  );
}

// --- FOOTER ---
export function StoreFooter() {
  const { store } = useStore();
  const router = {
    push: (p: string) => {
      if (typeof window !== 'undefined') window.location.href = p;
    },
  } as any;
  const footerBg = store.footer_background_color || 'var(--secondary)';
  let footerTextColor = 'white';
  if (
    typeof footerBg === 'string' &&
    /^#([0-9A-F]{3}|[0-9A-F]{6})$/i.test(footerBg)
  ) {
    const hex = footerBg.replace('#', '');
    const fullHex =
      hex.length === 3
        ? hex
            .split('')
            .map((ch) => ch + ch)
            .join('')
        : hex;
    const r = parseInt(fullHex.substring(0, 2), 16) / 255;
    const g = parseInt(fullHex.substring(2, 4), 16) / 255;
    const b = parseInt(fullHex.substring(4, 6), 16) / 255;
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    footerTextColor = L > 0.6 ? '#000000' : '#FFFFFF';
  }

  return (
    <footer
      className="border-t border-white/10 pt-12 pb-6 mt-auto relative z-10"
      style={{ backgroundColor: footerBg, color: footerTextColor }}
    >
      <div className="max-w-[1920px] mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1">
            <h4 className="font-bold text-lg mb-4 text-[var(--primary)] filter brightness-150">
              {store.name}
            </h4>
            <p className="text-sm opacity-80 leading-relaxed max-w-xs">
              {store.footer_message || 'Sua loja de confiança.'}
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-3 text-[var(--primary)] filter brightness-150">
              Atendimento
            </h4>
            <ul className="space-y-2 text-sm opacity-90">
              {store.phone ? (
                <li>
                  {normalizePhoneDigits(store.phone) ? (
                    <a
                      href={whatsappHref(store.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 hover:text-[var(--primary)] transition-colors"
                    >
                      <Phone size={14} />{' '}
                      <span>{formatPhoneDisplay(store.phone)}</span>
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <Phone size={14} /> {String(store.phone)}
                    </span>
                  )}
                </li>
              ) : null}
              {store.email && (
                <li>
                  <span className="inline-flex items-center gap-2">
                    <Mail size={14} /> {store.email}
                  </span>
                </li>
              )}
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-3 text-[var(--primary)] filter brightness-150">
              Acesso Restrito
            </h4>
            <ul className="space-y-2 text-sm opacity-90">
              <li>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/dashboard')}
                  className="!p-0 !h-auto text-white hover:text-[var(--primary)] hover:bg-transparent justify-start font-normal"
                >
                  Área do Representante
                </Button>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 text-xs opacity-60 text-center">
          &copy; {new Date().getFullYear()} {store.name}. Todos os direitos
          reservados. Powered by RepVendas.
        </div>
      </div>
    </footer>
  );
}

// --- CARROSSEL DE MARCAS (Pílula Premium) ---
export function CarouselBrands() {
  const { brandsWithLogos, selectedBrand, setSelectedBrand } = useStore();
  const [isMobile, setIsMobile] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // If we don't have logos from the `brands` table, fall back to rendering
  // the simple list of brand names from products so the UI remains usable.
  const { brands } = useStore();
  const effectiveBrands =
    brandsWithLogos && brandsWithLogos.length > 0
      ? brandsWithLogos
      : (brands || []).map((b: any) => ({ name: b, logo_url: null }));
  if (!effectiveBrands || effectiveBrands.length === 0) return null;

  const { setSortOrder } = useStore();

  const toggleBrand = (name: string) => {
    if (!name) return;
    // support multi/select single behavior: toggle to 'all' if already selected
    if (selectedBrand === name) {
      setSelectedBrand('all');
    } else {
      setSelectedBrand(name);
      // When a brand is selected from the carousel, default to reference Z-A
      try {
        setSortOrder('ref_desc');
      } catch (e) {
        // ignore if not available
      }
    }
  };

  const normalizeLogoSrc = (raw: string | null | undefined) => {
    if (!raw) return null;
    const s = String(raw);
    if (s.includes('/storage/v1/object/public/')) {
      const path = s.split('/storage/v1/object/public/')[1];
      // Preserve the 'public/' segment so the API can correctly detect bucket/path
      return `/api/storage-image?path=${encodeURIComponent(path)}`;
    }
    if (
      s.startsWith('/api/storage-image') ||
      s.includes('/api/storage-image?path=')
    )
      return s;
    if (/^https?:\/\//.test(s)) return s;
    return s;
  };

  // Autoplay smooth scroll on mobile when we have many brands.
  // We duplicate the items (render twice) to allow a seamless loop and
  // avoid visual trembling when resetting scrollLeft.
  useEffect(() => {
    if (!isMobile) return;
    if (!scrollRef.current) return;
    if (effectiveBrands.length <= 3) return;

    let rafId: number | null = null;
    let last = performance.now();
    const speedPxPerMs = 0.04; // slightly slower, tuning: pixels per ms

    const step = (now: number) => {
      const dt = Math.min(40, now - last); // cap dt for stability
      last = now;
      const el = scrollRef.current;
      if (!el) return;
      if (!isPaused) {
        try {
          el.scrollLeft += dt * speedPxPerMs;
          // when we've scrolled past half the scrollWidth (the duplicated set),
          // jump back by half to create a seamless loop without snapping to 0.
          const half = el.scrollWidth / 2;
          if (el.scrollLeft >= half) {
            el.scrollLeft -= half;
          }
        } catch (e) {
          // ignore
        }
      }
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isMobile, isPaused, effectiveBrands.length]);

  return (
    <div className="w-full border-t py-2 overflow-y-hidden">
      <div className="max-w-[1920px] mx-auto px-4 lg:px-8 flex items-center">
        <span className="font-bold uppercase tracking-wide text-xs mr-3 flex-shrink-0">
          Marcas:
        </span>
        <div
          className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-hide"
          ref={scrollRef}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
          onDoubleClick={() => setIsPaused((s) => !s)}
          title={isMobile ? undefined : 'Duplo clique para pausar/retomar'}
        >
          <div className="flex items-center gap-3">
            {(isMobile && effectiveBrands.length > 3
              ? [...effectiveBrands, ...effectiveBrands]
              : effectiveBrands
            ).map((brand: any, i: number) => {
              const active = Array.isArray(selectedBrand)
                ? selectedBrand.includes(brand.name)
                : selectedBrand === brand.name;
              const src = brand.logo_url || normalizeLogoSrc(brand.logo_url);
              const initials = String(brand.name || '')
                .trim()
                .split(' ')
                .map((s: string) => s[0])
                .filter(Boolean)
                .slice(0, 2)
                .join('')
                .toUpperCase();

              return (
                <button
                  key={`${brand.name}-${i}`}
                  onClick={() => toggleBrand(brand.name)}
                  title={brand.name}
                  className={`group relative flex items-center justify-center p-1 rounded-none transition-all duration-200 shrink-0 hover:scale-105 ${
                    active
                      ? 'bg-[var(--primary)]/10 ring-2 ring-[var(--primary)] animate-pulse'
                      : ''
                  }`}
                >
                  {src ? (
                    <img
                      src={src}
                      alt={brand.name}
                      loading="lazy"
                      draggable={false}
                      className="w-20 h-10 object-contain shrink-0"
                    />
                  ) : (
                    // Fallback: mostra o nome da marca diretamente quando não há logo
                    <span
                      className={`px-3 text-xs font-bold whitespace-nowrap ${active ? 'text-[var(--primary)]' : 'text-gray-700'}`}
                    >
                      {brand.name}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
