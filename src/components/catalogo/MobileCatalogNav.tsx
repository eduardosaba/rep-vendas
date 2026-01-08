'use client';

import { useStore } from '@/components/catalogo/store-context';
import { Home, Eye, EyeOff, Heart, ShoppingCart, FileText } from 'lucide-react';
import Link from 'next/link';

export function MobileCatalogNav() {
  const {
    cart,
    showPrices,
    toggleShowPrices,
    setModal,
    store,
    // Assumindo que existe setIsFavoritesOpen ou navegação para favoritos
    // Se não tiver, ajuste o link/ação conforme sua lógica
  } = useStore();

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Lógica: Se preços de custo visíveis, mostra Ver Pedido ao invés de Favoritos
  const showCostPrice = store?.show_cost_price && showPrices;

  return (
    <div className="fixed bottom-0 left-0 z-40 w-full bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 md:hidden pb-safe">
      <div className="grid h-16 grid-cols-5 mx-auto font-medium">
        {/* 1. Início */}
        <Link
          href="/" // Ajuste se a home do catálogo for outra rota
          className="inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-slate-800 group"
        >
          <Home className="w-6 h-6 text-gray-500 dark:text-gray-400 group-hover:text-[var(--primary)]" />
          <span className="text-[10px] text-gray-500 dark:text-gray-400 group-hover:text-[var(--primary)]">
            Início
          </span>
        </Link>

        {/* 2. Ver Preço (Toggle) */}
        <button
          onClick={toggleShowPrices}
          type="button"
          className="inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-slate-800 group"
        >
          {showPrices ? (
            <Eye className="w-6 h-6 text-[var(--primary)]" />
          ) : (
            <EyeOff className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          )}
          <span
            className={`text-[10px] ${showPrices ? 'text-[var(--primary)]' : 'text-gray-500 dark:text-gray-400'}`}
          >
            {showPrices ? 'Ocultar' : 'Ver Preço'}
          </span>
        </button>

        {/* 3. Favoritos */}
        <button
          type="button"
          onClick={() => setModal('favorites', true)}
          className="inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-slate-800 group"
        >
          <Heart className="w-6 h-6 text-gray-500 dark:text-gray-400 group-hover:text-red-500" />
          <span className="text-[10px] text-gray-500 dark:text-gray-400 group-hover:text-red-500">
            Favoritos
          </span>
        </button>

        {/* 4. Ver Pedido (sempre visível) */}
        <button
          type="button"
          onClick={() => setModal('load', true)}
          className="inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-slate-800 group"
        >
          <FileText className="w-6 h-6 text-gray-500 dark:text-gray-400 group-hover:text-[var(--primary)]" />
          <span className="text-[10px] text-gray-500 dark:text-gray-400 group-hover:text-[var(--primary)]">
            Ver Pedido
          </span>
        </button>

        {/* 4. Carrinho */}
        <button
          type="button"
          // Adicione a lógica de abrir carrinho aqui (ex: setIsCartOpen(true))
          className="inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-slate-800 group relative"
        >
          <ShoppingCart className="w-6 h-6 text-gray-500 dark:text-gray-400 group-hover:text-[var(--primary)]" />
          <span className="text-[10px] text-gray-500 dark:text-gray-400 group-hover:text-[var(--primary)]">
            Carrinho
          </span>

          {cartCount > 0 && (
            <div className="absolute top-2 right-4 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-white dark:border-slate-900">
              {cartCount}
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
