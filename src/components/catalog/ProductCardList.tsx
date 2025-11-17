"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, X } from "lucide-react";
import { Product, Settings, ProductCardProps } from "@/lib/types";

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
  const [quantity, setQuantity] = useState(1);

  const handleProductClick = () => {
    router.push(`/catalog/${userId}/product/${product.id}`);
  };

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
        <div className="flex flex-col sm:flex-row">
          <div className="relative w-full sm:w-48 h-48 flex-shrink-0">
            {product.images && product.images.length > 0 ? (
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover rounded-t-lg sm:rounded-l-lg sm:rounded-t-none cursor-pointer"
                onClick={() => setShowImageModal(true)}
              />
            ) : (
              <div className="w-full h-full bg-gray-100 rounded-t-lg sm:rounded-l-lg sm:rounded-t-none flex items-center justify-center">
                <span className="text-gray-400 text-sm">Sem imagem</span>
              </div>
            )}

            {/* Overlay de zoom */}
            {product.images && product.images.length > 0 && (
              <div
                className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer"
                onClick={() => setShowImageModal(true)}
              >
                <div className="bg-white bg-opacity-90 rounded-full p-2">
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
              <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 px-2 py-1 rounded text-xs font-bold flex items-center">
                ⭐ Bestseller
              </div>
            )}

            {/* Badge de Lançamento */}
            {product.is_launch && (
              <div className="absolute top-2 right-2 bg-green-400 text-green-900 px-2 py-1 rounded text-xs font-bold">
                Lançamento
              </div>
            )}

            <button
              onClick={() => onToggleFavorite(product.id)}
              className="absolute top-2 right-2 p-2 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
            >
              <Heart
                className={`h-5 w-5 ${
                  isFavorite ? "text-red-500 fill-current" : "text-gray-400"
                }`}
              />
            </button>
          </div>

          <div className="flex-1 p-4 flex flex-col justify-between">
            <div>
              <div className="mb-2">
                <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">
                  {product.brand || "Marca"}
                </span>
              </div>
              <h3
                className="text-lg font-medium text-gray-900 mb-2 hover:text-blue-600 cursor-pointer line-clamp-2"
                onClick={handleProductClick}
              >
                {product.name}
              </h3>
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                {product.description || "Sem descrição disponível"}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-between sm:items-end mt-4">
              <div className="mb-3 sm:mb-0">
                {hasPriceAccess ? (
                  <>
                    <div className="flex items-baseline space-x-2 mb-1">
                      <span className="text-xl font-bold text-gray-900">
                        R$ {formatPrice(product.price)}
                      </span>
                      {settings?.show_old_price && (
                        <span className="text-sm text-gray-500 line-through">
                          R$ {formatPrice(product.price * 1.2)}
                        </span>
                      )}
                      {settings?.show_discount && (
                        <span className="text-xs text-green-600 font-medium">
                          17% OFF
                        </span>
                      )}
                    </div>
                    {settings?.show_installments && (
                      <div className="text-xs text-green-600 mt-1">
                        12x de R$ {formatPrice(product.price / 12)} sem juros
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mb-1">
                    <span className="text-sm text-gray-500 italic">
                      Preço disponível mediante solicitação
                    </span>
                  </div>
                )}
                {hasPriceAccess && settings?.show_shipping && (
                  <div className="flex items-center text-xs text-gray-600 mt-1">
                    <svg
                      className="h-3 w-3 mr-1"
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
                    className="w-16 border border-gray-300 rounded px-2 py-1 text-center"
                  />
                </div>
                <button
                  onClick={() => onAddToCart(product.id, quantity)}
                  className="bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  style={{ backgroundColor: primaryColor || "#3B82F6" }}
                >
                  Adicionar ao Carrinho
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de imagem ampliada */}
      {showImageModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="relative max-w-4xl max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={product.images?.[0] || ""}
              alt={product.name}
              className="max-w-full max-h-[90vh] object-contain"
            />
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 bg-white bg-opacity-90 rounded-full p-2 hover:bg-opacity-100 transition-all"
            >
              <X className="h-6 w-6 text-gray-700" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
