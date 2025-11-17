'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, X } from 'lucide-react';
import { Product, Settings, ProductCardProps } from '@/lib/types';

interface ProductCardGridProps extends ProductCardProps {
  hasPriceAccess: boolean;
}

export const ProductCardGrid: React.FC<ProductCardGridProps> = ({
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
  const [quantity, setQuantity] = useState(1);
  const [showImageModal, setShowImageModal] = useState(false);
  const router = useRouter();

  const handleImageClick = () => {
    setShowImageModal(true);
  };

  const handleProductClick = () => {
    router.push(`/catalog/${userId}/product/${product.id}`);
  };

  const handleCloseModal = () => {
    setShowImageModal(false);
  };

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
        <div className="relative">
          {product.images && product.images.length > 0 ? (
            <>
              <img
                src={product.images[0]}
                alt={product.name}
                className="h-48 w-full cursor-pointer object-cover"
                onClick={handleImageClick}
              />
              {/* Overlay de zoom */}
              <div
                className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black bg-opacity-0 opacity-0 transition-all duration-200 hover:bg-opacity-20 hover:opacity-100"
                onClick={handleImageClick}
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
            </>
          ) : (
            <div className="flex h-48 w-full items-center justify-center bg-gray-100">
              <span className="text-sm text-gray-400">Sem imagem</span>
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

        <div className="p-4">
          <div className="mb-2">
            <span className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600">
              {product.brand || 'Marca'}
            </span>
          </div>
          <h3
            className="mb-2 line-clamp-2 cursor-pointer text-lg font-medium text-gray-900 hover:text-blue-600"
            onClick={handleProductClick}
          >
            {product.name}
          </h3>
          <p className="mb-2 line-clamp-2 text-sm text-gray-600">
            {product.description || 'Sem descrição disponível'}
          </p>

          <div className="mb-3">
            {hasPriceAccess ? (
              <div className="mb-1 flex items-baseline space-x-2">
                <span className="text-xl font-bold text-gray-900">
                  R$ {formatPrice(product.price)}
                </span>
                {settings?.show_old_price && (
                  <span className="text-sm text-gray-500 line-through">
                    R$ {formatPrice(product.price * 1.2)}
                  </span>
                )}
                {settings?.show_discount && (
                  <span className="text-xs font-medium text-green-600">
                    17% OFF
                  </span>
                )}
              </div>
            ) : (
              <div className="mb-1">
                <span className="text-sm italic text-gray-500">
                  Preço disponível mediante solicitação
                </span>
              </div>
            )}
            {hasPriceAccess && settings?.show_installments && (
              <div className="mt-1 text-xs text-green-600">
                12x de R$ {formatPrice(product.price / 12)} sem juros
              </div>
            )}
          </div>

          {settings?.show_shipping && (
            <div className="mb-3 flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center">
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
              </div>
              <span>📍 SP</span>
            </div>
          )}

          <div className="mb-3 flex items-center space-x-2">
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

          <button
            onClick={() => onAddToCart(product.id, quantity)}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            style={{ backgroundColor: primaryColor || '#3B82F6' }}
          >
            Adicionar ao Carrinho
          </button>
        </div>
      </div>

      {/* Modal de imagem ampliada */}
      {showImageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
          onClick={handleCloseModal}
        >
          <div
            className="relative max-h-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={product.images?.[0] || ''}
              alt={product.name}
              className="max-h-[90vh] max-w-full object-contain"
            />
            <button
              onClick={handleCloseModal}
              className="absolute right-4 top-4 rounded-full bg-white bg-opacity-90 p-2 transition-all hover:bg-opacity-100"
            >
              <X className="h-6 w-6 text-gray-700" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
