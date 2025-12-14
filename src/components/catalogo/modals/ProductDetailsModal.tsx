// src/components/catalogo/modals/ProductDetailsModal.tsx

'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { Plus, X, Maximize2, Search, Heart, Lock, Unlock } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={() => setViewProduct(null)}
      />
      <div className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-200 max-h-[90vh] md:max-h-[600px]">
        {/* Botões de Ação no topo */}
        <button
          onClick={() => setViewProduct(null)}
          className="absolute top-4 right-4 z-10 p-2 bg-white/80 rounded-full hover:bg-white text-gray-500 hover:text-gray-900 shadow-sm"
          aria-label="Fechar"
          title="Fechar"
        >
          <X size={20} />
        </button>
        <button
          onClick={() => toggleFavorite(viewProduct.id)}
          className="absolute top-4 right-14 z-10 p-2 bg-white/80 rounded-full hover:bg-white text-gray-500 hover:text-gray-900 shadow-sm"
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
        <div className="w-full md:w-1/2 bg-gray-100 relative flex flex-col">
          <div className="flex-1 relative flex items-center justify-center overflow-hidden group">
            {productImages.length > 0 ? (
              <div className="relative w-full h-full">
                <Image
                  src={productImages[currentImageIndex]}
                  alt={viewProduct.name}
                  fill
                  style={{ objectFit: 'contain' }}
                  className="cursor-zoom-in"
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
                  className={`w-16 h-16 rounded-lg border-2 overflow-hidden flex-shrink-0 ${currentImageIndex === idx ? 'border-indigo-600' : 'border-transparent hover:border-gray-300'}`}
                >
                  <div className="relative w-full h-full">
                    <Image
                      src={img}
                      alt="thumbnail"
                      fill
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detalhes do Produto */}
        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col overflow-y-auto">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {viewProduct.reference_code}
            </span>
            {viewProduct.brand && (
              <span className="text-xs font-bold rv-text-primary uppercase bg-indigo-50 px-2 py-1 rounded">
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
              const showSale = (store as any).show_sale_price !== false;
              const showCost = (store as any).show_cost_price !== false;

              const priceVisibleForThisStore =
                isPricesVisible && (showSale || showCost);

              const mainValue = showSale
                ? viewProduct.price
                : ((viewProduct as any).cost ?? viewProduct.price);

              return (
                <>
                  <PriceDisplay
                    value={mainValue}
                    isPricesVisible={priceVisibleForThisStore}
                    size="large"
                    className="font-bold text-red-600 block mb-1"
                  />
                  <span className="text-sm text-gray-500">Preço unitário</span>

                  {/* Se ambos os preços estiverem permitidos, mostrar o custo secundário */}
                  {priceVisibleForThisStore && showSale && showCost && (
                    <div className="mt-2 text-sm text-gray-500">
                      <span className="font-semibold">Custo:</span>{' '}
                      <span>
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(
                          (viewProduct as any).cost ?? viewProduct.price
                        )}
                      </span>
                    </div>
                  )}
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
          <div className="mt-auto">
            <button
              onClick={() => {
                addToCart(viewProduct);
                setViewProduct(null);
              }}
              style={{ backgroundColor: primaryColor }}
              className="w-full py-4 rounded-xl text-white font-bold text-lg hover:brightness-110 transition-colors shadow-lg flex items-center justify-center gap-2"
            >
              <Plus size={20} /> Adicionar ao Pedido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
