'use client';

import Image from 'next/image';
import { getProductImageUrl } from '@/lib/imageUtils';
import { useStore } from '@/components/catalogo/store-context';
import {
  Search,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  SlidersHorizontal,
  Archive,
  Heart,
  Image as ImageIcon,
  ImageOff,
} from 'lucide-react';
import { LazyProductImage } from '@/components/ui/LazyProductImage';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { ProductCard } from '@/components/catalogo/ProductCard';
import ProductCardSkeleton from '@/components/catalogo/ProductCardSkeleton';
import { useLayoutStore } from '@/components/catalogo/store-layout';
import { PriceDisplay } from '@/components/catalogo/PriceDisplay';
import { Product } from '@/lib/types'; // Importando tipo centralizado

// --- Interfaces ---
interface SlideData {
  id: number;
  imageUrl: string;
  linkUrl: string;
  altText: string;
}

export function CategoryBar() {
  const {
    categories = [],
    selectedCategory,
    setSelectedCategory,
    initialProducts = [],
  } = useStore();
  const displayCategories = useMemo(() => {
    if (categories && categories.length > 0) {
      return categories.map((c: any) =>
        typeof c === 'string' ? c : c?.name || String(c)
      );
    }
    const fromProducts = Array.from(
      new Set(initialProducts.map((p: Product) => p.category).filter(Boolean))
    );
    return fromProducts;
  }, [categories, initialProducts]);

  if (!displayCategories || displayCategories.length === 0) return null;

  return (
    <div className="w-full bg-white border-b border-gray-100 py-3">
      <div className="max-w-[1920px] mx-auto px-4 lg:px-8 flex items-center gap-3 overflow-x-auto scrollbar-hide">
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 shrink-0 border-r border-gray-200 pr-3">
          Filtrar Por
        </span>

        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
            selectedCategory === 'all'
              ? 'bg-gray-900 text-white border-gray-900 shadow-md'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
          }`}
        >
          Ver Tudo
        </button>

        {displayCategories.map((cat: string) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
              selectedCategory === cat
                ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}

interface CarouselProps {
  slides: SlideData[];
  interval?: number;
}

// --- Componente Carrossel ---
function Carousel({ slides, interval = 5000 }: CarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  }, [slides.length]);

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      nextSlide();
    }, interval);
    return () => clearInterval(timer);
  }, [nextSlide, interval, isPaused]);

  if (slides.length === 0) return null;

  return (
    <div
      className="relative w-full h-full overflow-hidden group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className="flex w-full h-full transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {slides.map((slide) => (
          <div
            key={slide.id}
            className="min-w-full w-full h-full relative flex-shrink-0"
          >
            {String(slide.imageUrl).startsWith('http') &&
            !String(slide.imageUrl).includes('supabase.co/storage') ? (
              <img
                src={slide.imageUrl}
                alt={slide.altText}
                className="absolute inset-0 w-full h-full object-cover"
                loading={slide.id === 0 ? 'eager' : 'lazy'}
              />
            ) : (
              <Image
                src={slide.imageUrl}
                alt={slide.altText}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1920px) 90vw, 1920px"
                className="object-cover"
                priority={slide.id === 0}
                unoptimized={String(slide.imageUrl).includes(
                  'supabase.co/storage'
                )}
              />
            )}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent pointer-events-none opacity-50" />
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevSlide();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/20 hover:bg-black/50 backdrop-blur-sm text-white z-20 opacity-0 group-hover:opacity-100 transition-all border border-white/30"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              nextSlide();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/20 hover:bg-black/50 backdrop-blur-sm text-white z-20 opacity-0 group-hover:opacity-100 transition-all border border-white/30"
          >
            <ChevronRight size={24} />
          </button>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 rounded-full transition-all shadow-sm ${idx === currentSlide ? 'bg-white w-8' : 'bg-white/50 w-2 hover:bg-white/80'}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Container de Banners ---
export function StoreBanners() {
  const { store, selectedBrand } = useStore();
  const [isMobile, setIsMobile] = useState(false);
  const { brandsWithLogos } = useStore();

  // Detectar mobile no client-side
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Verifica se existem banners (comuns ou mobile)
  const hasBanners = store.banners && store.banners.length > 0;
  const hasMobileBanners =
    store.banners_mobile && store.banners_mobile.length > 0;

  // Se não houver nenhum banner, não renderiza
  if (!hasBanners && !hasMobileBanners) return null;
  // If a brand is selected, show the brand-specific banner/description instead
  if (selectedBrand && selectedBrand !== 'all') {
    const normalize = (s: unknown) =>
      String(s || '')
        .trim()
        .toLowerCase();
    const findName = Array.isArray(selectedBrand)
      ? (selectedBrand[0] as string)
      : (selectedBrand as string);
    const brandObj = (brandsWithLogos || []).find(
      (b: any) => normalize(b.name) === normalize(findName)
    );
    // If we don't have a brand object, fall back to the main store banners
    // (do not hide the carousel). If we have a brand object, render its
    // banner or a compact header as fallback.
    if (!brandObj) {
      // No metadata for this brand in `brandsWithLogos` — let the function
      // continue and render the normal store banners below.
    } else {
      const bannerUrl = brandObj.banner_url;

      if (bannerUrl) {
        return (
          <div className="w-full">
            <div className="w-full aspect-[4/1] min-h-[160px] md:min-h-[200px] relative overflow-hidden bg-gray-100 rounded-md">
              <Image
                src={bannerUrl}
                alt={brandObj.name || 'Banner da Marca'}
                fill
                sizes="100vw"
                className="object-cover"
                unoptimized={String(bannerUrl).includes('supabase.co/storage')}
              />
              {brandObj.description ? (
                <div className="absolute left-6 bottom-6 bg-black/60 text-white px-4 py-2 rounded-md max-w-xl">
                  <h3 className="font-bold text-sm">{brandObj.name}</h3>
                  <p className="text-xs mt-1 line-clamp-2">
                    {brandObj.description}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        );
      }

      // No banner image: render compact brand header with logo/initials and
      // optional description. This will appear above the products but will not
      // hide the main carousel area elsewhere.
      return (
        <div className="w-full">
          <div className="max-w-[1920px] mx-auto px-4 lg:px-8 py-4 flex items-center gap-4 bg-white rounded-md shadow-sm">
            <div className="flex-shrink-0">
              {brandObj.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={brandObj.logo_url}
                  alt={brandObj.name}
                  className="w-40 h-20 object-contain"
                />
              ) : (
                <div className="w-40 h-20 bg-gray-100 flex items-center justify-center font-bold text-lg text-gray-700">
                  {brandObj.name
                    ?.split(' ')
                    .map((s: string) => s[0])
                    .slice(0, 2)
                    .join('')}
                </div>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">{brandObj.name}</h3>
              {brandObj.description && (
                <p className="text-sm text-gray-600 mt-1">
                  {brandObj.description}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }
  }

  // 📱 Lógica de seleção de banners:
  // - Mobile E tem banners_mobile configurados → usa banners_mobile
  // - Caso contrário (desktop OU mobile sem banners específicos) → usa banners desktop
  // - Se não houver banner mobile, o desktop é automaticamente usado no mobile (fallback)
  const activeBanners =
    isMobile && hasMobileBanners ? store.banners_mobile : store.banners || [];

  // Mapeia apenas os banners que foram feitos upload (1, 2, 3... N banners)
  // Não é obrigatório ter 5 banners - renderiza quantos existirem
  const slides: SlideData[] = (activeBanners || []).map((url, index) => ({
    id: index,
    imageUrl: url, // URL já normalizada pelo store-context
    linkUrl: '#',
    altText: `Banner Promocional ${index + 1}`,
  }));

  // Se não houver slides após o mapeamento, não renderiza
  if (slides.length === 0) return null;

  return (
    <div className="w-full">
      <div className="w-full aspect-[3/1] md:aspect-[4/1] lg:aspect-[5/1] min-h-[180px] md:min-h-[220px] relative overflow-hidden bg-gray-100">
        <Carousel slides={slides} interval={5000} />
      </div>
    </div>
  );
}

// --- Grade de Produtos ---
export function ProductGrid() {
  const {
    displayProducts,
    totalProducts,
    currentPage,
    totalPages,
    setCurrentPage,
    toggleFavorite,
    favorites,
    addToCart,
    setModal,
    isFilterOpen,
    setIsFilterOpen,
    sortOrder,
    setSortOrder,
    store,
    viewMode,
    setViewMode,
    hideImages,
    setHideImages,
    imagePriorityCount,
    imageSizes,
    isPricesVisible,
    isLoadingSearch,
  } = useStore();

  const { toggleSidebar } = useLayoutStore();

  // Tipagem corrigida de 'any' para 'Product'
  const isOutOfStock = (product: Product) => {
    if (!store.enable_stock_management) return false;
    if (store.global_allow_backorder) return false;
    return (product.stock_quantity || 0) <= 0;
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {isFilterOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsFilterOpen(false)}
        />
      )}

      {/* Barra de Controle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <p className="text-sm text-gray-600">
            Mostrando <strong>{displayProducts.length}</strong> de{' '}
            <strong>{totalProducts}</strong> produtos
          </p>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFilterOpen(true)}
            className="lg:hidden ml-4"
            leftIcon={<SlidersHorizontal size={16} />}
          >
            Filtros
          </Button>
        </div>

        <div className="flex items-center gap-4 self-end sm:self-auto">
          <div className="flex gap-1 border-r border-gray-200 pr-4">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-gray-100 text-[var(--primary)]' : 'text-gray-400 hover:text-gray-600'}`}
              title="Grade"
            >
              <LayoutGrid size={20} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-gray-100 text-[var(--primary)]' : 'text-gray-400 hover:text-gray-600'}`}
              title="Lista"
            >
              <List size={20} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-gray-100 text-[var(--primary)]' : 'text-gray-400 hover:text-gray-600'}`}
              title="Tabela Compacta"
            >
              <SlidersHorizontal size={20} />
            </button>
          </div>

          <div className="flex items-center gap-2 pl-3">
            <button
              onClick={() => setHideImages(!hideImages)}
              className={`p-2 rounded-lg transition-all ${hideImages ? 'bg-amber-100 text-[var(--primary)]' : 'text-gray-400 hover:text-gray-600'}`}
              title={hideImages ? 'Mostrar Fotos' : 'Ocultar Fotos'}
            >
              {hideImages ? <ImageOff size={18} /> : <ImageIcon size={18} />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 hidden xl:inline">
              Ordenar:
            </span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="p-2 border-none bg-transparent text-sm font-medium text-gray-900 outline-none cursor-pointer hover:bg-gray-50 rounded-lg"
            >
              <option value="name">Nome (A-Z)</option>
              <option value="price_asc">Menor Preço</option>
              <option value="price_desc">Maior Preço</option>
              <option value="ref_asc">Referência (A-Z)</option>
              <option value="ref_desc">Referência (Z-A)</option>
              <option value="created_desc">Lançamentos</option>
            </select>
          </div>
        </div>
      </div>

      {displayProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-dashed border-gray-200">
          <div className="p-4 bg-gray-50 rounded-full mb-4">
            <Search size={40} className="text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            Nenhum produto encontrado
          </h3>
          <p className="text-gray-500 text-sm mt-1">
            Tente ajustar seus filtros de busca.
          </p>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6">
              {isLoadingSearch
                ? Array.from({ length: 8 }).map((_, i) => (
                    <ProductCardSkeleton key={`skeleton-${i}`} />
                  ))
                : displayProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      storeSettings={store}
                      isFavorite={favorites.includes(product.id)}
                      isPricesVisible={isPricesVisible}
                      onAddToCart={(p) => addToCart(p)}
                      onToggleFavorite={(id) => toggleFavorite(id)}
                      onViewDetails={(p) => setModal('product', p)}
                    />
                  ))}
            </div>
          ) : viewMode === 'table' ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    <th className="px-4 py-3">Referência</th>
                    <th className="px-4 py-3">Produto / Marca</th>
                    <th className="px-4 py-3 text-right">Preço</th>
                    <th className="px-4 py-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {displayProducts.map((product) => {
                    const outOfStock = isOutOfStock(product);
                    return (
                      <tr key={product.id} className="hover:bg-blue-50/30 transition-colors group cursor-pointer">
                        <td className="px-4 py-2 align-middle font-mono text-xs text-gray-400">{product.reference_code || '-'}</td>
                        <td className="px-4 py-2 align-middle">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-900 group-hover:text-[var(--primary)]">{product.name}</span>
                            <span className="text-[10px] uppercase font-medium text-gray-400">{product.brand}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 align-middle text-right">
                          <PriceDisplay value={product.price} isPricesVisible={isPricesVisible} size="small" />
                        </td>
                        <td className="px-4 py-2 align-middle text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={(e) => { e.stopPropagation(); if (!outOfStock) addToCart(product); }} title="Adicionar" className="p-2 text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white rounded-lg transition-all">
                              <ShoppingCart size={16} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setModal('product', product); }} title="Ver detalhes" className="p-2 text-gray-400 hover:text-gray-600">
                              <Search size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            // --- MODO LISTA ---
            <div className="flex flex-col gap-4">
              {displayProducts.map((product) => {
                const outOfStock = isOutOfStock(product);
                return (
                  <div
                    key={product.id}
                    onClick={() => setModal('product', product)}
                    className={`bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 flex overflow-hidden group cursor-pointer relative ${outOfStock ? 'opacity-80' : ''}`}
                  >
                    <div className="w-32 sm:w-48 aspect-square sm:aspect-auto flex-shrink-0 bg-gray-50 relative border-r border-gray-100">
                      {outOfStock && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
                          <span className="bg-gray-800 text-white px-2 py-1 rounded text-[10px] font-bold shadow flex gap-1 items-center">
                            <Archive size={12} /> ESGOTADO
                          </span>
                        </div>
                      )}
                      {(() => {
                        const { src, isExternal } = getProductImageUrl(
                          product as any
                        );
                        if (src) {
                          if (isExternal) {
                            return (
                              <div className="w-full h-full">
                                <LazyProductImage
                                  src={src}
                                  alt={product.name}
                                  className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                                  fallbackSrc="/images/default-logo.png"
                                />
                              </div>
                            );
                          }

                          return (
                            <Image
                              src={src}
                              alt={product.name}
                              fill
                              sizes="192px"
                              className="object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                            />
                          );
                        }

                        return (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <img
                              src="/api/proxy-image?url=https%3A%2F%2Faawghxjbipcqefmikwby.supabase.co%2Fstorage%2Fv1%2Fobject%2Fpublic%2Fimages%2Fproduct-placeholder.svg&fmt=webp&q=70"
                              alt="Sem imagem"
                              className="w-16 h-16 object-contain opacity-80"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src =
                                  '/images/default-logo.png';
                              }}
                            />
                          </div>
                        );
                      })()}

                      {product.is_launch && (
                        <span className="absolute top-2 left-2 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                          Novo
                        </span>
                      )}
                    </div>

                    <div className="flex-1 p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">
                            {product.brand || 'Genérico'}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(product.id);
                            }}
                            className="text-gray-300 hover:text-red-500 sm:hidden p-1"
                          >
                            <Heart
                              size={18}
                              className={
                                favorites.includes(product.id)
                                  ? 'fill-red-500 text-red-500'
                                  : ''
                              }
                            />
                          </button>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 group-hover:text-[var(--primary)] transition-colors truncate">
                          {product.name}
                        </h3>
                        {product.description && (
                          <p className="text-sm text-gray-500 line-clamp-2 mb-3 max-w-xl hidden sm:block">
                            {product.description}
                          </p>
                        )}
                        {product.reference_code && (
                          <p className="text-xs text-gray-400 font-mono">
                            Ref: {product.reference_code}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-4 sm:min-w-[160px] border-t sm:border-t-0 border-gray-100 pt-3 sm:pt-0 mt-auto sm:mt-0">
                        <div className="text-right">
                          <PriceDisplay
                            value={product.price}
                            size="large"
                            isPricesVisible={isPricesVisible}
                          />
                        </div>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!outOfStock) addToCart(product);
                          }}
                          disabled={outOfStock}
                          variant="primary"
                          className="w-full sm:w-auto shadow-md"
                          leftIcon={<ShoppingCart size={16} />}
                        >
                          {outOfStock ? 'Indisponível' : 'Adicionar'}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-10 flex justify-center items-center gap-4 py-6">
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentPage(currentPage - 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={currentPage === 1}
                className="w-10 h-10 p-0 rounded-full"
              >
                <ChevronLeft size={20} />
              </Button>
              <span className="text-sm font-medium text-gray-600 bg-white px-4 py-2 rounded-lg border border-gray-100 shadow-sm">
                Página{' '}
                <span className="font-bold text-gray-900">{currentPage}</span>{' '}
                de {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentPage(currentPage + 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={currentPage === totalPages}
                className="w-10 h-10 p-0 rounded-full"
              >
                <ChevronRight size={20} />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
