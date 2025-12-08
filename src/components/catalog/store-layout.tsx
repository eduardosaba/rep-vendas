'use client';

import { useStore } from './store-context';
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
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Helpers: normalize phone digits and format for WhatsApp/link and display
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
  const local = digits.slice(2); // remove country code
  if (local.length === 11) {
    return `+${digits.slice(0, 2)} (${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  if (local.length === 10) {
    return `+${digits.slice(0, 2)} (${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }
  return `+${digits}`;
}

// ... StoreTopBar mantido igual ...
export function StoreTopBar() {
  const { store } = useStore();
  return (
    <div className="bg-gray-100 border-b border-gray-200 py-2 text-[11px] text-[var(--primary)] uppercase tracking-wide font-medium relative z-50">
      <div className="max-w-7xl mx-auto px-4 flex justify-between items-center overflow-x-auto whitespace-nowrap gap-6 scrollbar-hide">
        {store.top_benefit_text ? (
          <span className="flex items-center gap-1.5 text-[var(--primary)] font-bold">
            <Star size={14} /> {store.top_benefit_text}
          </span>
        ) : (
          <>
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} /> Compra 100% Segura
            </span>
            <span className="flex items-center gap-1.5">
              <Truck size={14} /> Enviamos para todo Brasil
            </span>
          </>
        )}
        <span className="flex items-center gap-1.5 ml-auto">
          <Phone size={14} />
          <a
            href={whatsappHref(store.phone)}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 text-[var(--primary)] font-medium hover:underline"
          >
            Suporte: {formatPhoneDisplay(store.phone)}
          </a>
        </span>
      </div>
    </div>
  );
}

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
    setIsFilterOpen,
    favorites,
    showFavorites,
    setShowFavorites,
    brandsWithLogos,
    selectedBrand,
    setSelectedBrand,
  } = useStore();
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const isHeaderWhite =
    !store.header_background_color ||
    store.header_background_color === '#ffffff';
  const textColorClass = isHeaderWhite ? 'text-gray-600' : 'text-white';
  const logoBgClass = isHeaderWhite
    ? 'bg-gray-100 text-gray-900'
    : 'bg-white/20 text-white';
  const hoverClass = isHeaderWhite
    ? 'hover:text-[var(--primary)]'
    : 'hover:opacity-80';

  // Helper para seleção de marca (mesma lógica da sidebar)
  const toggleBrand = (brandName: string) => {
    // single-select behavior: clicking a brand selects it, clicking again clears to 'all'
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
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* ... Linha Superior (Logo, Busca, Ações) mantida igual ... */}
        <div className="flex flex-col lg:flex-row items-center gap-4">
          <div className="flex items-center justify-between w-full lg:w-auto lg:mr-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsFilterOpen(true)}
                className={`lg:hidden p-2 rounded-md transition-colors ${textColorClass} ${hoverClass}`}
              >
                <Menu size={24} />
              </button>
              {store.logo_url ? (
                <img
                  src={store.logo_url}
                  alt={store.name}
                  className="h-14 w-auto object-contain bg-white rounded p-1"
                />
              ) : (
                <div
                  className={`h-14 px-4 rounded flex items-center justify-center font-bold text-xl ${logoBgClass}`}
                >
                  {store.name.substring(0, 10)}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 lg:hidden">
              <button
                onClick={() => setShowFavorites(!showFavorites)}
                className={`p-2 transition-colors ${textColorClass} ${showFavorites ? 'text-red-500' : ''}`}
              >
                <Heart
                  size={22}
                  className={showFavorites ? 'fill-current' : ''}
                />
              </button>
              <button
                onClick={() =>
                  isPricesVisible
                    ? setIsPricesVisible(false)
                    : setModal('password', true)
                }
                className={`p-2 transition-colors ${textColorClass}`}
              >
                {isPricesVisible ? <Unlock size={22} /> : <Lock size={22} />}
              </button>
              <button
                onClick={() => setModal('load', true)}
                className={`p-2 transition-colors ${textColorClass}`}
              >
                <Download size={22} />
              </button>
              <button
                onClick={() => setModal('cart', true)}
                className={`relative p-2 transition-colors ${textColorClass}`}
              >
                <ShoppingCart size={24} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold h-3.5 w-3.5 flex items-center justify-center rounded-full">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="flex-1 w-full relative">
            <input
              type="text"
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 pl-4 pr-12 rounded-lg border-0 shadow-sm outline-none focus:ring-2 focus:ring-[var(--primary)] text-gray-900"
              style={{
                backgroundColor: isHeaderWhite
                  ? '#f9fafb'
                  : 'rgba(255,255,255,0.9)',
              }}
            />
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md text-white transition-all hover:brightness-110"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              <Search size={18} />
            </button>
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
            <button
              onClick={() => setModal('load', true)}
              className={`flex flex-col items-center gap-1 transition-colors ${hoverClass}`}
            >
              <Download size={24} />
              <span>Pedidos</span>
            </button>
            <button
              onClick={() => setModal('cart', true)}
              className={`flex flex-col items-center gap-1 transition-colors relative group ${hoverClass}`}
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

      {/* --- CARROSSEL DE MARCAS --- */}
      {brandsWithLogos.length > 0 && (
        <div
          className={`border-t ${isHeaderWhite ? 'border-gray-100 bg-gray-50' : 'border-white/10 bg-black/10'} py-3 overflow-hidden`}
        >
          <div className="max-w-7xl mx-auto px-4 flex items-center">
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

      {/* Categorias */}
      {categories.length > 0 && (
        <div
          className={`border-t ${isHeaderWhite ? 'border-gray-100 bg-white' : 'border-white/10 bg-black/5'} hidden lg:block`}
        >
          <div className="max-w-7xl mx-auto px-4 flex gap-4 py-3 overflow-x-auto text-sm items-center">
            <span
              className={`font-bold uppercase tracking-wide text-xs mr-2 flex-shrink-0 ${isHeaderWhite ? 'text-gray-500' : 'text-white/80'}`}
            >
              Categorias:
            </span>
            <button
              onClick={() => setSelectedCategory('all')}
              className={`group transform transition-all duration-200 ease-out whitespace-nowrap ${selectedCategory === 'all' ? 'font-bold underline decoration-2 underline-offset-4 decoration-[var(--primary)]' : 'opacity-70 hover:opacity-100'} ${textColorClass} hover:scale-105 hover:shadow-lg`}
            >
              <span className="transition-colors duration-200 group-hover:text-[var(--primary)]">
                Todas
              </span>
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`group transform transition-all duration-200 ease-out whitespace-nowrap ${selectedCategory === cat ? 'font-bold underline decoration-2 underline-offset-4 decoration-[var(--primary)]' : 'opacity-70 hover:opacity-100'} ${textColorClass} hover:scale-105 hover:shadow-lg`}
              >
                <span className="transition-colors duration-200 group-hover:text-[var(--primary)]">
                  {cat}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

// ... (StoreSidebar e StoreFooter mantidos iguais - pode copiar do anterior)
// Carrossel de Marcas (definido fora do JSX)
function CarouselBrands({
  brands,
  isBrandSelected,
  toggleBrand,
  isHeaderWhite,
}: {
  brands: { name: string; logo_url?: string | null | undefined }[];
  isBrandSelected: (name: string) => boolean;
  toggleBrand: (name: string) => void;
  isHeaderWhite: boolean;
}) {
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  // Decide whether we need the marquee: only when inner content is wider than container
  useEffect(() => {
    const check = () => {
      const container = containerRef.current;
      const inner = innerRef.current;
      if (!container || !inner) return;
      const containerWidth = container.clientWidth;
      const innerWidth = inner.scrollWidth;
      setShouldAnimate(innerWidth > containerWidth + 8); // small tolerance
    };

    check();

    const ro = new ResizeObserver(check);
    if (containerRef.current) ro.observe(containerRef.current);
    if (innerRef.current) ro.observe(innerRef.current);
    window.addEventListener('resize', check);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', check);
    };
  }, [brands]);

  // If animating, duplicate brands for seamless marquee
  const loopBrands = shouldAnimate ? [...brands, ...brands] : brands;

  // Animation duration scales with number of unique brands
  const baseDuration = 18; // seconds
  const duration = Math.max(
    baseDuration,
    Math.ceil(brands.length * 1.5) + baseDuration
  );

  return (
    <div className="w-full overflow-hidden" ref={containerRef}>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
      <div
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="w-full"
      >
        <div
          ref={innerRef}
          className="flex items-center gap-x-6 whitespace-nowrap"
          style={
            shouldAnimate
              ? {
                  display: 'flex',
                  width: 'max-content',
                  animationName: 'marquee',
                  animationDuration: `${duration}s`,
                  animationTimingFunction: 'linear',
                  animationIterationCount: 'infinite',
                  animationPlayState: isPaused ? 'paused' : 'running',
                }
              : { display: 'flex', width: 'max-content' }
          }
        >
          {loopBrands.map(
            (
              brand: { name: string; logo_url?: string | null | undefined },
              i: number
            ) => {
              const originalCount = brands.length || 1;
              const isDuplicate = shouldAnimate && i >= originalCount;
              const active = isBrandSelected(brand.name);
              return (
                <button
                  key={`${brand.name}-${i}`}
                  onClick={() => {
                    if (isDuplicate) return;
                    toggleBrand(brand.name);
                  }}
                  className={`relative group flex items-center gap-2 px-3 py-1.5 rounded-lg border transform transition-all duration-200 ease-out flex-shrink-0 hover:scale-105 hover:shadow-lg ${
                    active
                      ? 'border-[var(--primary)] bg-[var(--primary)] text-white shadow-md'
                      : isHeaderWhite
                        ? 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                        : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
                  }`}
                  aria-pressed={active}
                  aria-hidden={isDuplicate}
                  tabIndex={isDuplicate ? -1 : 0}
                >
                  {brand.logo_url ? (
                    <img
                      src={brand.logo_url}
                      alt={brand.name}
                      className="h-6 w-auto object-contain max-w-[60px] transition-transform duration-200 group-hover:scale-105"
                    />
                  ) : null}
                  <span
                    className={`text-xs font-bold whitespace-nowrap transition-colors duration-200 ${!active ? 'group-hover:text-[var(--primary)]' : ''}`}
                  >
                    {brand.name}
                  </span>
                </button>
              );
            }
          )}
        </div>
      </div>
    </div>
  );
}
export function StoreSidebar() {
  const {
    isFilterOpen,
    setIsFilterOpen,
    brands,
    selectedBrand,
    setSelectedBrand,
    favorites,
    showFavorites,
    setShowFavorites,
  } = useStore();
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
    let currentSelection: string[] = [];
    if (Array.isArray(selectedBrand)) currentSelection = [...selectedBrand];
    else if (selectedBrand && selectedBrand !== 'all')
      currentSelection = [selectedBrand as string];
    if (!Array.isArray(selectedBrand) && selectedBrand === 'all')
      currentSelection = [];
    const foundIndex = currentSelection.findIndex(
      (b) => normalized(b) === normalized(brand)
    );
    if (foundIndex >= 0)
      currentSelection = currentSelection.filter((_, i) => i !== foundIndex);
    else currentSelection.push(brand);
    if (currentSelection.length === 0) setSelectedBrand('all');
    else setSelectedBrand(currentSelection);
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
    <aside
      className={`
      fixed inset-y-0 left-0 w-80 bg-white shadow-2xl transform transition-transform duration-300 
      lg:translate-x-0 lg:static lg:shadow-none lg:block 
      z-30 flex-shrink-0 
      ${isFilterOpen ? 'translate-x-0 z-50' : '-translate-x-full'}
      ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
    `}
    >
      <div className="h-full overflow-y-auto p-4 custom-scrollbar relative">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute top-2 right-[-12px] z-10 bg-white border border-gray-200 rounded-full p-1 text-gray-500 hover:text-[var(--primary)] shadow-sm transition-colors"
          style={{
            right: isCollapsed ? '50%' : '0',
            transform: isCollapsed ? 'translateX(50%)' : 'none',
          }}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
        <div className="flex justify-between lg:hidden mb-6">
          <h3 className="font-bold text-xl text-gray-900">Filtrar</h3>
          <button onClick={() => setIsFilterOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6 sticky top-28 lg:top-32">
          <div className="space-y-1">
            {!isCollapsed && (
              <h3 className="font-bold text-sm uppercase tracking-wider mb-3 text-gray-900 animate-in fade-in">
                Navegue Por
              </h3>
            )}
            <button
              className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} w-full py-2 text-gray-600 hover:text-[var(--primary)] text-sm transition-colors rounded-lg hover:bg-gray-50`}
              title="Lançamentos"
            >
              <Zap size={14} />{' '}
              {!isCollapsed && <span className="font-medium">Lançamentos</span>}
            </button>
            <button
              className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} w-full py-2 text-gray-600 hover:text-[var(--primary)] text-sm transition-colors rounded-lg hover:bg-gray-50`}
              title="Mais Vendidos"
            >
              <Star size={14} />{' '}
              {!isCollapsed && (
                <span className="font-medium">Mais Vendidos</span>
              )}
            </button>
            <button
              onClick={() => setShowFavorites(!showFavorites)}
              className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} w-full py-2 text-sm transition-colors rounded-lg hover:bg-gray-50 ${showFavorites ? 'text-[var(--primary)] font-bold bg-gray-50' : 'text-gray-600 hover:text-[var(--primary)]'}`}
              title="Favoritos"
            >
              <Heart
                size={14}
                className={showFavorites ? 'fill-current' : ''}
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
                <h3 className="font-bold text-sm uppercase tracking-wider mb-3 text-gray-900 animate-in fade-in">
                  Marcas
                </h3>
              )}
              <div
                className={`space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar ${isCollapsed ? 'text-center' : ''}`}
              >
                <label
                  className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} cursor-pointer group select-none p-1 rounded hover:bg-gray-50`}
                  title="Todas"
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${isSelected('all') ? 'bg-[var(--primary)] border-[var(--primary)]' : 'border-gray-300 bg-white'}`}
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
                    className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} cursor-pointer group select-none p-1 rounded hover:bg-gray-50`}
                    title={brand}
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${isSelected(brand) ? 'bg-[var(--primary)] border-[var(--primary)]' : 'border-gray-300 bg-white'}`}
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
                      <span className="text-sm text-gray-600 group-hover:text-gray-900 truncate">
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
  );
}

export function StoreFooter() {
  const { store } = useStore();
  const router = useRouter();
  return (
    <footer className="bg-[var(--secondary)] border-t border-[var(--secondary)] pt-12 pb-6 mt-12 relative z-10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-1">
            <h4 className="font-bold text-lg mb-4 text-[var(--primary)]">
              {store.name}
            </h4>
            <p className="text-[var(--primary)] text-sm leading-relaxed">
              {store.footer_message || 'Sua loja de confiança.'}
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-3 text-[var(--primary)]">
              Atendimento
            </h4>
            <ul className="space-y-2 text-sm  text-white">
              <li>
                <a
                  href={whatsappHref(store.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-[var(--primary)]"
                >
                  <Phone size={14} className="inline" />
                  <span>{formatPhoneDisplay(store.phone)}</span>
                </a>
              </li>
              {store.email && (
                <li>
                  <Mail size={14} className="inline mr-2" /> {store.email}
                </li>
              )}
            </ul>
          </div>

          {/* Seção "Institucional" removida conforme solicitado */}

          <div>
            <h4 className="font-bold mb-3 text-[var(--primary)]">
              Acesso Restrito
            </h4>
            <ul className="space-y-2 text-sm text-white">
              <li>
                <button
                  onClick={() => router.push('/login')}
                  className="hover:text-[var(--primary)] transition-colors font-medium"
                >
                  Entrar
                </button>
              </li>
              {/* Acesso Vendedor removido conforme solicitado */}
            </ul>
          </div>
        </div>

        <div className="border-t pt-6 text-xs text-[var(--primary)] text-center">
          © {new Date().getFullYear()} {store.name}. Todos os direitos
          reservados. Powered by RepVendas.
        </div>
      </div>
    </footer>
  );
}
