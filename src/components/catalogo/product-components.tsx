'use client';

import NextImage from 'next/image';
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
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Image as ImageIcon } from 'lucide-react';
import { ProductCard } from './ProductCard';
import { useLayoutStore } from './store-layout';
import { PriceDisplay } from './PriceDisplay';

// --- Interfaces e Carousel mantidos iguais (omiti para brevidade, mantenha o código existente do Carousel e StoreBanners) ---
// ... (Copie o código do Carousel e StoreBanners do arquivo anterior, não houve mudança lá) ...

interface SlideData {
  id: number;
  imageUrl: string;
  linkUrl: string;
  altText: string;
}

interface CarouselProps {
  slides: SlideData[];
  interval?: number;
}

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
            <NextImage
              src={slide.imageUrl}
              alt={slide.altText}
              fill
              sizes="100vw"
              className="object-cover"
              priority={slide.id === 0}
            />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent pointer-events-none opacity-50" />
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <>
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
        </>
      )}
    </div>
  );
}

export function StoreBanners() {
  const { store } = useStore();
  if (!store.banners || store.banners.length === 0) return null;

  const slides: SlideData[] = store.banners.map((url, index) => ({
    id: index,
    imageUrl: url,
    linkUrl: '#',
    altText: `Banner Promocional ${index + 1}`,
  }));

  return (
    <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 mt-6">
      <div className="w-full aspect-[21/9] md:aspect-[3/1] lg:aspect-[4/1] relative overflow-hidden rounded-2xl shadow-sm bg-gray-100">
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
    isPricesVisible,
  } = useStore();

  const { toggleSidebar } = useLayoutStore();

  const isOutOfStock = (product: any) => {
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
            onClick={toggleSidebar}
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
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 hidden xl:inline">
              Ordenar:
            </span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="p-2 border-none bg-transparent text-sm font-medium text-gray-900 outline-none cursor-pointer hover:bg-gray-50 rounded-lg"
            >
              <option value="name">Nome (A-Z)</option>
              <option value="price_asc">Menor Preço</option>
              <option value="price_desc">Maior Preço</option>
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
            // --- GRID: FORÇANDO 5 COLUNAS EM LG ---
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6">
              {displayProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  storeSettings={{
                    primary_color: store.primary_color || '#4f46e5', // Fallback: Indigo-600
                    show_installments: !!store.show_installments,
                    max_installments: store.max_installments || 1,
                    show_cash_discount: !!store.show_discount_tag,
                    cash_price_discount_percent:
                      store.cash_price_discount_percent || 0,
                    show_cost_price: !!store.show_cost_price,
                    show_sale_price: !!store.show_sale_price,
                  }}
                  isFavorite={favorites.includes(product.id)}
                  isPricesVisible={isPricesVisible}
                  onAddToCart={(p) => addToCart(p)}
                  onToggleFavorite={(id) => toggleFavorite(id)}
                  onViewDetails={(p) => setModal('product', p)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {displayProducts.map((product) => {
                const outOfStock = isOutOfStock(product);
                return (
                  <div
                    key={product.id}
                    onClick={() => setModal('product', product)}
                    className={`bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 flex overflow-hidden group cursor-pointer relative ${outOfStock ? 'opacity-80' : ''}`}
                  >
                    <div className="w-32 sm:w-48 aspect-square sm:aspect-auto flex-shrink-0 bg-white relative border-r border-gray-100">
                      {outOfStock && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
                          <span className="bg-gray-800 text-white px-2 py-1 rounded text-[10px] font-bold shadow flex gap-1 items-center">
                            <Archive size={12} /> ESGOTADO
                          </span>
                        </div>
                      )}
                      {product.image_url ? (
                        <NextImage
                          src={product.image_url}
                          alt={product.name}
                          fill
                          sizes="192px"
                          style={{ objectFit: 'contain' }}
                          className="p-4 group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <ImageIcon size={32} />
                        </div>
                      )}
                      {product.is_launch && (
                        <span className="absolute top-2 left-2 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
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
