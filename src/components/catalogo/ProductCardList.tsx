'use client';

import React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, X } from 'lucide-react';
import { ProductCardProps } from '@/lib/types';
import ProductImage from './ProductImage';
import { Button } from '@/components/ui/Button';

interface ProductCardListProps extends ProductCardProps {
  hasPriceAccess: boolean;
}

export const ProductCardList: React.FC<ProductCardListProps> = ({
  product,
  isFavorite,
  onToggleFavorite,
  onAddToCart,
  primaryColor,
  settings,
  userId,
  formatPrice,
  hasPriceAccess,
}) => {
  const router = useRouter();
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = React.useRef<number | null>(null);
  const touchMoved = React.useRef<boolean>(false);
  const [quantity, setQuantity] = useState(1);

  const handleProductClick = () => {
    router.push(`/catalogo/${userId}/product/${product.id}`);
  };

  const salePrice = product.sale_price ?? product.price;

  return (
    <>
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
        <div className="flex flex-col sm:flex-row">
          <div className="relative h-48 w-full flex-shrink-0 sm:w-48">
            {product.images && product.images.length > 0 ? (
              (() => {
                const displayProduct =
                  product.sync_status === 'pending'
                    ? {
                        ...product,
                        external_image_url:
                          product.images?.[0] || product.external_image_url,
                      }
                    : product;
                return (
                  <ProductImage
                    product={displayProduct}
                    alt={product.name}
                    className="h-full w-full cursor-pointer rounded-t-lg object-cover sm:rounded-l-lg sm:rounded-t-none"
                    onClick={() => setShowImageModal(true)}
                  />
                );
              })()
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-t-lg bg-gray-100 sm:rounded-l-lg sm:rounded-t-none">
                <span className="text-sm text-gray-400">Sem imagem</span>
              </div>
            )}

            {/* Overlay de zoom */}
            {product.images && product.images.length > 0 && (
              <div
                className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black bg-opacity-0 opacity-0 transition-all duration-200 hover:bg-opacity-20 hover:opacity-100"
                onClick={() => {
                  setCurrentIndex(0);
                  setShowImageModal(true);
                }}
              >
                <div className="rounded-full bg-white bg-opacity-90 p-2">
                  <svg
                    className="h-6 w-6 text-gray-700"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                    />
                  </svg>
                </div>
              </div>
            )}

            {/* Badge de Bestseller */}
            {product.bestseller && (
              <div className="absolute left-2 top-2 flex items-center rounded bg-yellow-400 px-2 py-1 text-xs font-bold text-yellow-900">
                ⭐ Bestseller
              </div>
            )}

            {/* Badge de Lançamento */}
            {product.is_launch && (
              <div className="absolute right-2 top-2 rounded bg-green-400 px-2 py-1 text-xs font-bold text-green-900">
                Lançamento
              </div>
            )}

            <button
              onClick={() => onToggleFavorite(product.id)}
              className="absolute right-2 top-2 rounded-full bg-white bg-opacity-90 p-2 transition-all hover:bg-opacity-100"
            >
              <Heart
                className={`h-5 w-5 ${
                  isFavorite ? 'fill-current text-red-500' : 'text-gray-400'
                }`}
              />
            </button>
          </div>

          <div className="flex flex-1 flex-col justify-between p-4">
            <div>
              <div className="mb-2">
                <span className="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                  {product.brand || 'Marca'}
                </span>
              </div>
              <h3
                className="mb-2 line-clamp-2 cursor-pointer text-lg font-medium text-gray-900 hover:text-primary"
                onClick={handleProductClick}
              >
                {product.name}
              </h3>
              {product.description && product.description.trim() !== '' && (
                <p className="mb-2 line-clamp-2 text-sm text-gray-600">
                  {product.description}
                </p>
              )}
            </div>

            <div className="mt-4 flex flex-col justify-between sm:flex-row sm:items-end">
              <div className="mb-3 sm:mb-0">
                {hasPriceAccess ? (
                  <>
                    <div className="mb-1 flex items-baseline space-x-2">
                      <span className="text-xl font-bold text-gray-900">
                        R$ {formatPrice(salePrice)}
                      </span>
                      {settings?.show_old_price && (
                        <span className="text-sm text-gray-500 line-through">
                          R$ {formatPrice(salePrice * 1.2)}
                        </span>
                      )}
                      {settings?.show_discount && (
                        <span className="text-xs font-medium text-green-600">
                          17% OFF
                        </span>
                      )}
                    </div>
                    {settings?.show_installments &&
                      settings?.show_sale_price && (
                        <div className="mt-1 text-xs text-green-600">
                          12x de R$ {formatPrice(salePrice / 12)} sem juros
                        </div>
                      )}
                  </>
                ) : (
                  <div className="mb-1">
                    <span className="text-sm italic text-gray-500">
                      Preço disponível mediante solicitação
                    </span>
                  </div>
                )}
                {hasPriceAccess && settings?.show_shipping && (
                  <div className="mt-1 flex items-center text-xs text-gray-600">
                    <svg
                      className="mr-1 h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                    <span>Frete grátis</span>
                    <span className="ml-2">📍 SP</span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-700">Qtd:</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className="w-16 rounded border border-gray-300 px-2 py-1 text-center"
                  />
                </div>
                <Button
                  onClick={() => onAddToCart(product.id, quantity)}
                  className=""
                  style={{ backgroundColor: primaryColor || '#3B82F6' }}
                >
                  Adicionar ao Pedido
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de imagem ampliada */}
      {showImageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
          onClick={() => {
            if (!touchMoved.current) setShowImageModal(false);
            touchMoved.current = false;
          }}
        >
          <div
            className="relative max-h-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => {
              touchStartX.current = e.touches?.[0]?.clientX ?? null;
              touchMoved.current = false;
            }}
            onTouchMove={(e) => {
              const start = touchStartX.current;
              const current = e.touches?.[0]?.clientX ?? null;
              if (start !== null && current !== null) {
                const deltaX = current - start;
                if (Math.abs(deltaX) > 10) touchMoved.current = true;
              }
            }}
            onTouchEnd={(e) => {
              const start = touchStartX.current;
              const end = e.changedTouches?.[0]?.clientX ?? null;
              if (start !== null && end !== null) {
                const delta = end - start;
                const threshold = 50; // pixels
                if (delta > threshold) {
                  // swipe right -> prev
                  setCurrentIndex((i) => Math.max(0, i - 1));
                } else if (delta < -threshold) {
                  // swipe left -> next
                  setCurrentIndex((i) =>
                    Math.min((product.images?.length || 1) - 1, i + 1)
                  );
                }
              }
              touchStartX.current = null;
            }}
          >
            <div className="relative flex items-center justify-center">
              <button
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                className="absolute left-2 z-20 hidden md:flex items-center justify-center h-10 w-10 rounded-full bg-white/80 hover:bg-white"
                aria-label="Anterior"
              >
                ‹
              </button>

              {(() => {
                const imgUrl = product.images?.[currentIndex] || '';
                const displayProduct =
                  product.sync_status === 'pending'
                    ? {
                        ...product,
                        external_image_url:
                          imgUrl || product.external_image_url,
                      }
                    : { ...product, image_url: imgUrl || product.image_url };
                return (
                  <ProductImage
                    product={displayProduct}
                    alt={product.name}
                    className="max-h-[90vh] max-w-full object-contain"
                  />
                );
              })()}

              <button
                onClick={() =>
                  setCurrentIndex((i) =>
                    Math.min((product.images?.length || 1) - 1, i + 1)
                  )
                }
                className="absolute right-2 z-20 hidden md:flex items-center justify-center h-10 w-10 rounded-full bg-white/80 hover:bg-white"
                aria-label="Próxima"
              >
                ›
              </button>

              {/* Mobile indicators */}
              {product.images && product.images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                  {product.images.map((_, idx) => (
                    <span
                      key={idx}
                      className={`h-1 w-6 rounded ${idx === currentIndex ? 'bg-white' : 'bg-white/40'}`}
                    />
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowImageModal(false)}
                className="absolute right-4 top-4 rounded-full bg-white bg-opacity-90 p-2 transition-all hover:bg-opacity-100"
              >
                <X className="h-6 w-6 text-gray-700" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
