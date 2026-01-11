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
  Package,
} from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { ProductCard } from './ProductCard';
import { PriceDisplay } from './PriceDisplay';

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
    if (isPaused || slides.length <= 1) return;
    const timer = setInterval(nextSlide, interval);
    return () => clearInterval(timer);
  }, [nextSlide, interval, isPaused, slides.length]);

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
        {slides.map((slide, index) => (
          <div key={slide.id} className="w-full flex-shrink-0 relative h-full">
            <NextImage
              src={slide.imageUrl}
              alt={slide.altText}
              fill
              sizes="100vw"
              className="object-cover"
              // O primeiro slide deve ter prioridade máxima para SEO e LCP
              priority={index === 0}
              quality={90}
              // Para evitar erros do otimizador com alguns hosts, não
              // encaminhamos pela pipeline do Next.js para imagens do
              // Supabase Storage (servimos direto). Isso evita 400s upstream.
              unoptimized={slide.imageUrl.includes('supabase.co/storage')}
            />
            <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
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
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/20 hover:bg-black/50 backdrop-blur-md text-white z-20 opacity-0 group-hover:opacity-100 transition-all border border-white/20"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              nextSlide();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/20 hover:bg-black/50 backdrop-blur-md text-white z-20 opacity-0 group-hover:opacity-100 transition-all border border-white/20"
          >
            <ChevronRight size={24} />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentSlide
                    ? 'bg-white w-6'
                    : 'bg-white/40 w-1.5 hover:bg-white/60'
                }`}
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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const activeBanners = useMemo(() => {
    const hasMobileBanners =
      store.banners_mobile && store.banners_mobile.length > 0;
    return isMobile && hasMobileBanners ? store.banners_mobile : store.banners;
  }, [isMobile, store.banners, store.banners_mobile]);

  if (!activeBanners || activeBanners.length === 0) return null;

  const slides: SlideData[] = activeBanners.map((url, index) => ({
    id: index,
    imageUrl: url,
    linkUrl: '#',
    altText: `Destaque ${index + 1}`,
  }));

  return (
    <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 mt-4 md:mt-6">
      <div className="w-full aspect-[16/7] md:aspect-[21/7] lg:aspect-[4/1] relative overflow-hidden rounded-2xl shadow-sm bg-gray-100 border border-gray-100">
        <Carousel slides={slides} />
      </div>
    </div>
  );
}

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

  const ITEMS_PER_PAGE = 24;

  // Memoizamos a lista paginada para evitar renders pesados durante scroll
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return displayProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [displayProducts, currentPage]);

  const isOutOfStock = (product: any) => {
    if (!store.enable_stock_management) return false;
    return (product.stock_quantity || 0) <= 0;
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
      {/* Overlay mobile para filtros */}
      {isFilterOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsFilterOpen(false)}
        />
      )}

      {/* Barra de Ferramentas (Ordenação e ViewMode) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-3 md:p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between w-full sm:w-auto px-1">
          <p className="text-xs md:text-sm text-gray-500">
            Exibindo{' '}
            <span className="font-bold text-secondary">
              {paginatedProducts.length}
            </span>{' '}
            de <span className="font-bold text-secondary">{totalProducts}</span>{' '}
            itens
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFilterOpen(true)}
            className="lg:hidden ml-4 rounded-xl border-gray-200"
            leftIcon={<SlidersHorizontal size={16} />}
          >
            Filtrar
          </Button>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <List size={18} />
            </button>
          </div>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="p-2.5 bg-gray-50 border border-gray-100 text-xs md:text-sm font-bold text-secondary outline-none cursor-pointer rounded-xl hover:bg-gray-100 transition-colors"
          >
            <option value="name">Organizar: A-Z</option>
            <option value="price_asc">Menor Preço</option>
            <option value="price_desc">Maior Preço</option>
          </select>
        </div>
      </div>

      {/* Grid de Produtos */}
      {displayProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border border-dashed border-gray-200">
          <div className="p-6 bg-gray-50 rounded-full mb-4 text-gray-300">
            <Search size={48} />
          </div>
          <h3 className="text-xl font-black text-secondary">
            Nenhum resultado
          </h3>
          <p className="text-gray-400 text-sm mt-1">
            Tente remover alguns filtros.
          </p>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            // Implementação de 5 colunas em telas grandes (lg)
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6">
              {paginatedProducts.map((product) => (
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
          ) : (
            // Lista otimizada com a cor primária dinâmica
            <div className="flex flex-col gap-4">
              {paginatedProducts.map((product) => {
                const outOfStock = isOutOfStock(product);
                return (
                  <div
                    key={product.id}
                    onClick={() => setModal('product', product)}
                    className="group relative flex overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:border-primary/20 hover:shadow-xl cursor-pointer"
                  >
                    <div className="relative w-32 sm:w-56 aspect-square flex-shrink-0 bg-gray-50 p-4">
                      {outOfStock && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
                          <span className="bg-secondary text-white px-2 py-1 rounded-md text-[10px] font-black shadow-lg flex items-center gap-1">
                            <Archive size={12} /> ESGOTADO
                          </span>
                        </div>
                      )}
                      <NextImage
                        src={product.image_url || '/placeholder-no-image.svg'}
                        alt={product.name}
                        fill
                        className="object-contain p-2 transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>

                    <div className="flex flex-1 flex-col sm:flex-row p-4 sm:p-6 gap-4 justify-between">
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">
                          {product.brand}
                        </span>
                        <h3 className="text-base md:text-lg font-black text-secondary group-hover:text-primary transition-colors line-clamp-1">
                          {product.name}
                        </h3>
                        <p className="mt-1 text-xs md:text-sm text-gray-500 line-clamp-2 max-w-2xl">
                          {product.description}
                        </p>
                      </div>

                      <div className="flex items-center sm:items-end justify-between sm:flex-col sm:justify-center gap-4 min-w-[140px]">
                        <PriceDisplay
                          value={product.price}
                          size="large"
                          isPricesVisible={isPricesVisible}
                          className="text-secondary"
                        />
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!outOfStock) addToCart(product);
                          }}
                          disabled={outOfStock}
                          className="shadow-lg shadow-primary/20 bg-primary text-primary-foreground"
                          leftIcon={<ShoppingCart size={18} />}
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

          {/* Paginação com Estilo Premium */}
          {totalPages > 1 && (
            <div className="mt-12 flex justify-center items-center gap-4 py-8">
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentPage(currentPage - 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={currentPage === 1}
                className="w-12 h-12 rounded-2xl border-gray-200 text-secondary"
              >
                <ChevronLeft size={24} />
              </Button>

              <div className="flex items-center gap-2 bg-white px-5 py-3 rounded-2xl border border-gray-100 shadow-sm text-sm font-black text-gray-500">
                Página <span className="text-primary">{currentPage}</span> de{' '}
                {totalPages}
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  setCurrentPage(currentPage + 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={currentPage === totalPages}
                className="w-12 h-12 rounded-2xl border-gray-200 text-secondary"
              >
                <ChevronRight size={24} />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
