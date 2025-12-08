// src/components/catalog/modals/CartModal.tsx

'use client';

import React from 'react';
import {
  ShoppingCart,
  X,
  Plus,
  Minus,
  Trash2,
  Send,
  Loader2,
  User,
  Save,
  Download,
  Copy,
  Star,
} from 'lucide-react';
import { PriceDisplay } from '../PriceDisplay'; // Importação do utilitário PriceDisplay

// --- Tipos (Adaptados do Storefront.tsx) ---
// Note: Em um projeto real, você usaria 'import type' para evitar duplicação.
interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  reference_code: string;
  is_best_seller?: boolean;
}

interface StoreSettings {
  name: string;
  phone: string;
  show_installments: boolean;
  max_installments: number;
}

interface CartItem extends Product {
  quantity: number;
}

interface CartModalProps {
  // Dados
  cart: CartItem[];
  store: StoreSettings;
  initialProducts: Product[]; // Para área de Upsell
  isPricesVisible: boolean;

  // Funções e Estados
  setIsCartOpen: (isOpen: boolean) => void;
  setIsCheckoutOpen: (isOpen: boolean) => void;
  updateQuantity: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  addToCart: (product: Product, quantity?: number) => void;

  // Ações de Save/Load
  handleSaveCart: () => void;
  isSaving: boolean;
}

export function CartModal({
  cart,
  store,
  initialProducts,
  isPricesVisible,
  setIsCartOpen,
  setIsCheckoutOpen,
  updateQuantity,
  removeFromCart,
  addToCart,
  handleSaveCart,
  isSaving,
}: CartModalProps) {
  const cartTotal = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Produtos sugeridos para Upsell (exclui itens já no carrinho)
  const upsellProducts = initialProducts
    .filter((p) => p.is_best_seller && !cart.find((c) => c.id === p.id))
    .slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Cabeçalho do Modal */}
        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
          <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
            <ShoppingCart size={20} /> Seu Pedido ({cartCount} itens)
          </h2>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-2 text-gray-500 hover:bg-gray-200 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* Lista de Itens */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <ShoppingCart size={48} className="mb-4 opacity-20" />
              <p>Seu carrinho está vazio.</p>
              <button
                onClick={() => setIsCartOpen(false)}
                className="mt-4 rv-text-primary font-medium hover:underline"
              >
                Continuar comprando
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-3 bg-white border rounded-lg p-3 shadow-sm"
                  >
                    {/* Imagem */}
                    <div className="h-16 w-16 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          className="w-full h-full object-cover"
                          alt={item.name}
                        />
                      )}
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-medium text-sm text-gray-900 line-clamp-1">
                          {item.name}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {item.reference_code}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        {/* Preço Total do Item */}
                        <PriceDisplay
                          value={item.price * item.quantity}
                          isPricesVisible={isPricesVisible}
                          size="normal"
                          className="font-bold text-sm"
                        />

                        {/* Controle de Quantidade */}
                        <div className="flex items-center gap-3 bg-gray-100 rounded-lg px-2 py-1">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-0.5 hover:text-red-600"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="text-xs font-bold w-4 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-0.5 hover:text-green-600"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Botão Remover */}
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-gray-300 hover:text-red-500 self-start"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {/* UPSELL AREA */}
              {upsellProducts.length > 0 && (
                <div className="mt-8 pt-6 border-t border-dashed border-gray-200">
                  <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Star
                      size={14}
                      className="text-yellow-500 fill-yellow-500"
                    />{' '}
                    Aproveite também
                  </h4>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {upsellProducts.map((p) => (
                      <div
                        key={p.id}
                        className="min-w-[120px] w-[120px] border rounded-lg p-2 flex flex-col bg-gray-50"
                      >
                        <div className="h-20 w-full bg-white rounded mb-2 overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {p.image_url && (
                            <img
                              src={p.image_url}
                              className="w-full h-full object-cover"
                              alt={p.name}
                            />
                          )}
                        </div>
                        <p className="text-xs font-medium truncate mb-1">
                          {p.name}
                        </p>
                        <PriceDisplay
                          value={p.price}
                          isPricesVisible={isPricesVisible}
                          size="normal"
                          className="text-xs font-bold rv-text-primary"
                        />
                        <button
                          onClick={() => addToCart(p)}
                          className="mt-2 w-full py-1 bg-white border border-indigo-200 rv-text-primary text-xs font-bold rounded hover:bg-indigo-50"
                        >
                          Add +
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer do Modal (Total e Ações) */}
        {cart.length > 0 && (
          <div className="p-4 border-t bg-gray-50 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Estimado</span>
              <PriceDisplay
                value={cartTotal}
                isPricesVisible={isPricesVisible}
                size="large"
                className="font-bold text-gray-900"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleSaveCart}
                disabled={isSaving}
                className="py-3 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Save size={18} />
                )}{' '}
                Salvar
              </button>
              <button
                onClick={() => setIsCheckoutOpen(true)}
                className="py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 bg-[#25D366] hover:brightness-105"
              >
                <Send size={18} /> Finalizar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
