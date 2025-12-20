'use client';

import {
  Heart,
  Zap,
  Star,
  ShoppingCart,
  Image as ImageIcon,
  Lock,
  Plus,
  Minus,
} from 'lucide-react';
import Image from 'next/image';
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

type Product = LibProduct;

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
  // --- IMAGEM (Pega a capa) ---
  const getDisplayImage = () => {
    // Prioridade 1: Caminho local no storage
    if (product.image_path)
      return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/${product.image_path}`;

    // Prioridade 2: URL Externa direta
    if (product.image_url) return product.image_url;
    if (product.external_image_url) return product.external_image_url;

    // Prioridade 3: Array de imagens (pega a primeira)
    if (product.images && product.images.length > 0) return product.images[0];

    return null;
  };

  const displayImage = getDisplayImage();
  const [imageFailed, setImageFailed] = useState(false);

  // --- LÓGICA DE PREÇOS ---
  // CORRETO: price = custo, sale_price = preço de venda sugerido
  const costPrice = product.price || 0;
  const salePrice = (product as any).sale_price || 0;
  // Se não tiver sale_price, usa costPrice como preço de venda também
  const currentPrice = salePrice > 0 ? salePrice : costPrice;

  const hasValidOriginalPrice =
    product.original_price && product.original_price > currentPrice;
  const discountPercent = hasValidOriginalPrice
    ? Math.round(
        ((product.original_price! - currentPrice) / product.original_price!) *
          100
      )
    : 0;

  // VISIBILIDADE
  const showSale = isPricesVisible && storeSettings.show_sale_price !== false;
  const showCost = isPricesVisible && storeSettings.show_cost_price === true;
  const isCostOnlyMode = showCost && !showSale;

  const handleViewDetails = (e: React.MouseEvent) => {
    // Evita abrir detalhes se clicar em botões de ação
    if (
      !(e.target as HTMLElement).closest('button, a, [data-action="no-open"]')
    ) {
      onViewDetails(product);
    }
  };

  const { cart, updateQuantity } = useStore();

  const primaryColor = storeSettings.primary_color || '#4f46e5'; // Fallback padrão

  return (
    <div
      onClick={handleViewDetails}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col h-full group cursor-pointer relative"
    >
      {/* --- IMAGEM --- */}
      <div className="aspect-[4/5] relative bg-white overflow-hidden border-b border-gray-50">
        {displayImage && !imageFailed ? (
          <div className="relative w-full h-full">
            <Image
              src={displayImage}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
              style={{ objectFit: 'contain' }}
              className="group-hover:scale-105 transition-transform duration-700 p-6"
              loading="lazy"
              quality={80}
              onError={() => setImageFailed(true)}
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <Image
              src="/placeholder-no-image.svg"
              alt="Sem imagem"
              fill
              style={{ objectFit: 'contain' }}
              className="p-6 opacity-60"
            />
          </div>
        )}

        {imageFailed && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-20">
            <Image
              src="/placeholder-no-image.svg"
              alt="Imagem não disponível"
              fill
              style={{ objectFit: 'contain' }}
              className="p-6 opacity-60"
            />
          </div>
        )}

        {/* TAGS */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 items-start">
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
          {!isCostOnlyMode &&
            showSale &&
            storeSettings.show_cash_discount &&
            hasValidOriginalPrice &&
            discountPercent > 0 && (
              <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md">
                -{discountPercent}% OFF
              </span>
            )}
        </div>

        {/* FAVORITO */}
        <button
          data-action="no-open"
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

        {/* ADD CART HOVER (DESKTOP APENAS)
            Adicionado 'hidden md:block' para manter comportamento original só no desktop
        */}
        <div className="hidden md:block absolute bottom-0 inset-x-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black/60 to-transparent z-20">
          <Button
            data-action="no-open"
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product);
            }}
            style={{
              backgroundColor: primaryColor,
              color: '#ffffff',
              borderColor: primaryColor,
            }}
            className="w-full shadow-lg hover:opacity-90 active:scale-95 border-0"
            size="md"
            leftIcon={<ShoppingCart size={16} />}
          >
            Adicionar
          </Button>
        </div>
      </div>

      {/* --- INFO PRODUTO --- */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex-1">
          <p className="text-[10px] text-gray-400 font-mono mb-1 tracking-wide">
            REF: {product.reference_code}
          </p>
          <h3
            className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 mb-1 min-h-[2.5em]"
            title={product.name}
          >
            {product.name}
          </h3>
          {product.brand && (
            <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">
              {product.brand}
            </p>
          )}
        </div>

        {/* --- RODAPÉ / PREÇOS --- */}
        {/* Alterado para flex row para acomodar botão mobile à direita */}
        <div className="mt-auto pt-3 border-t border-gray-50 flex items-end justify-between gap-2">
          {/* Coluna de Preços (Ocupa o espaço restante, com overflow hidden) */}
          <div className="flex flex-col gap-1 flex-1 min-w-0 overflow-hidden">
            {isPricesVisible ? (
              <>
                {isCostOnlyMode ? (
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500 uppercase font-bold mb-0.5">
                      Preço de Custo
                    </span>
                    <span className="font-bold text-gray-900 leading-none text-lg sm:text-2xl tracking-tight">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(costPrice)}
                    </span>
                    {storeSettings.enable_stock_management &&
                    (product.stock_quantity ?? 0) <= 0 ? (
                      <span className="text-[10px] text-gray-400 mt-1">
                        Venda não disponível
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <>
                    {/* Mostrar ambos os preços quando as duas opções estão ativas */}
                    {showCost && showSale && costPrice > 0 && (
                      <div className="flex justify-between items-center bg-yellow-50 px-2 py-1.5 rounded text-[10px] text-yellow-800 border border-yellow-100 mb-2">
                        <span className="font-bold uppercase tracking-wide">
                          Custo
                        </span>
                        <span className="font-mono font-bold text-xs">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(costPrice)}
                        </span>
                      </div>
                    )}

                    {/* Preço principal (venda ou custo se só tiver um) */}
                    {showSale ? (
                      <>
                        {hasValidOriginalPrice && (
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
                              value={currentPrice}
                              isPricesVisible={isPricesVisible}
                              size="normal"
                              className="font-bold text-red-600 leading-none text-lg"
                            />
                          </div>
                        </div>
                      </>
                    ) : showCost && costPrice > 0 ? (
                      /* Modo apenas custo (destaque) */
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">
                          Preço de Custo
                        </span>
                        <PriceDisplay
                          value={costPrice}
                          isPricesVisible={isPricesVisible}
                          size="normal"
                          className="font-bold text-primary leading-none text-lg"
                        />
                      </div>
                    ) : null}

                    {/* Parcelamento e Desconto */}
                    {(() => {
                      const priceForInstallment =
                        showSale && salePrice > 0 ? salePrice : costPrice;

                      return (
                        <>
                          {storeSettings.show_installments &&
                            priceForInstallment > 0 &&
                            getInstallmentText(
                              priceForInstallment,
                              storeSettings.max_installments || 1,
                              isPricesVisible
                            )}
                          {storeSettings.show_cash_discount &&
                            priceForInstallment > 0 &&
                            getCashDiscountText(
                              priceForInstallment,
                              storeSettings.cash_price_discount_percent || 0,
                              isPricesVisible
                            )}
                        </>
                      );
                    })()}

                    {/* QUICK QUANTITY CONTROLS (quando já no carrinho) */}
                    {(() => {
                      const inCart = cart.find((it) => it.id === product.id);
                      const qty = inCart ? inCart.quantity : 0;
                      return qty > 0 ? (
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            data-action="no-open"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateQuantity(product.id, -1);
                            }}
                            className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center border"
                          >
                            <Minus size={16} />
                          </button>
                          <div className="min-w-[36px] text-center font-bold">
                            {qty}
                          </div>
                          <button
                            data-action="no-open"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToCart(product, 1);
                            }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{
                              backgroundColor: primaryColor,
                              color: '#fff',
                            }}
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      ) : null;
                    })()}
                  </>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center gap-1.5 py-3 text-xs text-gray-400 bg-gray-50/50 rounded-lg select-none">
                <Lock size={12} />
                <span>Preço restrito (Senha)</span>
              </div>
            )}
          </div>

          {/* BOTÃO MOBILE (CARRINHO) 
            Visível apenas no mobile (md:hidden). Substitui o hover do desktop.
            flex-shrink-0 garante que o botão não seja comprimido
          */}
          <button
            data-action="no-open"
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product, 1);
            }}
            className="md:hidden flex items-center justify-center h-10 w-10 flex-shrink-0 rounded-xl text-white shadow-md hover:opacity-90 active:scale-95 transition-all"
            style={{ backgroundColor: primaryColor }}
            aria-label="Adicionar ao carrinho"
          >
            <ShoppingCart size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
