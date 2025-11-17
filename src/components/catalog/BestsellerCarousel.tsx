"use client";

import { useRouter } from "next/navigation";
import { Heart, Star } from "lucide-react";
import { Product, Settings } from "../../lib/types";

interface BestsellerCarouselProps {
  products: Product[];
  settings: Settings | null;
  favorites: Set<string>;
  onToggleFavorite: (productId: string) => void;
  onAddToCart: (productId: string, quantity: number) => void;
  formatPrice: (price: number) => string;
  userId: string;
}

export const BestsellerCarousel: React.FC<BestsellerCarouselProps> = ({
  products,
  settings,
  favorites,
  onToggleFavorite,
  onAddToCart,
  formatPrice,
  userId,
}) => {
  const router = useRouter();

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="mb-8 mt-16">
      <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
        <Star className="h-5 w-5 text-yellow-500 mr-2 fill-current" />
        Best Sellers
      </h3>
      <div className="overflow-x-auto">
        <div className="flex space-x-4 pb-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="flex-shrink-0 w-64 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() =>
                router.push(`/catalog/${userId}/product/${product.id}`)
              }
            >
              <div className="relative">
                {product.images && product.images.length > 0 ? (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-40 object-cover rounded-t-lg"
                  />
                ) : (
                  <div className="w-full h-40 bg-gray-100 rounded-t-lg flex items-center justify-center">
                    <span className="text-gray-400 text-sm">Sem imagem</span>
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(product.id);
                    }}
                    className="p-1 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
                  >
                    <Heart
                      className={`h-4 w-4 ${
                        favorites.has(product.id)
                          ? "text-red-500 fill-current"
                          : "text-gray-400"
                      }`}
                    />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="mb-2">
                  <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">
                    {product.brand || "Marca"}
                  </span>
                </div>
                <h4 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">
                  {product.name}
                </h4>
                <div className="flex items-baseline space-x-2 mb-2">
                  <span className="text-lg font-bold text-gray-900">
                    R$ {formatPrice(product.price)}
                  </span>
                  {settings?.show_old_price && (
                    <span className="text-sm text-gray-500 line-through">
                      R$ {formatPrice(product.price * 1.2)}
                    </span>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToCart(product.id, 1);
                  }}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
                  style={{
                    backgroundColor: settings?.primary_color || "#3B82F6",
                  }}
                >
                  Adicionar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
