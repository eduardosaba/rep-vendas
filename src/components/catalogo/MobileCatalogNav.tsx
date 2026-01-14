'use client';

import { useStore } from '@/components/catalogo/store-context';
import {
  Home,
  Eye,
  EyeOff,
  Heart,
  ShoppingCart,
  FileText,
  Phone,
} from 'lucide-react';
import Link from 'next/link';
import AnimatedTouch from '@/components/ui/AnimatedTouch';

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

  const formatWhatsappUrl = (phone?: string) => {
    if (!phone) return '#';
    const digits = String(phone).replace(/\D/g, '');
    return `https://wa.me/${digits.startsWith('55') ? digits : `55${digits}`}`;
  };

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
          <AnimatedTouch>
            <Home className="w-6 h-6 text-gray-500 dark:text-gray-400 group-hover:text-[var(--primary)]" />
          </AnimatedTouch>
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
          <AnimatedTouch onClick={toggleShowPrices}>
            {showPrices ? (
              <Eye className="w-6 h-6 text-[var(--primary)]" />
            ) : (
              <EyeOff className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            )}
          </AnimatedTouch>
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
          <AnimatedTouch onClick={() => setModal('favorites', true)}>
            <Heart className="w-6 h-6 text-gray-500 dark:text-gray-400 group-hover:text-red-500" />
          </AnimatedTouch>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 group-hover:text-red-500">
            Favoritos
          </span>
        </button>

        {/* 4. WhatsApp / Contato (substitui Ver Pedido) */}
        {store?.phone ? (
          <a
            href={formatWhatsappUrl(store.phone)}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-slate-800 group"
            aria-label={`WhatsApp ${store.phone}`}
          >
            <AnimatedTouch>
              <Phone className="w-6 h-6 text-green-500" />
            </AnimatedTouch>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 group-hover:text-[var(--primary)]">
              WhatsApp
            </span>
          </a>
        ) : (
          <button
            type="button"
            onClick={() => setModal('contact', true)}
            className="inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-slate-800 group"
          >
            <AnimatedTouch>
              <Phone className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            </AnimatedTouch>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 group-hover:text-[var(--primary)]">
              Contato
            </span>
          </button>
        )}

        {/* 4. Carrinho */}
        <button
          type="button"
          // Adicione a lógica de abrir carrinho aqui (ex: setIsCartOpen(true))
          className="inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-slate-800 group relative"
        >
          <AnimatedTouch>
            <ShoppingCart className="w-6 h-6 text-gray-500 dark:text-gray-400 group-hover:text-[var(--primary)]" />
          </AnimatedTouch>
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
