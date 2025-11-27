// src/components/catalog/ProductCard.tsx

'use client';

import { Heart, Zap, Star, Plus, Maximize2 } from 'lucide-react';
import {
  PriceDisplay,
  getInstallmentText,
  getCashDiscountText,
} from './PriceDisplay'; // Importação do novo utilitário

// --- Tipos --- (Importar do Storefront.tsx no projeto final)
interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  reference_code: string;
  brand: string | null;
  category: string | null;
  description?: string | null;
  images?: string[];
  is_launch?: boolean;
  is_best_seller?: boolean;
  original_price?: number; // NOVO: Preço original para valor cortado
}

interface StoreSettings {
  primary_color: string;
  show_installments: boolean;
  max_installments: number;
  show_discount_tag: boolean;
  cash_price_discount_percent?: number;
}
// -----------------

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
  // Lógica de Preço Cortado/Desconto
  const hasValidOriginalPrice =
    product.original_price && product.original_price > product.price;
  const discountPercent = hasValidOriginalPrice
    ? Math.round(
        ((product.original_price! - product.price) / product.original_price!) *
          100
      )
    : 0;

  // Lida com o clique para abrir detalhes, exceto no botão
  const handleViewDetails = (e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest('button, a')) {
      onViewDetails(product);
    }
  };

  // Estilos base
  const primaryColor = storeSettings.primary_color || '#0d1b2c';

  return (
    <div
      onClick={handleViewDetails}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col group cursor-pointer relative"
    >
      {/* Tags de Status e Desconto */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
        {product.is_launch && (
          <span className="bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1">
            <Zap size={10} fill="currentColor" /> NOVO
          </span>
        )}
        {product.is_best_seller && (
          <span className="bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1">
            <Star size={10} fill="currentColor" /> TOP
          </span>
        )}
        {storeSettings.show_discount_tag &&
          hasValidOriginalPrice &&
          discountPercent > 0 && (
            <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md">
              -{discountPercent}% OFF
            </span>
          )}
      </div>

      {/* Botão Favorito */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(product.id);
        }}
        className="absolute top-3 right-3 z-10 p-2 bg-white/80 backdrop-blur rounded-full shadow-sm hover:bg-white transition-colors"
        title="Adicionar aos Favoritos"
      >
        <Heart
          size={16}
          className={isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}
        />
      </button>

      {/* Imagem */}
      <div className="aspect-[4/5] relative bg-gray-100 overflow-hidden">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <span className="text-xs">Sem foto</span>
          </div>
        )}

        {/* Botão "Adicionar ao Carrinho" no hover */}
        <div className="absolute bottom-0 inset-x-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black/50 to-transparent">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product);
            }}
            style={{ backgroundColor: primaryColor }}
            className="w-full py-2 text-white rounded-lg font-bold text-sm shadow-lg hover:brightness-110 flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Adicionar
          </button>
        </div>
      </div>

      {/* Corpo (Detalhes e Preços) */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex-1">
          <div className="flex justify-between items-start mb-1">
            <p className="text-xs text-gray-400 font-mono">
              {product.reference_code}
            </p>
            {product.brand && (
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                {product.brand}
              </span>
            )}
          </div>
          <h3
            className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 mb-2"
            title={product.name}
          >
            {product.name}
          </h3>
        </div>

        <div className="pt-3 mt-auto flex flex-col">
          {/* Preço Cortado (De: R$ X) - Se visível */}
          {isPricesVisible && hasValidOriginalPrice && (
            <span className="text-xs text-gray-400 line-through">
              De:{' '}
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(product.original_price!)}
            </span>
          )}

          {/* Preço Principal (Por: R$ Y) */}
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 uppercase font-bold">
                Por apenas
              </span>
              <PriceDisplay
                value={product.price}
                isPricesVisible={isPricesVisible}
                size="normal"
                className="font-bold text-red-600 leading-none"
              />
            </div>
          </div>

          {/* Parcelamento */}
          {getInstallmentText(
            product.price,
            storeSettings.max_installments,
            isPricesVisible
          )}

          {/* Desconto à Vista */}
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
