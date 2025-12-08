'use client';

import { useStore } from './store-context';
import {
  Search,
  Heart,
  ShoppingCart,
  Zap,
  Star,
  Plus,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Archive,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

// --- Interfaces ---
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

// --- Componente Carrossel (Deslizante) ---
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.imageUrl}
              alt={slide.altText}
              className="w-full h-full object-cover"
            />

            {/* --- NOVO: GRADIENTE NA PARTE INFERIOR --- */}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
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
            <ChevronLeft size={28} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              nextSlide();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/20 hover:bg-black/50 backdrop-blur-sm text-white z-20 opacity-0 group-hover:opacity-100 transition-all border border-white/30"
          >
            <ChevronRight size={28} />
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

// --- Preço com Parcelamento e Desconto ---
export function PriceDisplay({
  value,
  size = 'normal',
  className = '',
}: {
  value: number;
  size?: 'normal' | 'large';
  className?: string;
}) {
  const { isPricesVisible, store } = useStore();

  if (!isPricesVisible) {
    return (
      <div className="flex flex-col">
        <span
          className={`font-mono text-gray-300 tracking-widest ${size === 'large' ? 'text-2xl' : 'text-sm'}`}
        >
          R$ ***
        </span>
      </div>
    );
  }

  // Lógica de Exibição Condicional
  const showInstallments = store.show_installments !== false;
  const maxInstallments = store.max_installments || 12;
  const installmentValue = value / maxInstallments;

  // Verifica se a tag de desconto está ativa nas configurações
  const showDiscount = store.show_discount_tag !== false;
  const discountPercent = store.cash_price_discount_percent || 0;
  const cashPrice = value - value * (discountPercent / 100);

  return (
    <div className="flex flex-col">
      {size === 'large' && (
        <span className="text-xs text-gray-400 line-through">
          De:{' '}
          {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(value * 1.2)}
        </span>
      )}
      <span
        className={`${className} ${size === 'large' ? 'text-3xl' : 'text-lg'} font-bold text-gray-900 leading-none`}
      >
        {new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(value)}
      </span>

      {showInstallments && (
        <span className="text-[10px] sm:text-xs text-green-600 font-medium mt-1">
          ou {maxInstallments}x de{' '}
          {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(installmentValue)}{' '}
          sem juros
        </span>
      )}

      {/* Renderiza apenas se houver desconto E a configuração estiver ativa */}
      {showDiscount && discountPercent > 0 && (
        <span className="text-[10px] text-gray-500 font-medium mt-0.5">
          ou{' '}
          <span className="font-bold text-[var(--secondary)]">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(cashPrice)}
          </span>{' '}
          à vista ({discountPercent}% OFF)
        </span>
      )}
    </div>
  );
}

// --- Container de Banners ---
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
    <div className="w-full relative mt-0">
      <div className="w-full aspect-[3/1] md:aspect-[4/1] lg:aspect-[5/1] relative overflow-hidden bg-gray-200 shadow-sm">
        <Carousel slides={slides} interval={5000} />
      </div>
    </div>
  );
}

// --- Grade de Produtos (Com Lógica de Estoque) ---
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
  } = useStore();

  // Helper para verificar estoque
  const isOutOfStock = (product: any) => {
    // Se a gestão de estoque estiver desativada, sempre disponível
    if (!store.enable_stock_management) return false;
    // Se backorder (venda sem estoque) estiver ativada, sempre disponível
    if (store.global_allow_backorder) return false;

    // Caso contrário, verifica a quantidade (fallback para 0 se nulo)
    // Garante que stock_quantity seja tratado como número
    return (product.stock_quantity || 0) <= 0;
  };

  return (
    <div className="flex-1 w-full">
      {isFilterOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsFilterOpen(false)}
        />
      )}

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <p className="text-sm text-gray-600">
          Mostrando <strong>{displayProducts.length}</strong> de{' '}
          <strong>{totalProducts}</strong> produtos
        </p>

        <div className="flex items-center gap-3">
          <div className="flex gap-1 border-r border-gray-200 pr-3 mr-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-gray-100 text-[var(--primary)]' : 'text-gray-400 hover:text-gray-600'}`}
              title="Grade"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-gray-100 text-[var(--primary)]' : 'text-gray-400 hover:text-gray-600'}`}
              title="Lista"
            >
              <List size={18} />
            </button>
          </div>

          <span className="text-sm text-gray-500 hidden sm:inline">
            Ordenar:
          </span>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="p-1.5 border-none bg-transparent text-sm font-medium text-gray-900 outline-none cursor-pointer"
          >
            <option value="name">Nome (A-Z)</option>
            <option value="price_asc">Menor Preço</option>
            <option value="price_desc">Maior Preço</option>
          </select>
        </div>
      </div>

      {displayProducts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200 shadow-sm">
          <Search size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-900">Nada encontrado</h3>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            // --- GRADE ---
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayProducts.map((product) => {
                const outOfStock = isOutOfStock(product);
                return (
                  <div
                    key={product.id}
                    onClick={() => setModal('product', product)}
                    className={`bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group cursor-pointer relative overflow-hidden ${outOfStock ? 'opacity-80 grayscale-[0.5]' : ''}`}
                  >
                    {/* Badge ESGOTADO */}
                    {outOfStock && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/40 backdrop-blur-[1px]">
                        <span className="bg-gray-800 text-white px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-2 shadow-md border border-gray-600">
                          <Archive size={14} /> ESGOTADO
                        </span>
                      </div>
                    )}

                    {/* Tag de Desconto (Condicional) */}
                    {store.show_discount_tag &&
                      product.price &&
                      (store.cash_price_discount_percent || 0) > 0 &&
                      !outOfStock && (
                        <div className="absolute top-0 right-0 z-10 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg shadow-sm">
                          {store.cash_price_discount_percent}% OFF
                        </div>
                      )}

                    <div className="absolute top-0 left-0 z-10 p-2 flex flex-col gap-1">
                      {product.is_launch && (
                        <span className="bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                          Novo
                        </span>
                      )}
                      {product.is_best_seller && (
                        <span className="bg-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                          BEST SELLER
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(product.id);
                      }}
                      className="absolute top-8 right-2 z-10 p-1.5 bg-white/80 backdrop-blur rounded-full text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Heart
                        size={16}
                        className={
                          favorites.includes(product.id)
                            ? 'fill-red-500 text-red-500'
                            : ''
                        }
                      />
                    </button>

                    <div className="aspect-square p-4 flex items-center justify-center bg-white group-hover:opacity-95 transition-opacity">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <Search size={24} className="text-gray-300" />
                      )}
                    </div>
                    <div className="p-4 pt-0 flex flex-col flex-1">
                      <div className="flex-1">
                        <p className="text-[10px] text-gray-400 uppercase font-bold mb-1 truncate">
                          {product.brand || 'Genérico'}
                        </p>
                        <h3
                          className="text-sm text-gray-800 font-medium leading-snug line-clamp-2 mb-2 group-hover:text-[var(--primary)] transition-colors"
                          title={product.name}
                        >
                          {product.name}
                        </h3>
                      </div>
                      <div className="mt-2">
                        <div className="mb-3">
                          <PriceDisplay value={product.price} />
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!outOfStock) addToCart(product);
                          }}
                          disabled={outOfStock}
                          className={`w-full py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 ${outOfStock ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-[var(--primary)] text-white hover:brightness-110'}`}
                        >
                          <ShoppingCart size={16} />{' '}
                          {outOfStock ? 'Indisponível' : 'Comprar'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // --- LISTA ---
            <div className="flex flex-col gap-3">
              {displayProducts.map((product) => {
                const outOfStock = isOutOfStock(product);
                return (
                  <div
                    key={product.id}
                    onClick={() => setModal('product', product)}
                    className={`bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 flex overflow-hidden group cursor-pointer relative ${outOfStock ? 'opacity-80' : ''}`}
                  >
                    {outOfStock && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/30 pointer-events-none">
                        <span className="bg-gray-800 text-white px-3 py-1 rounded text-xs font-bold shadow">
                          ESGOTADO
                        </span>
                      </div>
                    )}
                    <div className="w-32 sm:w-48 aspect-square sm:aspect-auto flex items-center justify-center bg-gray-50 p-2 relative">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                      ) : (
                        <Search size={24} className="text-gray-300" />
                      )}
                      {product.is_launch && (
                        <span className="absolute top-2 left-2 bg-blue-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">
                          Novo
                        </span>
                      )}
                    </div>
                    <div className="flex-1 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">
                            {product.brand || 'Genérico'}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(product.id);
                            }}
                            className="text-gray-300 hover:text-red-500 sm:hidden"
                          >
                            <Heart
                              size={16}
                              className={
                                favorites.includes(product.id)
                                  ? 'fill-red-500 text-red-500'
                                  : ''
                              }
                            />
                          </button>
                        </div>
                        <h3 className="text-base font-medium text-gray-900 mb-2 group-hover:text-[var(--primary)] transition-colors">
                          {product.name}
                        </h3>
                        {product.description &&
                          product.description.trim() !== '' && (
                            <p className="text-xs text-gray-500 line-clamp-2 hidden sm:block">
                              {product.description}
                            </p>
                          )}
                      </div>
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 sm:gap-1 min-w-[140px] border-t sm:border-t-0 border-gray-100 pt-3 sm:pt-0 mt-auto sm:mt-0">
                        <div className="text-right">
                          <PriceDisplay value={product.price} size="large" />
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!outOfStock) addToCart(product);
                          }}
                          disabled={outOfStock}
                          className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 ${outOfStock ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-[var(--primary)] text-white hover:brightness-110'}`}
                        >
                          <ShoppingCart size={16} />{' '}
                          <span className="hidden sm:inline">
                            {outOfStock ? 'Indisponível' : 'Adicionar'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* PAGINAÇÃO */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center items-center gap-4">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-full border bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm font-medium text-gray-600">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-full border bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
