'use client';

import { useRouter } from 'next/navigation';
import { Heart, Star } from 'lucide-react';
import Image from 'next/image';
import { Product, Settings } from '../../lib/types';

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
      <h3 className="mb-4 flex items-center text-xl font-bold text-gray-900">
        <Star className="mr-2 h-5 w-5 fill-current text-yellow-500" />
        Best Sellers
      </h3>
      <div className="overflow-x-auto">
        <div className="flex space-x-4 pb-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="w-64 flex-shrink-0 cursor-pointer rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              onClick={() =>
                router.push(`/catalogo/${userId}/product/${product.id}`)
              }
            >
              <div className="relative">
                {product.images && product.images.length > 0 ? (
                  <div className="relative h-40 w-full rounded-t-lg overflow-hidden">
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                ) : (
                  <div className="flex h-40 w-full items-center justify-center rounded-t-lg bg-gray-100">
                    <span className="text-sm text-gray-400">Sem imagem</span>
                  </div>
                )}
                <div className="absolute right-2 top-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(product.id);
                    }}
                    className="rounded-full bg-white bg-opacity-90 p-1 transition-all hover:bg-opacity-100"
                  >
                    <Heart
                      className={`h-4 w-4 ${
                        favorites.has(product.id)
                          ? 'fill-current text-red-500'
                          : 'text-gray-400'
                      }`}
                    />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="mb-2">
                  <span className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600">
                    {product.brand || 'Marca'}
                  </span>
                </div>
                <h4 className="mb-2 line-clamp-2 text-sm font-medium text-gray-900">
                  {product.name}
                </h4>
                <div className="mb-2 flex items-baseline space-x-2">
                  <span className="text-lg font-bold text-gray-900">
                    R$ {formatPrice(product.price)}
                  </span>
                  {settings?.show_sale_price && (
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
                  className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                  style={{
                    backgroundColor: settings?.primary_color || '#4f46e5', // Fallback: Indigo-600
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
