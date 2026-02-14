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
  const { cart, updateQuantity, hideImages } = useStore();

  // NOTE: removed verbose debug logs to avoid flooding console and causing
  // performance issues when many cards re-render.

  const isStockManaged = Boolean(storeSettings.enable_stock_management);
  const stockQty = (product.stock_quantity ?? 0) as number;
  const isOutOfStock = isStockManaged && stockQty <= 0;

  // --- LÓGICA DE IMAGEM OTIMIZADA (USANDO VARIANTES DO SCRIPT) ---
  const isPending = product.sync_status === 'pending';
  const isFailed = product.sync_status === 'failed';

  let displayImage = '/images/product-placeholder.svg';

  /**
   * 1. PRIORIDADE: Variantes geradas pelo script (image_variants)
   * Buscamos especificamente a de 480w para o Card (mais leve)
   */
  const variants = (product as any).image_variants;
  const smallVariant = Array.isArray(variants)
    ? variants.find((v: any) => v.size === 480 || v.size === '480w')
    : null;

  if (smallVariant?.path) {
    // Se temos o path da variante 480w, usamos ela via proxy
    displayImage = `/api/storage-image?path=${encodeURIComponent(smallVariant.path)}&format=webp&q=80`;
  } else if (product.image_path) {
    // 2. BACKUP: Se não houver array de variantes mas houver path principal
    const path = String(product.image_path).replace(/^\/+/, '');
    displayImage = `/api/storage-image?path=${encodeURIComponent(path)}&format=webp&q=75&w=480`;
  } else if (isPending && product.external_image_url) {
    // 3. PENDENTE: Mostra URL externa enquanto o script não processa
    displayImage = product.external_image_url;
  } else {
    // 4. FALLBACK: Lógica de candidato original (URLs externas em outros campos)
    const normalizeImageInput = (input: any): string | null => {
      if (!input && input !== 0) return null;
      if (typeof input === 'string') return input.split(',')[0].trim();
      if (Array.isArray(input) && input.length > 0) {
        const first = input[0];
        return typeof first === 'string'
          ? first
          : first?.url || first?.path || null;
      }
      return null;
    };
    const candidate =
      normalizeImageInput(product.image_url) ||
      normalizeImageInput(product.images);
    if (candidate) displayImage = candidate;
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

  const inCart = cart.find((it) => it.id === product.id);
  const qty = inCart ? inCart.quantity : 0;

  return (
    <div
      onClick={() => onViewDetails(product)}
      className={`group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/10 ${isOutOfStock ? 'opacity-60 grayscale' : ''}`}
    >
      {/* --- SEÇÃO DA IMAGEM --- */}
      <div className="relative aspect-square w-full flex items-center justify-center bg-white overflow-hidden border-b border-gray-50">
        {isPending && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/40 p-4 text-center backdrop-blur-[2px]">
            <Loader2 className="mb-1 h-6 w-6 animate-spin text-indigo-500" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">
              Otimizando HD
            </span>
          </div>
        )}

        {isFailed && !product.image_path && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-red-50/80 p-4 text-center">
            <AlertCircle className="mb-1 h-6 w-6 text-red-400" />
            <span className="text-[8px] font-bold uppercase text-red-500">
              Erro na Imagem
            </span>
          </div>
        )}

        {!hideImages ? (
          <SmartImage
            product={{ ...product, image_url: displayImage }} // Injetamos a URL calculada
            className="h-full w-full p-4"
            imgClassName={`transition-all duration-700 ${isPending ? 'blur-sm grayscale opacity-30' : 'opacity-100'} object-contain`}
            variant="thumbnail"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center p-4 bg-gray-50 text-gray-400">
            <div className="text-sm font-bold">
              {(product.reference_code || '').slice(0, 12) ||
                product.name?.slice(0, 12)}
            </div>
          </div>
        )}

        {/* TAGS E BOTÕES (MANTIDOS IGUAIS) */}
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
        </div>

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
      </div>

      {/* --- INFO E PREÇOS AJUSTADOS --- */}
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

        <div className="mt-auto border-t border-gray-50 pt-3">
          {/* Container Flex ajustado para alinhar Preço e Carrinho lado a lado */}
          <div className="flex items-center justify-between gap-2 w-full">
            {isPricesVisible ? (
              <div className="flex flex-col">
                {/* Exibe o preço principal (valor de venda ou preço de custo) */}
                <PriceDisplay
                  value={currentPrice}
                  isPricesVisible={isPricesVisible}
                  className="text-lg font-black text-gray-900 leading-tight"
                />

                {/* Preço original (riscado) quando há desconto válido */}
                {hasValidOriginalPrice && (
                  <div className="mt-1 text-xs text-gray-500 line-through">
                    <PriceDisplay
                      value={product.original_price!}
                      isPricesVisible={isPricesVisible}
                      className="text-sm font-medium"
                      size="small"
                    />
                  </div>
                )}

                {/* Parcelamento e desconto à vista (helpers) */}
                <div className="mt-1">
                  {(() => {
                    const isUsingSalePrice = salePrice > 0;
                    // Mostrar parcelamento sempre para preço de venda (salePrice>0).
                    // Para preço de custo, só mostrar se a flag `show_installments` estiver
                    // explicitamente true e `max_installments` for maior que 1.
                    if (!isPricesVisible) return null;

                    if (isUsingSalePrice) {
                      return getInstallmentText(
                        currentPrice,
                        (storeSettings as any).max_installments || 1,
                        isPricesVisible
                      );
                    }

                    // estamos exibindo o preço de custo (salePrice === 0)
                    const showInstallmentsSetting =
                      (storeSettings as any).show_installments === true;
                    const maxInst = Number(
                      (storeSettings as any).max_installments || 0
                    );
                    if (showCost && showInstallmentsSetting && maxInst > 1) {
                      return getInstallmentText(
                        currentPrice,
                        maxInst,
                        isPricesVisible
                      );
                    }
                    return null;
                  })()}
                  {getCashDiscountText(
                    currentPrice,
                    discountPercent,
                    isPricesVisible
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[9px] font-bold text-gray-400 uppercase">
                <Lock size={10} />
                <span>Sob consulta</span>
              </div>
            )}

            {/* BOTÃO DE ADICIONAR (Sempre à direita) */}
            <div className="shrink-0">
              {qty > 0 ? (
                <div className="flex items-center rounded-xl border border-primary/20 bg-primary/5 p-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateQuantity(product.id, -1);
                    }}
                    className="p-1 text-primary"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="px-2 text-xs font-black">{qty}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToCart(product, 1);
                    }}
                    className="p-1 bg-primary text-white rounded-md"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isOutOfStock) onAddToCart(product, 1);
                  }}
                  disabled={isOutOfStock}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${isOutOfStock ? 'bg-gray-400' : 'bg-primary text-primary-foreground shadow-md'} transition-all`}
                >
                  <ShoppingCart size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
