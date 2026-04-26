'use client';

import {
  Heart,
  Zap,
  Star,
  ShoppingCart,
  Lock,
  Plus,
  Minus,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { SmartImage } from './SmartImage';
import React, { useState, useEffect } from 'react';
import { useStore } from '@/components/catalogo/store-context';
import {
  PriceDisplay,
  getInstallmentText,
  getCashDiscountText,
} from './PriceDisplay';
import { Button } from '@/components/ui/button';
import type {
  Product as LibProduct,
  Settings as StoreSettings,
  CartItem,
} from '@/lib/types';
import QuickOrderModal from './modals/QuickOrderModal'
import { useRep } from './RepProvider'

interface ProductCardProps {
  product: LibProduct;
  storeSettings: StoreSettings;
  isFavorite: boolean;
  isPricesVisible: boolean;
  onAddToCart: (product: LibProduct, quantity?: number) => void;
  onToggleFavorite: (id: string) => void;
  onViewDetails: (product: LibProduct) => void;
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
  const { cart, updateQuantity, hideImages } = useStore();
  const rep = useRep();
  const [quickOpen, setQuickOpen] = useState(false)

  const isStockManaged = Boolean(storeSettings.enable_stock_management);
  const stockQty = (product.stock_quantity ?? 0) as number;
  const isOutOfStock = isStockManaged && stockQty <= 0;

  const isPending = product.sync_status === 'pending';
  const isFailed = product.sync_status === 'failed';

  let displayImage = '/images/product-placeholder.svg';
  const variantsImages = (product as any).image_variants;
  const smallVariant = Array.isArray(variantsImages)
    ? variantsImages.find((v: any) => v.size === 480 || v.size === '480w')
    : null;

  if (smallVariant?.path) {
    displayImage = `/api/storage-image?path=${encodeURIComponent(smallVariant.path)}&format=webp&q=80`;
  } else if (product.image_path) {
    const path = String(product.image_path).replace(/^\/+/, '');
    displayImage = `/api/storage-image?path=${encodeURIComponent(path)}&format=webp&q=75&w=480`;
  } else if (isPending && product.external_image_url) {
    displayImage = product.external_image_url;
  } else {
    const normalizeImageInput = (input: any): string | null => {
      if (!input && input !== 0) return null;
      if (typeof input === 'string') return input.split(',')[0].trim();
      if (Array.isArray(input) && input.length > 0) {
        const first = input[0];
        return typeof first === 'string' ? first : first?.url || first?.path || null;
      }
      return null;
    };
    const candidate = normalizeImageInput(product.image_url) || normalizeImageInput(product.images);
    if (candidate) displayImage = candidate;
  }

  const costPrice = product.price || 0;
  const salePrice = (product as any).sale_price || 0;
  const showSale = isPricesVisible && storeSettings.show_sale_price !== false;
  const showCost = isPricesVisible && storeSettings.show_cost_price === true;
  
  let currentPrice = costPrice;
  if (showCost) currentPrice = costPrice;
  else if (showSale && salePrice > 0) currentPrice = salePrice;
  else currentPrice = costPrice;

  const hasValidOriginalPrice = product.original_price && product.original_price > currentPrice;
  const discountPercent = hasValidOriginalPrice
    ? Math.round(((product.original_price! - currentPrice) / product.original_price!) * 100)
    : 0;

  const inCart = cart.find((it: CartItem) => it.id === product.id);
  const qty = inCart ? inCart.quantity : 0;

  // LÓGICA DE CORES RECUPERADA
  const productVariants = (product as any).variants || [];
  const variantCount = Array.isArray(productVariants) ? productVariants.length : 0;

  const colorDots = (() => {
    try {
      if (variantCount > 0) {
        const cols = productVariants
          .map((it: any) => it?.color_hex || it?.color || it?.swatch_color)
          .filter(Boolean);
        const uniq = Array.from(new Set(cols)).slice(0, 3);
        if (uniq.length > 0) return uniq;
      }
    } catch (e) {}
    return ['#cbd5e1']; // Fallback neutro
  })();

  const additionalColors = Math.max(0, variantCount - 1);

  return (
    <>
      <div
        onClick={() => onViewDetails(product)}
        className={`group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/10 ${isOutOfStock ? 'opacity-60 grayscale' : ''}`}
      >
        <div className="relative aspect-square w-full flex items-center justify-center bg-white overflow-hidden border-b border-gray-50">
          {isPending && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/40 p-4 text-center backdrop-blur-[2px]">
              <Loader2 className="mb-1 h-6 w-6 animate-spin text-indigo-500" />
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Otimizando HD</span>
            </div>
          )}

          {!hideImages ? (
            <SmartImage
              product={{ ...product, image_url: displayImage }}
              className="h-full w-full p-4"
              imgClassName={`transition-all duration-700 ${isPending ? 'blur-sm grayscale opacity-30' : 'opacity-100'} object-contain`}
              variant="thumbnail"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center p-4 bg-gray-50 text-gray-400 font-bold text-sm">
              {product.reference_code || product.name?.slice(0, 12)}
            </div>
          )}

          <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
            {product.is_launch && <span className="flex items-center gap-1 rounded-md bg-purple-600 px-2 py-1 text-[10px] font-black text-white shadow-sm"><Zap size={10} fill="currentColor" /> Lançamento</span>}
            {product.is_best_seller && <span className="flex items-center gap-1 rounded-md bg-yellow-400 px-2 py-1 text-[10px] font-black text-yellow-900 shadow-sm"><Star size={10} fill="currentColor" /> Best Seller</span>}
            {discountPercent > 0 && showSale && <span className="rounded-md bg-red-600 px-2 py-1 text-[10px] font-black text-white shadow-md">-{discountPercent}% OFF</span>}
          </div>

          <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(product.id); }} className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2.5 text-gray-400 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:text-red-500">
            <Heart size={16} className={isFavorite ? 'fill-red-500 text-red-500' : ''} />
          </button>

          {/* INDICADOR DE CORES - REATIVADO */}
          {variantCount > 0 && (
            <div className="absolute bottom-2 right-2 z-10">
              <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-gray-100 px-2 py-1 rounded-md shadow-sm">
                <div className="flex -space-x-1.5">
                  {colorDots.map((c, i) => (
                    <div key={i} className="w-2.5 h-2.5 rounded-full border border-white" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <span className="text-[10px] font-extrabold text-gray-800 tracking-tighter">
                  {additionalColors === 0 ? 'COR' : `+ ${additionalColors} CORES`}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4">
          <div className="mb-3 flex-1">
            <p className="mb-1 font-mono text-[9px] tracking-widest text-gray-400">REF: {product.reference_code}</p>
            <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-bold text-secondary transition-colors group-hover:text-primary">{product.name}</h3>
            {product.brand && <span className="mt-1 inline-block text-[10px] font-black uppercase tracking-widest text-primary/80">{product.brand}</span>}
          </div>

          <div className="mt-auto border-t border-gray-50 pt-3">
            <div className="flex items-center justify-between gap-2 w-full">
              {isPricesVisible ? (
                <div className="flex flex-col">
                  <PriceDisplay value={currentPrice} isPricesVisible={isPricesVisible} className="text-lg font-black text-gray-900 leading-tight" />
                  <div className="mt-1">
                    {(() => {
                      const isUsingSalePrice = currentPrice === salePrice && salePrice > 0;
                      const showInstallmentsSetting = (storeSettings as any).show_installments === true;
                      if (isUsingSalePrice && showInstallmentsSetting) {
                        return getInstallmentText(currentPrice, (storeSettings as any).max_installments || 1, isPricesVisible);
                      }
                      return null;
                    })()}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[9px] font-bold text-gray-400 uppercase"><Lock size={10} /><span>Sob consulta</span></div>
              )}

              <div className="shrink-0 flex flex-col gap-2">
                {rep && (
                  <button onClick={(e) => { e.stopPropagation(); setQuickOpen(true); }} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200">
                    Pedido Rápido
                  </button>
                )}
                {qty > 0 ? (
                  <div className="flex items-center rounded-xl border border-primary/20 bg-primary/5 p-1">
                    <button onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, -1); }} className="p-1 text-primary"><Minus size={12} /></button>
                    <span className="px-2 text-xs font-black">{qty}</span>
                    <button onClick={(e) => { e.stopPropagation(); onAddToCart(product, 1); }} className="p-1 bg-primary text-white rounded-md"><Plus size={12} /></button>
                  </div>
                ) : (
                  <button onClick={(e) => { e.stopPropagation(); if (!isOutOfStock) onAddToCart(product, 1); }} disabled={isOutOfStock} className={`flex h-10 w-10 items-center justify-center rounded-xl ${isOutOfStock ? 'bg-gray-400' : 'bg-primary text-primary-foreground shadow-md'}`}>
                    <ShoppingCart size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <QuickOrderModal product={product} open={quickOpen} onClose={() => setQuickOpen(false)} />
    </>
  )
}