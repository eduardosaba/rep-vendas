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
  ChevronLeft,
  ChevronRight,
  Home,
} from 'lucide-react';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { create } from 'zustand';

// --- STORE DE LAYOUT ---
interface LayoutStore {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setIsFilterOpen: (isOpen: boolean) => void;
  closeSidebar: () => void;
}

// --- MOBILE ACTION BAR (Estilo Mercado Livre) ---
export function StoreMobileActionBar() {
  const {
    isPricesVisible,
    setIsPricesVisible,
    setModal,
    cart,
    favorites,
    showFavorites,
    setShowFavorites,
  } = useStore();

  // Cálculo da quantidade de itens no carrinho
  const cartCount = Array.isArray(cart)
    ? cart.reduce((acc, item) => acc + (item?.quantity || 0), 0)
    : 0;

  // Função para voltar ao topo (Início)
  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (showFavorites) setShowFavorites(false);
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2">
      <div className="flex items-center justify-between px-2 relative">
        {/* 1. INÍCIO */}
        <button
          onClick={scrollToTop}
          className="flex flex-col items-center justify-center gap-1 flex-1 min-w-[60px] py-1 text-gray-500 dark:text-gray-400 active:scale-95 transition-transform"
        >
          <Home
            size={22}
            className={!showFavorites ? 'text-[var(--primary)]' : ''}
          />
          <span
            className={`text-[10px] font-bold uppercase tracking-tighter ${!showFavorites ? 'text-[var(--primary)]' : ''}`}
          >
            Início
          </span>
        </button>

        {/* 2. VER PREÇO */}
        <button
          onClick={() =>
            isPricesVisible
              ? setIsPricesVisible(false)
              : setModal('password', true)
          }
          className="flex flex-col items-center justify-center gap-1 flex-1 min-w-[60px] py-1 text-gray-500 dark:text-gray-400 active:scale-95 transition-transform"
        >
          {isPricesVisible ? (
            <Unlock size={22} className="text-green-500" />
          ) : (
            <Lock size={22} />
          )}
          <span
            className={`text-[10px] font-bold uppercase tracking-tighter ${isPricesVisible ? 'text-green-600' : ''}`}
          >
            {isPricesVisible ? 'Preços ON' : 'Ver Preço'}
          </span>
        </button>

        {/* 3. CARRINHO EM DESTAQUE (Raised Button) */}
        <div className="flex-1 flex justify-center -mt-10 relative">
          <button
            onClick={() => setModal('cart', true)}
            className="flex flex-col items-center justify-center w-16 h-16 bg-[var(--primary)] rounded-full shadow-[0_8px_25px_rgba(0,0,0,0.2)] border-4 border-white dark:border-slate-900 active:scale-90 transition-all group"
          >
            <div className="relative">
              <ShoppingCart size={26} className="text-white" />
              {cartCount > 0 && (
                <span className="absolute -top-3 -right-3 bg-red-600 text-white text-[10px] font-black h-5 w-5 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 animate-in zoom-in">
                  {cartCount}
                </span>
              )}
            </div>
          </button>
          <span className="absolute -bottom-6 text-[10px] font-black uppercase text-[var(--primary)] tracking-tighter">
            Carrinho
          </span>
        </div>

        {/* 4. VER PEDIDOS (Load Cart / Histórico) */}
        <button
          onClick={() => setModal('load', true)}
          className="flex flex-col items-center justify-center gap-1 flex-1 min-w-[60px] py-1 text-gray-500 dark:text-gray-400 active:scale-95 transition-transform"
        >
          <Download size={22} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">
            Pedidos
          </span>
        </button>

        {/* 5. FAVORITOS */}
        <button
          onClick={() => setShowFavorites(!showFavorites)}
          className="flex flex-col items-center justify-center gap-1 flex-1 min-w-[60px] py-1 text-gray-500 dark:text-gray-400 active:scale-95 transition-transform"
        >
          <div className="relative">
            <Heart
              size={22}
              className={showFavorites ? 'fill-red-500 text-red-500' : ''}
            />
            {favorites && favorites.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-2 w-2 bg-red-500 rounded-full border border-white dark:border-slate-900" />
            )}
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-tighter ${showFavorites ? 'text-red-600' : ''}`}
          >
            Favoritos
          </span>
        </button>
      </div>
    </div>
  );
}

export const useLayoutStore = create<LayoutStore>((set) => ({
  isSidebarOpen: false,
  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setIsFilterOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  closeSidebar: () => set({ isSidebarOpen: false }),
}));

// --- HELPERS ---
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

// --- TOP BAR ---
export function StoreTopBar() {
  const { store } = useStore();
  // respeita flag de visibilidade configurada no catálogo
  if (store.show_top_benefit_bar === false) return null;
  const bgColor = store.top_benefit_bg_color || '#f3f4f6';
  const textColor = store.top_benefit_text_color || 'var(--primary)';
  const height = store.top_benefit_height || 36;
  const fontSize = store.top_benefit_text_size || 11;

  const [hidden, setHidden] = useState(false);
  const lastY = useRef(typeof window !== 'undefined' ? window.scrollY : 0);
  const lastDir = useRef(0);

  useEffect(() => {
    const threshold = 15;
    const onScroll = () => {
      const y = window.scrollY || window.pageYOffset;
      const delta = y - lastY.current;
      let dir = 0;
      if (delta > threshold && y > 50) dir = 1;
      else if (delta < -threshold) dir = -1;

      if (dir === 1 && lastDir.current !== 1) {
        setHidden(true);
        lastDir.current = 1;
      } else if (dir === -1 && lastDir.current !== -1) {
        setHidden(false);
        lastDir.current = -1;
      }

      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className={`border-b relative z-50 transition-transform duration-300 ${hidden ? '-translate-y-full' : 'translate-y-0'}`}
      style={{ backgroundColor: bgColor, borderColor: 'transparent' }}
    >
      <div
        className="max-w-[1920px] mx-auto px-4 lg:px-8 flex justify-between items-center overflow-x-auto whitespace-nowrap gap-6 scrollbar-hide"
        style={{ height, color: textColor, fontSize }}
      >
        {store.top_benefit_image_url ? (
          store.top_benefit_text ? (
            <div
              className="w-full flex flex-col md:flex-row items-center"
              style={{ height }}
            >
              <div
                className="w-full md:w-2/5 flex-shrink-0 overflow-hidden rounded"
                style={{ maxHeight: height }}
              >
                <img
                  src={store.top_benefit_image_url}
                  alt="Barra de benefícios"
                  className="h-full w-full"
                  style={{
                    objectFit: (store.top_benefit_image_fit as any) || 'cover',
                    transform: `scale(${(Number(store.top_benefit_image_scale) || 100) / 100})`,
                    transition: 'transform 150ms ease-out',
                  }}
                />
              </div>
              <div className="w-full md:flex-1 md:pl-4 px-3 py-2">
                <span className="font-bold block">
                  {store.top_benefit_text}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full">
              <img
                src={store.top_benefit_image_url}
                alt="Barra de benefícios"
                className="h-full w-full"
                style={{
                  maxHeight: height,
                  objectFit: (store.top_benefit_image_fit as any) || 'cover',
                  transform: `scale(${(Number(store.top_benefit_image_scale) || 100) / 100})`,
                  transition: 'transform 150ms ease-out',
                }}
              />
            </div>
          )
        ) : store.top_benefit_text ? (
          <span className="flex items-center gap-1.5 font-bold">
            <Star size={14} /> {store.top_benefit_text}
          </span>
        ) : null}

        {/* contact phone intentionally not shown here; displayed in top info bar */}
      </div>
    </div>
  );
}

// --- HEADER ---
export function StoreHeader() {
  const {
    store,
    categories,
    selectedCategory,
    setSelectedCategory,
    searchTerm,
    setSearchTerm,
    isPricesVisible,
    setIsPricesVisible,
    cart,
    setModal,
    favorites,
    showFavorites,
    setShowFavorites,
    brandsWithLogos,
    selectedBrand,
    setSelectedBrand,
  } = useStore();

  const { toggleSidebar } = useLayoutStore();
  const getCartCount = (c: any) => {
    if (!c) return 0;
    if (Array.isArray(c))
      return c.reduce((acc, item) => acc + (item?.quantity || 0), 0);
    if (typeof c === 'object') {
      return Object.values(c).reduce((acc: number, v: any) => {
        if (typeof v === 'number') return acc + v;
        if (v && typeof v === 'object') return acc + (v.quantity || 0);
        return acc;
      }, 0);
    }
    return 0;
  };
  const cartCount = getCartCount(cart);

  const isHeaderWhite =
    !store.header_background_color ||
    store.header_background_color === '#ffffff';
  const textColorClass = isHeaderWhite ? 'text-gray-600' : 'text-white';
  const hoverClass = isHeaderWhite
    ? 'hover:text-[var(--primary)]'
    : 'hover:opacity-80';

  const toggleBrand = (brandName: string) => {
    if (brandName === 'all') {
      setSelectedBrand('all');
      return;
    }
    const normalized = (s: unknown) =>
      String(s || '')
        .trim()
        .toLowerCase();
    const currentlySelected = Array.isArray(selectedBrand)
      ? (selectedBrand[0] as string)
      : (selectedBrand as string);

    if (
      currentlySelected &&
      normalized(currentlySelected) === normalized(brandName)
    ) {
      setSelectedBrand('all');
    } else {
      setSelectedBrand(brandName);
    }
  };

  const isBrandSelected = (brandName: string) => {
    const normalized = (s: unknown) =>
      String(s || '')
        .trim()
        .toLowerCase();
    if (brandName === 'all')
      return (
        selectedBrand === 'all' ||
        (Array.isArray(selectedBrand) && selectedBrand.length === 0)
      );
    if (selectedBrand === 'all') return false;
    if (Array.isArray(selectedBrand))
      return selectedBrand.some((b) => normalized(b) === normalized(brandName));
    return normalized(selectedBrand) === normalized(brandName);
  };

  return (
    <header
      className="sticky top-0 z-40 shadow-md transition-all duration-300"
      style={{ backgroundColor: store.header_background_color || 'white' }}
    >
      <div className="max-w-[1920px] mx-auto px-4 lg:px-8 py-4">
        <div className="flex flex-col lg:flex-row items-center gap-4">
          <div className="flex items-center justify-between w-full lg:w-auto lg:mr-8 gap-4">
            <div className="flex items-center gap-3">
              <div className="lg:hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSidebar}
                  className={`!p-2 ${textColorClass}`}
                >
                  <Menu size={24} />
                </Button>
              </div>

              {store.logo_url ? (
                <div className="relative h-14 min-w-[120px] flex items-center">
                  <img
                    src={store.logo_url}
                    alt={store.name}
                    className="h-full w-auto object-contain max-w-[200px]"
                  />
                </div>
              ) : (
                <div
                  className={`h-14 px-4 rounded flex items-center justify-center font-bold text-xl ${isHeaderWhite ? 'bg-gray-100 text-gray-900' : 'bg-white/20 text-white'}`}
                >
                  {store.name?.substring(0, 10) || 'Loja'}
                </div>
              )}
            </div>

            <div className="lg:hidden" />
          </div>

          <div className="flex-1 w-full relative">
            <input
              type="text"
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 lg:h-12 pl-4 pr-12 rounded-lg border-0 shadow-sm outline-none focus:ring-2 focus:ring-[var(--primary)] text-gray-900 transition-all"
              style={{
                backgroundColor: isHeaderWhite
                  ? '#f9fafb'
                  : 'rgba(255,255,255,0.95)',
              }}
            />
            <Button
              variant="primary"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 !h-8 !w-10 !p-0 rounded-md"
            >
              <Search size={18} />
            </Button>
          </div>

          <div
            className={`hidden lg:flex items-center gap-6 text-xs font-medium ${textColorClass}`}
          >
            <button
              onClick={() => setShowFavorites(!showFavorites)}
              className={`flex flex-col items-center gap-1 transition-colors ${hoverClass} ${showFavorites ? 'text-red-500' : ''}`}
            >
              <div className="relative">
                <Heart
                  size={24}
                  className={showFavorites ? 'fill-current' : ''}
                />
                {favorites.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold h-3.5 w-3.5 flex items-center justify-center rounded-full">
                    {favorites.length}
                  </span>
                )}
              </div>
              <span>Favoritos</span>
            </button>

            {/* Botão "Ver Preços" aparece apenas quando o catálogo está em modo 'custo' */}
            {store.show_cost_price === true &&
              store.show_sale_price !== true && (
                <button
                  onClick={() =>
                    isPricesVisible
                      ? setIsPricesVisible(false)
                      : setModal('password', true)
                  }
                  className={`flex flex-col items-center gap-1 transition-colors ${hoverClass}`}
                >
                  {isPricesVisible ? <Unlock size={24} /> : <Lock size={24} />}
                  <span>{isPricesVisible ? 'Preços ON' : 'Ver Preços'}</span>
                </button>
              )}

            <button
              onClick={() => setModal('load', true)}
              className={`flex flex-col items-center gap-1 transition-colors ${hoverClass}`}
            >
              <Download size={24} />
              <span>Pedidos</span>
            </button>

            <button
              onClick={() => setModal('cart', true)}
              className={`flex flex-col items-center gap-1 transition-colors group ${hoverClass}`}
            >
              <div className="relative">
                <ShoppingCart size={24} />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-white">
                    {cartCount}
                  </span>
                )}
              </div>
              <span>Carrinho</span>
            </button>
          </div>
        </div>
      </div>

      {brandsWithLogos.length > 0 && (
        <div
          className={`border-t ${isHeaderWhite ? 'border-gray-100 bg-gray-50' : 'border-white/10 bg-black/10'} py-3 overflow-hidden`}
        >
          <div className="max-w-[1920px] mx-auto px-4 lg:px-8 flex items-center">
            <span
              className={`font-bold uppercase tracking-wide text-xs mr-2 flex-shrink-0 ${isHeaderWhite ? 'text-gray-500' : 'text-white/80'}`}
            >
              Marcas:
            </span>
            <div className="relative flex-1">
              <CarouselBrands
                brands={brandsWithLogos}
                isBrandSelected={isBrandSelected}
                toggleBrand={toggleBrand}
                isHeaderWhite={isHeaderWhite}
              />
            </div>
          </div>
        </div>
      )}

      {categories.length > 0 && (
        <div
          className={`border-t ${isHeaderWhite ? 'border-gray-100 bg-white' : 'border-white/10 bg-black/5'} hidden lg:block`}
        >
          <div className="max-w-[1920px] mx-auto px-4 lg:px-8 flex gap-4 py-3 overflow-x-auto text-sm items-center scrollbar-hide">
            <span
              className={`font-bold uppercase tracking-wide text-xs mr-2 flex-shrink-0 ${isHeaderWhite ? 'text-gray-500' : 'text-white/80'}`}
            >
              Categorias:
            </span>
            <button
              onClick={() => setSelectedCategory('all')}
              className={`whitespace-nowrap ${selectedCategory === 'all' ? 'font-bold underline decoration-2 underline-offset-4 decoration-[var(--primary)]' : 'opacity-70 hover:opacity-100'} ${textColorClass} hover:text-[var(--primary)] transition-colors`}
            >
              Todas
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap ${selectedCategory === cat ? 'font-bold underline decoration-2 underline-offset-4 decoration-[var(--primary)]' : 'opacity-70 hover:opacity-100'} ${textColorClass} hover:text-[var(--primary)] transition-colors`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

// --- SIDEBAR ---
export function StoreSidebar() {
  const {
    brands,
    selectedBrand,
    setSelectedBrand,
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
          </div>
        </div>
      </aside>
    </>
  );
}

// --- FOOTER ---
export function StoreFooter() {
  const { store } = useStore();
  const router = useRouter();
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
              <li>
                <a
                  href={whatsappHref(store.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-[var(--primary)] transition-colors"
                >
                  <Phone size={14} />{' '}
                  <span>{formatPhoneDisplay(store.phone)}</span>
                </a>
              </li>
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
                  onClick={() => router.push('/login')}
                  className="!p-0 !h-auto text-white hover:text-[var(--primary)] hover:bg-transparent justify-start font-normal"
                >
                  Área do Vendedor
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

// --- CARROSSEL DE MARCAS (CORRIGIDO: PAUSA AO TOCAR/CLICAR) ---
function CarouselBrands({
  brands,
  isBrandSelected,
  toggleBrand,
  isHeaderWhite,
}: any) {
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  // Detecta se é mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Verifica se precisa animar / se há overflow
  useEffect(() => {
    const check = () => {
      if (!containerRef.current || !innerRef.current) return;
      const contentWidth = innerRef.current.scrollWidth;
      const containerWidth = containerRef.current.clientWidth;
      const overflow = contentWidth > containerWidth;
      setHasOverflow(overflow);

      // REGRAS DE ANIMAÇÃO:
      // No mobile, NÃO animar — mostramos setas se houver overflow
      // No desktop, anima se houver overflow
      if (isMobile) {
        setShouldAnimate(false);
      } else {
        setShouldAnimate(overflow);
      }
    };

    const timeout = setTimeout(check, 100);
    window.addEventListener('resize', check);
    return () => {
      window.removeEventListener('resize', check);
      clearTimeout(timeout);
    };
  }, [brands, isMobile]);

  // Duplica/Triplica itens para garantir o loop infinito sem buracos
  const loopBrands = shouldAnimate
    ? brands.length < 4
      ? [...brands, ...brands, ...brands, ...brands]
      : [...brands, ...brands]
    : brands;

  const duration = Math.max(20, loopBrands.length * 2.5);

  return (
    <div
      className="w-full overflow-hidden relative select-none"
      ref={containerRef}
    >
      <style>{`
        @keyframes marquee { 
          0% { transform: translateX(0); } 
          100% { transform: translateX(-50%); } 
        }
        .animate-marquee {
          display: flex;
          width: max-content;
          animation: marquee ${duration}s linear infinite;
        }
      `}</style>

      {/* Gradientes laterais (apenas visuais, sem bloquear cliques) */}
      {shouldAnimate && (
        <>
          <div
            className={`absolute left-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-r ${isHeaderWhite ? 'from-white to-transparent' : 'from-black/20 to-transparent'} pointer-events-none`}
          />
          <div
            className={`absolute right-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-l ${isHeaderWhite ? 'from-white to-transparent' : 'from-black/20 to-transparent'} pointer-events-none`}
          />
        </>
      )}

      <div
        // EVENTOS DE PAUSA ROBUSTOS
        // Desktop: Mouse Enter/Leave
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        // Mobile: Touch Start (toque) e Touch End (soltar)
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
        // Segurança: Se arrastar o dedo, mantém pausado
        onTouchMove={() => setIsPaused(true)}
        className="w-full py-1"
      >
        <div
          ref={innerRef}
          className={`flex items-center gap-x-4 ${shouldAnimate ? 'animate-marquee' : 'justify-start overflow-x-auto scrollbar-hide px-2'}`}
          // APLICA A PAUSA DIRETAMENTE NO ESTILO (Mais forte que classe CSS)
          style={{
            animationPlayState: isPaused ? 'paused' : 'running',
            WebkitAnimationPlayState: isPaused ? 'paused' : 'running',
            WebkitOverflowScrolling: 'touch',
            scrollBehavior: 'smooth',
          }}
        >
          {loopBrands.map((brand: any, i: number) => {
            const active = isBrandSelected(brand.name);
            const isClone = shouldAnimate && i >= loopBrands.length / 2;

            return (
              <button
                key={`${brand.name}-${i}`}
                onClick={() => toggleBrand(brand.name)}
                // Adicionado onTouchEnd aqui também para garantir o clique
                onTouchEnd={(e) => {
                  // Permite o clique passar, mas garante que o estado de pausa seja limpo eventualmente
                }}
                className={`
                  relative group flex items-center gap-2 px-4 py-1.5 rounded-full border 
                  transform transition-all duration-200 flex-shrink-0 touch-manipulation
                  ${!isMobile && 'hover:scale-105'} 
                  ${
                    active
                      ? 'border-[var(--primary)] bg-[var(--primary)] text-white shadow-md'
                      : isHeaderWhite
                        ? 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                        : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
                  }
                `}
              >
                {brand.logo_url && (
                  <img
                    src={brand.logo_url}
                    alt={brand.name}
                    className={`object-contain ${isMobile ? 'h-8 w-auto max-w-[64px]' : 'h-5 w-auto max-w-[50px]'}`}
                  />
                )}
                {/* No mobile mostramos apenas o logo (sem nome) */}
                {!isMobile && (
                  <span
                    className={`text-xs font-bold whitespace-nowrap ${!active ? 'group-hover:text-[var(--primary)]' : ''}`}
                  >
                    {brand.name}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Setas para mobile quando houver overflow */}
      {isMobile && hasOverflow && (
        <>
          <button
            aria-label="Scroll left"
            onClick={() => {
              if (!innerRef.current) return;
              innerRef.current.scrollBy({
                left: -containerRef.current!.clientWidth * 0.7,
                behavior: 'smooth',
              });
            }}
            className="absolute left-1 top-1/2 -translate-y-1/2 z-20 rounded-full bg-white/90 p-1 shadow-md"
          >
            <ChevronLeft className="h-5 w-5 text-gray-700" />
          </button>
          <button
            aria-label="Scroll right"
            onClick={() => {
              if (!innerRef.current) return;
              innerRef.current.scrollBy({
                left: containerRef.current!.clientWidth * 0.7,
                behavior: 'smooth',
              });
            }}
            className="absolute right-1 top-1/2 -translate-y-1/2 z-20 rounded-full bg-white/90 p-1 shadow-md"
          >
            <ChevronRight className="h-5 w-5 text-gray-700" />
          </button>
        </>
      )}
    </div>
  );
}
