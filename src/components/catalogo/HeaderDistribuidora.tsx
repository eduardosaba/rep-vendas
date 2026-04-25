"use client"

import Link from 'next/link'
import { ShoppingBag, Users2, Heart, Lock, EyeOff, Download, ShoppingCart } from 'lucide-react'
import React from 'react'
// Fallback module-scoped secondary color to avoid ReferenceError from older HMR bundles
let secondaryColor: string = '#0f172a';
import { usePathname } from 'next/navigation'
import { useStore } from './store-context'

export function HeaderDistribuidora({ slug, repSlug, repName, companyLogo, companyName, institutional, companyPages, topBenefitConfig, primaryColor, headerBackgroundColor, headerTextColor, headerIconBgColor, headerIconColor, showCostPrice, showSalePrice, priceUnlockMode, pricePasswordHash, store: storeFromProps }: any) {
  const {
    cart,
    favorites,
    showFavorites,
    setShowFavorites,
    isPricesVisible,
    lockPrices,
    setModal,
    store: storeFromContext,
  } = useStore();

  const baseUrl = institutional
    ? `/catalogo/${slug}/empresa`
    : `/catalogo/${slug}${repSlug ? `/${repSlug}` : ''}`
  // Para institucional, apontar Nossa História para a página CMS dentro de `/empresa/p/sobre`
  // assim o conteúdo carrega no mesmo layout children da seção empresa.
  const sobreHref = institutional ? `${baseUrl}/p/sobre` : `${baseUrl}/sobre`
  const pathname = usePathname() || ''
  const dynamicPages = Array.isArray(companyPages) ? companyPages : []

  const isTruthyFlag = (v: any) => v === true || v === 'true' || v === 1 || v === '1';
  // Prefer props from page merge (companyEffective) -> then store context
  const effectiveShowCost = typeof showCostPrice !== 'undefined' ? showCostPrice : storeFromProps?.show_cost_price ?? storeFromContext?.show_cost_price;
  const effectiveShowSale = typeof showSalePrice !== 'undefined' ? showSalePrice : storeFromProps?.show_sale_price ?? storeFromContext?.show_sale_price;
  const hasRestrictedPriceFlow = isTruthyFlag(effectiveShowCost) && !isTruthyFlag(effectiveShowSale);
  const barSource = topBenefitConfig || storeFromProps || storeFromContext || {};
  const showTopBenefitBar = isTruthyFlag(barSource?.show_top_benefit_bar);
  const topBenefitMode = String(barSource?.top_benefit_mode || '').toLowerCase() === 'marquee' ? 'marquee' : 'static';
  const topBenefitSpeed = String(barSource?.top_benefit_speed || '').toLowerCase() === 'slow'
    ? 'slow'
    : String(barSource?.top_benefit_speed || '').toLowerCase() === 'fast'
      ? 'fast'
      : 'medium';
  const topBenefitAnimation = String(barSource?.top_benefit_animation || '').toLowerCase() === 'scroll_right'
    ? 'scroll_right'
    : String(barSource?.top_benefit_animation || '').toLowerCase() === 'alternate'
      ? 'alternate'
      : 'scroll_left';
  const topBenefitHeight = Number(barSource?.top_benefit_height) || 34;
  const topBenefitTextSize = Number(barSource?.top_benefit_text_size) || 11;
  const topBenefitBgColor = (barSource?.top_benefit_bg_color as string) || primaryColor || 'var(--primary)';
  const topBenefitTextColor = (barSource?.top_benefit_text_color as string) || headerTextColor || '#ffffff';
  const topBenefitText = String(barSource?.top_benefit_text || '').trim();
  const topBenefitParts = (topBenefitText ? topBenefitText.split('/') : ['Confira nossas ofertas'])
    .map((v) => v.trim())
    .filter(Boolean);
  const topBenefitItems = [...topBenefitParts, ...topBenefitParts];
  const topBenefitDuration = topBenefitSpeed === 'slow' ? 35 : topBenefitSpeed === 'fast' ? 14 : 25;

  // debug removed

  const cartCount = Array.isArray(cart)
    ? cart.reduce((acc: number, item: any) => acc + (item?.quantity || 0), 0)
    : 0;

  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toRgba = (input: string | undefined | null, alpha: number) => {
    const fallback = `rgba(255,255,255,${alpha})`;
    if (!input) return fallback;
    const s = String(input).trim();
    // if input looks like a CSS var (e.g. 'var(--header-bg)') try to resolve it
    if (s.startsWith('var(')) {
      try {
        if (typeof window === 'undefined' || typeof getComputedStyle !== 'function') return fallback;
        const val = getComputedStyle(document.documentElement).getPropertyValue(s.replace(/^var\(|\)$/g, '')).trim();
        if (val) return toRgba(val, alpha);
      } catch (e) {
        return fallback;
      }
    }
    if (s.startsWith('#')) {
      const hex = s.replace('#', '');
      const bigint = parseInt(hex.length === 3 ? hex.split('').map((c: string) => c + c).join('') : hex, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `rgba(${r},${g},${b},${alpha})`;
    }
    if (s.startsWith('rgba')) {
      return s.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, `rgba($1,$2,$3,${alpha})`);
    }
    if (s.startsWith('rgb(')) {
      return s.replace('rgb(', 'rgba(').replace(')', `,${alpha})`);
    }
    return s; // best-effort for named colors
  };

  // Resolve CSS variables (var(--...)) and parse common color formats to RGB
  const resolveCssColor = (s?: string | null) => {
    if (!s) return null;
    const str = String(s).trim();
    if (str.startsWith('var(')) {
      try {
        const prop = str.replace(/^var\(|\)$/g, '');
        const val = typeof window !== 'undefined' ? getComputedStyle(document.documentElement).getPropertyValue(prop).trim() : '';
        return val || null;
      } catch (e) {
        return null;
      }
    }
    return str || null;
  };

  const parseToRgb = (s?: string | null) => {
    const v = resolveCssColor(s);
    if (!v) return null;
    const mRgb = v.match(/rgba?\s*\(([^)]+)\)/i);
    if (mRgb) {
      const parts = mRgb[1].split(',').map((p) => p.trim());
      const r = Number(parts[0]) || 0;
      const g = Number(parts[1]) || 0;
      const b = Number(parts[2]) || 0;
      return { r, g, b };
    }
    const mHex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (mHex) {
      let hex = mHex[1];
      if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
      const bigint = parseInt(hex, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return { r, g, b };
    }
    return null;
  };

  const isColorDark = (input?: string | null) => {
    try {
      const rgb = parseToRgb(input);
      if (!rgb) return false;
      const sr = rgb.r / 255;
      const sg = rgb.g / 255;
      const sb = rgb.b / 255;
      const R = sr <= 0.03928 ? sr / 12.92 : Math.pow((sr + 0.055) / 1.055, 2.4);
      const G = sg <= 0.03928 ? sg / 12.92 : Math.pow((sg + 0.055) / 1.055, 2.4);
      const B = sb <= 0.03928 ? sb / 12.92 : Math.pow((sb + 0.055) / 1.055, 2.4);
      const lum = 0.2126 * R + 0.7152 * G + 0.0722 * B;
      return lum < 0.5;
    } catch (e) {
      return false;
    }
  };

  // compute header text color for sufficient contrast against background
  const computedHeaderTextColor = headerTextColor || (isColorDark(headerBackgroundColor || primaryColor) ? '#ffffff' : '#1b1b1b');

  const isActive = (href: string) => {
    try {
      return pathname === href || pathname.startsWith(href + '/')
    } catch (e) {
      return false
    }
  }

  const secondaryColor = String((storeFromProps && storeFromProps.secondary_color) || storeFromContext?.secondary_color || '#0f172a');

  return (
    <header
      className="fixed top-0 inset-x-0 z-[120] backdrop-blur-lg border-b border-slate-100 transition-colors duration-300"
      style={{
        backgroundColor: toRgba(
          headerBackgroundColor || primaryColor || '#1b1b1b',
          scrolled ? 0.75 : 0.95
        ),
        color: computedHeaderTextColor,
      }}
    >
      {showTopBenefitBar ? (
        <div className="w-full relative overflow-hidden" style={{ backgroundColor: topBenefitBgColor, color: topBenefitTextColor }}>
          <div className="max-w-[1920px] mx-auto px-4 lg:px-8 flex items-center" style={{ height: `${topBenefitHeight}px` }}>
            {topBenefitMode === 'marquee' ? (
              <div className="flex-1 overflow-hidden whitespace-nowrap">
                <div
                  className="inline-flex min-w-full w-max items-center"
                  style={{
                    fontSize: `${topBenefitTextSize}px`,
                    animationName: topBenefitAnimation === 'scroll_right' ? 'rv-top-benefit-marquee-right' : 'rv-top-benefit-marquee-left',
                    animationDuration: `${topBenefitDuration}s`,
                    animationTimingFunction: topBenefitAnimation === 'alternate' ? 'ease-in-out' : 'linear',
                    animationIterationCount: 'infinite',
                    animationDirection: topBenefitAnimation === 'alternate' ? 'alternate' : 'normal',
                  }}
                >
                  {topBenefitItems.map((item, idx) => (
                    <span key={`${item}-${idx}`} className="inline-flex items-center px-6 text-[11px] font-black uppercase tracking-widest">
                      {item}
                      <span className="mx-4 opacity-80">/</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 text-sm font-black overflow-hidden truncate" style={{ fontSize: `${topBenefitTextSize}px` }}>
                {topBenefitText}
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className="px-4 lg:px-8 py-3 md:py-4">
      <div className="max-w-[1920px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-10">
          <Link href={baseUrl}>
            {
              (() => {
                const candidate = companyLogo || (storeFromProps && (storeFromProps.logo_url || (storeFromProps as any).single_brand_logo_url)) || (storeFromContext && (storeFromContext.logo_url || (storeFromContext as any).single_brand_logo_url));
                const normalize = (s?: string | null) => {
                  if (!s) return null;
                  const str = String(s).trim();
                  if (!str) return null;
                  if (/^https?:\/\//i.test(str)) return str;
                  if (str.startsWith('/')) return str;
                  return `/${str}`;
                };
                const src = normalize(candidate) || '/repvendas.png';
                // debug removed
                return <img src={src} alt={companyName} className="h-10 hover:opacity-80 transition-opacity" />;
              })()
            }
          </Link>

          <nav className="flex items-center gap-3 md:gap-4 overflow-x-auto no-scrollbar">
            <NavLink href={baseUrl} label="Produtos" icon={<ShoppingBag size={14} />} active={isActive(baseUrl)} primaryColor={primaryColor} secondaryColor={secondaryColor} />
            {dynamicPages.map((page: any) => (
              <NavLink
                key={page.slug}
                href={`${baseUrl}/p/${page.slug}`}
                label={page.title}
                icon={<Users2 size={14} />}
                active={isActive(`${baseUrl}/p/${page.slug}`)}
                primaryColor={primaryColor}
                secondaryColor={secondaryColor}
              />
            ))}
            {/* Sempre mostrar Nossa História como link adicional de fallback/rápido acesso */}
            <NavLink href={sobreHref} label="Nossa História" icon={<Users2 size={14} />} active={isActive(sobreHref)} primaryColor={primaryColor} secondaryColor={secondaryColor} />
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFavorites(!showFavorites)}
              className={`p-3 rounded-xl border transition-colors ${showFavorites ? 'text-red-500 border-red-200 bg-s-50' : 'border-slate-800 shadow-lg hover:scale-105 transition-transform relativehover:bg-slate-50'}`}
              style={{ backgroundColor: headerIconBgColor || undefined, color: headerIconColor || primaryColor || undefined }}
              aria-label="Favoritos"
            >
              <div className="relative">
                <Heart size={18} className={showFavorites ? 'fill-current' : ''} />
                {Array.isArray(favorites) && favorites.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] h-4 w-4 flex items-center justify-center rounded-full font-black">
                    {favorites.length > 99 ? '99+' : favorites.length}
                  </span>
                )}
              </div>
            </button>

            {hasRestrictedPriceFlow && (
              <button
                onClick={() => (isPricesVisible ? lockPrices() : setModal('password', true))}
                className="p-3 rounded-xl border border-slate-800 shadow-lg hover:scale-105 transition-transform relative hover:bg-slate-50 transition-colors"
                style={{ backgroundColor: headerIconBgColor || undefined, color: headerIconColor || primaryColor || undefined }}
                aria-label={isPricesVisible ? 'Ocultar preços' : 'Ver preços'}
              >
                {isPricesVisible ? <EyeOff size={18} className="text-red-500" /> : <Lock size={18} />}
              </button>
            )}

            <button
              onClick={() => setModal('load', true)}
              className="p-3 rounded-xl border border-slate-800 shadow-lg hover:scale-105 transition-transform relative hover:bg-slate-50 transition-colors"
              style={{ backgroundColor: headerIconBgColor || undefined, color: headerIconColor || primaryColor || undefined }}
              aria-label="Pedidos"
            >
              <Download size={18} />
            </button>
          </div>

          <div className="hidden sm:block text-right mr-4">
            <p className="text-[9px] font-black uppercase tracking-widest opacity-70">Representante Oficial</p>
            <p className="text-sm font-bold italic text-current">{repName || repSlug || 'Consultor'}</p>
          </div>

          <button
            onClick={() => setModal('cart', true)}
            className="text-white p-4 rounded-2xl shadow-lg hover:scale-105 transition-transform relative"
            style={{ backgroundColor: headerIconBgColor || undefined, color: headerIconColor || primaryColor || undefined }}
            aria-label="Carrinho"
          >
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-white text-[var(--primary)] text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-black">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
      </div>

      <style jsx>{`
        @keyframes rv-top-benefit-marquee-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        @keyframes rv-top-benefit-marquee-right {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0);
          }
        }
      `}</style>
    </header>
  )
}

function NavLink({ href, label, icon, active, primaryColor, secondaryColor }: { href: string; label: string; icon: any; active?: boolean; primaryColor?: string; secondaryColor?: string }) {
  const activeStyle = active ? { backgroundColor: primaryColor || 'var(--primary)', color: secondaryColor || 'var(--secondary)' } : undefined;
  const iconClass = active ? undefined : 'text-current group-hover:text-[var(--primary)]';
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 text-[11px] font-black uppercase tracking-widest transition-colors group ${
        active ? 'px-3 py-2 rounded-2xl shadow-lg' : 'text-current hover:text-[var(--primary)]'
      }`}
      
      style={activeStyle}
    >
      <span className={iconClass} style={active ? { color: secondaryColor } : undefined}>{icon}</span>
      {label}
    </Link>
  )
}

export default HeaderDistribuidora
