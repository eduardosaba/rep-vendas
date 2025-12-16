// src/components/catalogo/modals/ProductDetailsModal.tsx

'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { Plus, X, Maximize2, Search, Heart } from 'lucide-react';
import ProductBarcode from '@/components/ui/Barcode';
import { PriceDisplay } from '../PriceDisplay';

// --- Tipos --- (Simplificados, use os tipos completos do Storefront.tsx)
interface Product {
  id: string;
  name: string;
  price: number;
  reference_code: string;
  brand: string | null;
  description?: string | null;
  image_url: string | null;
  images?: string[];
  original_price?: number;
}
interface StoreSettings {
  primary_color: string;
  show_installments: boolean;
  max_installments: number;
  show_cash_discount: boolean;
  cash_price_discount_percent: number;
  show_cost_price: boolean;
  show_sale_price: boolean;
}
// -------------

interface ProductDetailsModalProps {
  viewProduct: Product;
  store: StoreSettings;
  isPricesVisible: boolean;
  favorites: string[];

  // Funções
  setViewProduct: (product: Product | null) => void;
  addToCart: (product: Product, quantity?: number) => void;
  toggleFavorite: (productId: string) => void;
  setIsZoomOpen: (isOpen: boolean) => void;

  // Estados locais do produto
  currentImageIndex: number;
  setCurrentImageIndex: (index: number) => void;
}

// Helper de Imagens (movido do Storefront)
const getProductImages = (product: Product) => {
  if (product.images && product.images.length > 0) return product.images;
  const main =
    (product as any).image_url || (product as any).external_image_url || null;
  if (main) return [main];
  return [];
};

export function ProductDetailsModal({
  viewProduct,
  store,
  isPricesVisible,
  favorites,
  setViewProduct,
  addToCart,
  toggleFavorite,
  setIsZoomOpen,
  currentImageIndex,
  setCurrentImageIndex,
}: ProductDetailsModalProps) {
  const productImages = getProductImages(viewProduct);
  const primaryColor = store.primary_color || '#4f46e5'; // Fallback: Indigo-600

  // Body scroll-lock
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={() => setViewProduct(null)}
      />
      {/* Full Screen on mobile, centered on desktop */}
      <div className="relative bg-white dark:bg-slate-900 w-full h-screen md:h-auto md:max-h-[90vh] md:max-w-4xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Botões de Ação no topo */}
        <button
          onClick={() => setViewProduct(null)}
          className="absolute top-4 right-4 z-10 p-2 min-w-[44px] min-h-[44px] bg-white/80 md:bg-white rounded-full hover:bg-white text-gray-500 hover:text-gray-900 shadow-sm flex items-center justify-center"
          aria-label="Fechar"
          title="Fechar"
        >
          <X size={20} />
        </button>
        <button
          onClick={() => toggleFavorite(viewProduct.id)}
          className="absolute top-4 right-16 md:right-14 z-10 p-2 min-w-[44px] min-h-[44px] bg-white/80 md:bg-white rounded-full hover:bg-white text-gray-500 hover:text-gray-900 shadow-sm flex items-center justify-center"
          aria-label="Favoritar"
        >
          <Heart
            size={20}
            className={
              favorites.includes(viewProduct.id)
                ? 'fill-red-500 text-red-500'
                : 'text-gray-400'
            }
          />
        </button>

        {/* Área de Imagens */}
        <div className="w-full md:w-1/2 bg-gray-100 dark:bg-slate-800 relative flex flex-col h-1/2 md:h-auto">
          <div className="flex-1 relative flex items-center justify-center overflow-hidden group">
            {productImages.length > 0 ? (
              <div className="relative w-full h-full max-h-[70vh]">
                <Image
                  src={productImages[currentImageIndex]}
                  alt={viewProduct.name}
                  fill
                  style={{ objectFit: 'contain', maxWidth: '100%' }}
                  className="cursor-zoom-in"
                  loading="eager"
                  quality={90}
                  onClick={() => setIsZoomOpen(true)}
                />
              </div>
            ) : (
              <div className="text-gray-400 flex flex-col items-center">
                <Search size={48} className="mb-2 opacity-50" />
                <p>Sem imagem</p>
              </div>
            )}
            {productImages.length > 0 && (
              <button
                onClick={() => setIsZoomOpen(true)}
                className="absolute bottom-4 right-4 p-2 bg-white/90 rounded-lg shadow text-gray-600 rv-text-primary-hover opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Maximize2 size={20} />
              </button>
            )}
          </div>
          {productImages.length > 1 && (
            <div className="p-4 flex gap-2 overflow-x-auto bg-white border-t border-gray-200">
              {productImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`w-16 h-16 rounded-lg border-2 overflow-hidden flex-shrink-0 ${currentImageIndex === idx ? 'border-primary' : 'border-transparent hover:border-gray-300'}`}
                >
                  <div className="relative w-full h-full">
                    <Image
                      src={img}
                      alt="thumbnail"
                      width={64}
                      height={64}
                      style={{ objectFit: 'cover', maxWidth: '100%' }}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detalhes do Produto: Overflow-y-auto with SafeArea */}
        <div className="w-full md:w-1/2 p-4 md:p-6 lg:p-8 flex flex-col overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+1rem)] h-1/2 md:h-auto bg-white dark:bg-slate-900">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {viewProduct.reference_code}
            </span>
            {viewProduct.brand && (
              <span className="text-xs font-bold rv-text-primary uppercase bg-primary/10 px-2 py-1 rounded">
                {viewProduct.brand}
              </span>
            )}
            {/* Código de barras visual */}
            {('barcode' in viewProduct || (viewProduct as any).barcode) && (
              <div className="ml-auto flex items-center gap-3">
                {(viewProduct as any).barcode ? (
                  <div className="flex-shrink-0">
                    <ProductBarcode
                      value={String((viewProduct as any).barcode)}
                      height={36}
                    />
                  </div>
                ) : (
                  <span className="text-xs text-gray-500 font-mono">
                    {(viewProduct as any).barcode || ''}
                  </span>
                )}
              </div>
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
            {viewProduct.name}
          </h2>

          {/* Preço e Descrição */}
          <div className="mb-6">
            {viewProduct.original_price &&
              viewProduct.original_price > viewProduct.price &&
              isPricesVisible && (
                <span className="text-sm text-gray-400 line-through block">
                  De:{' '}
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(viewProduct.original_price)}
                </span>
              )}

            {/* Decidir qual valor passar para o PriceDisplay conforme flags da loja */}
            {(() => {
              const showSale =
                isPricesVisible && store.show_sale_price !== false;
              const showCost =
                isPricesVisible && store.show_cost_price === true;

              // CORRETO: price = custo, sale_price = preço de venda sugerido
              const costPrice = viewProduct.price || 0;
              const salePrice = (viewProduct as any).sale_price || 0;
              const discountPercent = store.cash_price_discount_percent || 0;

              // Se apenas uma opção estiver marcada, mostrar em destaque
              const showOnlyOne =
                (showCost && !showSale) || (!showCost && showSale);

              return (
                <>
                  {/* MODO: Apenas uma opção (destaque maior) */}
                  {showOnlyOne ? (
                    <div className="mb-4">
                      <PriceDisplay
                        value={showCost ? costPrice : salePrice}
                        isPricesVisible={true}
                        size="large"
                        className="font-bold text-red-600 block mb-1 text-3xl"
                      />
                      <span className="text-sm text-gray-500">
                        {showCost ? 'Preço de Custo' : 'Preço de Venda'}
                      </span>
                    </div>
                  ) : (
                    /* MODO: Ambas opções (exibir separado) */
                    <>
                      {/* Preço de Custo */}
                      {showCost && (
                        <div className="mb-3">
                          <PriceDisplay
                            value={costPrice}
                            isPricesVisible={true}
                            size="large"
                            className="font-bold text-blue-600 block mb-1"
                          />
                          <span className="text-sm text-gray-500">
                            Preço de Custo
                          </span>
                        </div>
                      )}

                      {/* Preço Sugerido */}
                      {showSale && salePrice > 0 && (
                        <div className="mb-3">
                          <PriceDisplay
                            value={salePrice}
                            isPricesVisible={true}
                            size="large"
                            className="font-bold text-red-600 block mb-1"
                          />
                          <span className="text-sm text-gray-500">
                            Preço Sugerido
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Parcelamento e Desconto - usa sale_price se disponível e show_sale ativo, senão usa price */}
                  {(() => {
                    // Se mostrar venda (ou ambos), usa salePrice se > 0, senão costPrice
                    // Se mostrar apenas custo, usa costPrice
                    const priceForInstallment =
                      showSale && salePrice > 0 ? salePrice : costPrice;

                    return (
                      <>
                        {/* Parcelamento */}
                        {store.show_installments &&
                          store.max_installments > 1 &&
                          priceForInstallment > 0 && (
                            <div className="text-sm text-green-600 font-medium mt-2">
                              ou{' '}
                              <span className="font-bold">
                                {store.max_installments}x
                              </span>{' '}
                              de{' '}
                              <span className="font-bold">
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                }).format(
                                  priceForInstallment / store.max_installments
                                )}
                              </span>{' '}
                              sem juros
                            </div>
                          )}

                        {/* Desconto à vista */}
                        {store.show_cash_discount &&
                          discountPercent > 0 &&
                          priceForInstallment > 0 && (
                            <div className="text-sm text-green-700 font-bold mt-2 bg-green-50 px-3 py-2 rounded-lg">
                              <span className="text-base">
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                }).format(
                                  priceForInstallment *
                                    (1 - discountPercent / 100)
                                )}
                              </span>{' '}
                              <span className="opacity-80 font-normal">
                                à vista
                              </span>{' '}
                              <span className="text-xs border border-green-200 px-1.5 py-0.5 rounded bg-white">
                                -{discountPercent}%
                              </span>
                            </div>
                          )}
                      </>
                    );
                  })()}
                </>
              );
            })()}
          </div>

          <div className="prose prose-sm text-gray-600 mb-8 flex-1">
            <h4 className="text-gray-900 font-semibold mb-2">Detalhes</h4>
            {viewProduct.description &&
              viewProduct.description.trim() !== '' && (
                <p>{viewProduct.description}</p>
              )}
          </div>

          {/* Botão de Adicionar */}
          <div className="mt-auto pt-4">
            <button
              onClick={() => {
                addToCart(viewProduct);
                setViewProduct(null);
              }}
              style={{ backgroundColor: primaryColor }}
              className="w-full py-4 min-h-[44px] rounded-xl text-white font-bold text-base md:text-lg hover:brightness-110 transition-colors shadow-lg flex items-center justify-center gap-2"
            >
              <Plus size={20} /> Adicionar ao Pedido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
