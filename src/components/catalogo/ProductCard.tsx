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
  Clock,
} from 'lucide-react';
import { SmartImage } from './SmartImage';
import React, { useState } from 'react';
import { useStore } from '@/components/catalogo/store-context';
import {
  PriceDisplay,
  getInstallmentText,
  getCashDiscountText,
} from './PriceDisplay';
import { Button } from '@/components/ui/Button';
import type {
  Product as LibProduct,
  Settings as StoreSettings,
} from '@/lib/types';

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
  const [imageFailed, setImageFailed] = useState(false);
  const { cart, updateQuantity } = useStore();

  const isStockManaged = Boolean(storeSettings.enable_stock_management);
  const stockQty = (product.stock_quantity ?? 0) as number;
  const isOutOfStock = isStockManaged && stockQty <= 0;

  // --- LÓGICA DE IMAGEM PADRONIZADA ---
  const isPending = product.sync_status === 'pending';
  const isFailed = product.sync_status === 'failed';
  // Preferência de exibição (com validação defensiva):
  // 1) Se existe `image_path` (interno) usamos a versão -small gerada pelo worker
  // 2) Se está pendente (sync_status === 'pending') e houver `external_image_url`, mostramos a URL externa
  // 3) Caso contrário, normalizamos e usamos `image_url`/`images[0]` convertidos para -small quando aplicável
  let displayImage = '/images/product-placeholder.svg';

  const normalizeImageInput = (input: any): string | null => {
    if (!input && input !== 0) return null;
    if (typeof input === 'string') {
      const first = input.split(',')[0].trim();
      return first || null;
    }
    if (Array.isArray(input) && input.length > 0) {
      const first = input[0];
      if (typeof first === 'string') return first.split(',')[0].trim();
      if (first && typeof first === 'object')
        return (
          first.url ||
          first.src ||
          first.publicUrl ||
          first.public_url ||
          first.path ||
          null
        );
      return null;
    }
    if (typeof input === 'object' && input !== null) {
      return (
        input.url ||
        input.src ||
        input.publicUrl ||
        input.public_url ||
        input.path ||
        null
      );
    }
    return null;
  };

  const candidate =
    normalizeImageInput(product.image_path) ||
    normalizeImageInput(product.image_url) ||
    normalizeImageInput(product.external_image_url) ||
    normalizeImageInput(product.images) ||
    null;

  if (product.image_path) {
    const path = String(product.image_path).replace(/^\/+/, '');
    // Use server proxy to serve storage objects (handles private buckets)
    displayImage = `/api/storage-image?path=${encodeURIComponent(path)}&format=webp&q=75&w=600`;
  } else if (
    isPending &&
    product.external_image_url &&
    typeof product.external_image_url === 'string'
  ) {
    displayImage = product.external_image_url;
  } else if (candidate) {
    if (!candidate.startsWith('http')) {
      const path = String(candidate).replace(/^\/+/, '');
      displayImage = `/api/storage-image?path=${encodeURIComponent(path)}&format=webp&q=75&w=600`;
    } else {
      displayImage = candidate;
    }
  }

  // --- LÓGICA DE PREÇOS ---
  const costPrice = product.price || 0;
  const salePrice = (product as any).sale_price || 0;
  const currentPrice = salePrice > 0 ? salePrice : costPrice;

  const hasValidOriginalPrice =
    product.original_price && product.original_price > currentPrice;
  const discountPercent = hasValidOriginalPrice
    ? Math.round(
        ((product.original_price! - currentPrice) / product.original_price!) *
          100
      )
    : 0;

  const showSale = isPricesVisible && storeSettings.show_sale_price !== false;
  const showCost = isPricesVisible && storeSettings.show_cost_price === true;
  const isCostOnlyMode = showCost && !showSale;

  const inCart = cart.find((it) => it.id === product.id);
  const qty = inCart ? inCart.quantity : 0;

  return (
    <div
      onClick={() => onViewDetails(product)}
      className={`group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/10 ${isOutOfStock ? 'opacity-60 grayscale' : ''}`}
    >
      {/* --- SEÇÃO DA IMAGEM (PADRONIZADA) --- */}
      <div className="relative aspect-square w-full flex items-center justify-center bg-white overflow-hidden border-b border-gray-50">
        {/* Overlay de Otimização */}
        {isPending && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/40 p-4 text-center backdrop-blur-[2px]">
            <Loader2 className="mb-1 h-6 w-6 animate-spin text-indigo-500" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">
              Otimizando HD
            </span>
          </div>
        )}

        {/* Overlay de Falha: mostrar somente se falhou E NÃO houver imagem externa/nenhuma imagem disponível */}
        {isFailed && !candidate && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-red-50/80 p-4 text-center">
            <AlertCircle className="mb-1 h-6 w-6 text-red-400" />
            <span className="text-[8px] font-bold uppercase text-red-500">
              Erro na Imagem
            </span>
          </div>
        )}

        <SmartImage
          product={product}
          className={`h-full w-full p-4`}
          imgClassName={`transition-all duration-700 ${isPending ? 'blur-sm grayscale opacity-30' : 'opacity-100'} object-contain`}
        />

        {/* TAGS DE DESTAQUE COM OPACIDADE */}
        <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
          {product.is_launch && (
            <span className="flex items-center gap-1 rounded-md bg-purple-600 px-2 py-1 text-[10px] font-black text-white shadow-sm">
              <Zap size={10} fill="currentColor" /> Lançamento
            </span>
          )}
          {product.is_best_seller && (
            <span className="flex items-center gap-1 rounded-md bg-yellow-400 px-2 py-1 text-[10px] font-black text-yellow-900 shadow-sm">
              <Star size={10} fill="currentColor" /> Best Seller
            </span>
          )}
          {discountPercent > 0 && showSale && (
            <span className="rounded-md bg-red-600 px-2 py-1 text-[10px] font-black text-white shadow-md">
              -{discountPercent}% OFF
            </span>
          )}
          {isOutOfStock && (
            <span className="ml-auto rounded-md bg-red-600 px-2 py-1 text-[10px] font-black text-white shadow-md">
              ESGOTADO
            </span>
          )}
        </div>

        {/* BOTÃO FAVORITO */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(product.id);
          }}
          className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2.5 text-gray-400 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:text-red-500"
        >
          <Heart
            size={16}
            className={isFavorite ? 'fill-red-500 text-red-500' : ''}
          />
        </button>

        {/* OVERLAY DE COMPRA RÁPIDA (DESKTOP) */}
        <div className="absolute inset-x-0 bottom-0 z-20 hidden translate-y-full bg-gradient-to-t from-black/40 p-4 transition-transform duration-300 group-hover:translate-y-0 md:block">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              if (isOutOfStock) return;
              onAddToCart(product);
            }}
            disabled={isOutOfStock}
            className={`w-full ${isOutOfStock ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
            leftIcon={<ShoppingCart size={16} />}
          >
            {isOutOfStock ? 'Indisponível' : 'Adicionar'}
          </Button>
        </div>
      </div>

      {/* --- INFO DO PRODUTO --- */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-3 flex-1">
          <p className="mb-1 font-mono text-[9px] tracking-widest text-gray-400">
            REF: {product.reference_code}
          </p>
          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-bold text-secondary transition-colors group-hover:text-primary">
            {product.name}
          </h3>
          {product.brand && (
            <span className="mt-1 inline-block text-[10px] font-black uppercase tracking-widest text-primary/80">
              {product.brand}
            </span>
          )}
        </div>

        {/* --- RODAPÉ E PREÇOS --- */}
        <div className="mt-auto border-t border-gray-50 pt-3">
          <div className="flex items-end justify-between gap-2">
            <div className="flex-1 min-w-0">
              {isPricesVisible ? (
                <div className="space-y-0.5">
                  {showCost && showSale && costPrice > 0 && (
                    <div className="mb-2 flex items-center justify-between rounded-lg border border-yellow-100 bg-yellow-50/50 px-2 py-1">
                      <span className="text-[9px] font-black uppercase text-yellow-700">
                        Custo
                      </span>
                      <span className="text-[11px] font-bold text-yellow-800">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(costPrice)}
                      </span>
                    </div>
                  )}

                  {showSale ? (
                    <div className="flex flex-col">
                      {hasValidOriginalPrice && (
                        <span className="text-[10px] text-gray-400 line-through">
                          De:{' '}
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(product.original_price!)}
                        </span>
                      )}
                      <div className="flex items-baseline gap-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">
                          Por
                        </span>
                        <PriceDisplay
                          value={currentPrice}
                          isPricesVisible={isPricesVisible}
                          className="text-xl font-black text-red-600"
                        />
                      </div>
                    </div>
                  ) : (
                    showCost && (
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase text-gray-400">
                          Preço de Custo
                        </span>
                        <PriceDisplay
                          value={costPrice}
                          isPricesVisible={isPricesVisible}
                          className="text-xl font-black text-primary"
                        />
                      </div>
                    )
                  )}

                  {/* INFO DE PARCELAMENTO */}
                  <div className="mt-1 flex flex-col text-[10px] font-medium text-gray-500">
                    {storeSettings.show_installments &&
                      currentPrice > 0 &&
                      getInstallmentText(
                        currentPrice,
                        storeSettings.max_installments || 1,
                        showSale
                      )}
                    {storeSettings.show_cash_discount &&
                      currentPrice > 0 &&
                      getCashDiscountText(
                        currentPrice,
                        storeSettings.cash_price_discount_percent || 0,
                        showSale
                      )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg bg-gray-50 py-3 text-center text-[10px] font-bold text-gray-400">
                  <Lock size={12} className="ml-auto" />
                  <span className="mr-auto uppercase">Preço Restrito</span>
                </div>
              )}
            </div>

            {/* AÇÕES MOBILE / QUANTIDADE */}
            <div className="flex flex-col items-center gap-2">
              {qty > 0 ? (
                <div className="flex items-center overflow-hidden rounded-xl border border-primary/20 bg-primary/5 p-1 shadow-sm">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateQuantity(product.id, -1);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white text-primary transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center text-sm font-black text-secondary">
                    {qty}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isOutOfStock) onAddToCart(product, 1);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white shadow-sm"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isOutOfStock) onAddToCart(product, 1);
                  }}
                  disabled={isOutOfStock}
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isOutOfStock ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'} transition-all active:scale-90 md:hidden`}
                >
                  <ShoppingCart size={22} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
