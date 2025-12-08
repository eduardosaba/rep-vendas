'use client';

import { Heart, Zap, Star, Plus, Image as ImageIcon } from 'lucide-react';
import {
  PriceDisplay,
  getInstallmentText,
  getCashDiscountText,
} from './PriceDisplay';
import Barcode from '../ui/Barcode';

// --- Tipos ---
interface Product {
  id: string;
  name: string;
  price: number;
  reference_code: string;
  brand: string | null;
  category: string | null;
  description?: string | null;

  image_path?: string | null;
  image_url: string | null;
  external_image_url?: string | null;
  images?: string[];

  is_launch?: boolean;
  is_best_seller?: boolean;
  original_price?: number;
  barcode?: string | null;
  sku?: string | null;
  color?: string | null;
  cost?: number;
  stock_quantity?: number;
  technical_specs?: Record<string, string> | null; // Adicionado Specs
}

interface StoreSettings {
  primary_color: string;
  show_installments: boolean;
  max_installments: number;
  show_cash_discount: boolean;
  cash_price_discount_percent?: number;
}

interface ProductCardProps {
  product: Product;
  storeSettings: StoreSettings;
  isFavorite: boolean;
  isPricesVisible: boolean;
  onAddToCart: (product: Product, quantity?: number) => void;
  onToggleFavorite: (id: string) => void;
  onViewDetails: (product: Product) => void;
}

export function ProductCard({
  product,
  storeSettings,
  isFavorite,
  isPricesVisible,
  onAddToCart,
  onToggleFavorite,
  onViewDetails,
}: ProductCardProps) {
  const getDisplayImage = () => {
    if (product.image_path) {
      return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/${product.image_path}`;
    }
    if (product.image_url) return product.image_url;
    if (product.external_image_url) return product.external_image_url;
    if (product.images && product.images.length > 0) return product.images[0];
    return null;
  };

  const displayImage = getDisplayImage();

  const hasValidOriginalPrice =
    product.original_price && product.original_price > product.price;
  const discountPercent = hasValidOriginalPrice
    ? Math.round(
        ((product.original_price! - product.price) / product.original_price!) *
          100
      )
    : 0;

  const handleViewDetails = (e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest('button, a')) {
      onViewDetails(product);
    }
  };

  const primaryColor = storeSettings.primary_color || '#0d1b2c';

  return (
    <div
      onClick={handleViewDetails}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col group cursor-pointer relative h-full"
    >
      {/* Imagem (topo) */}
      <div className="aspect-[4/5] relative bg-gray-100 overflow-hidden">
        {displayImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayImage}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 bg-gray-50">
            <ImageIcon size={32} strokeWidth={1.5} />
            <span className="text-xs mt-2 font-medium">Sem foto</span>
          </div>
        )}

        <div className="hidden absolute inset-0 flex-col items-center justify-center text-gray-300 bg-gray-50">
          <ImageIcon size={32} strokeWidth={1.5} />
          <span className="text-xs mt-2 font-medium">Foto indisponível</span>
        </div>

        {/* Tags */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
          {product.is_launch && (
            <span className="bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1">
              <Zap size={10} fill="currentColor" /> NOVO
            </span>
          )}
          {product.is_best_seller && (
            <span className="bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1">
              <Star size={10} fill="currentColor" /> BEST SELLER
            </span>
          )}
          {storeSettings.show_cash_discount &&
            hasValidOriginalPrice &&
            discountPercent > 0 && (
              <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md">
                -{discountPercent}% OFF
              </span>
            )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(product.id);
          }}
          className="absolute top-3 right-3 z-10 p-2 bg-white/80 backdrop-blur rounded-full shadow-sm hover:bg-white transition-colors group/fav"
        >
          <Heart
            size={16}
            className={`transition-colors ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400 group-hover/fav:text-red-400'}`}
          />
        </button>

        <div className="absolute bottom-0 inset-x-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black/60 to-transparent">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product);
            }}
            style={{ backgroundColor: primaryColor }}
            className="w-full py-2.5 text-white rounded-lg font-bold text-sm shadow-lg hover:brightness-110 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Plus size={16} /> Adicionar
          </button>
        </div>
      </div>

      {/* Corpo */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex-1">
          <div className="flex justify-between items-start mb-1">
            <p className="text-xs text-gray-400 font-mono truncate max-w-[60%]">
              {product.reference_code}
            </p>
            {product.brand && (
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate max-w-[35%] text-right">
                {product.brand}
              </span>
            )}
          </div>
          <h3
            className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 mb-2 min-h-[2.5em]"
            title={product.name}
          >
            {product.name}
          </h3>
        </div>

        {/* --- FICHA TÉCNICA (TABELA) --- */}
        {product.technical_specs &&
          Object.keys(product.technical_specs).length > 0 && (
            <div className="mt-2 mb-3 bg-gray-50/50 rounded-lg border border-gray-100 p-2">
              <table className="w-full text-[10px] text-left">
                <tbody>
                  {Object.entries(product.technical_specs)
                    .slice(0, 3)
                    .map(([key, val]) => (
                      <tr
                        key={key}
                        className="border-b border-gray-100 last:border-0"
                      >
                        <td
                          className="py-0.5 text-gray-500 font-medium w-1/2 pr-2 truncate"
                          title={key}
                        >
                          {key}
                        </td>
                        <td
                          className="py-0.5 text-gray-700 text-right w-1/2 truncate font-semibold"
                          title={String(val)}
                        >
                          {String(val)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {Object.keys(product.technical_specs).length > 3 && (
                <p className="text-[9px] text-center text-gray-400 mt-1 italic">
                  + mais detalhes
                </p>
              )}
            </div>
          )}

        {/* EAN/Barcode */}
        {product.barcode && (
          <div className="flex justify-center my-2 opacity-60">
            <Barcode value={product.barcode} height={20} scale={1} />
          </div>
        )}

        <div className="mt-auto pt-3 border-t border-gray-50 flex flex-col gap-1">
          {isPricesVisible && hasValidOriginalPrice && (
            <span className="text-xs text-gray-400 line-through">
              De:{' '}
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(product.original_price!)}
            </span>
          )}

          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 uppercase font-bold">
                Por apenas
              </span>
              <PriceDisplay
                value={product.price}
                isPricesVisible={isPricesVisible}
                size="normal"
                className="font-bold text-red-600 leading-none text-lg"
              />
            </div>
          </div>

          {getInstallmentText(
            product.price,
            storeSettings.max_installments,
            isPricesVisible
          )}
          {getCashDiscountText(
            product.price,
            storeSettings.cash_price_discount_percent || 0,
            isPricesVisible
          )}
        </div>
      </div>
    </div>
  );
}
