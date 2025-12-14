'use client';

import { useRouter } from 'next/navigation';
import { Search, Heart, ShoppingCart, LogIn } from 'lucide-react';
import Image from 'next/image';
import { Settings } from '../../lib/types';
import { SYSTEM_LOGO_URL } from '@/lib/constants';

interface CatalogHeaderProps {
  settings: Settings | null;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  cart: { [key: string]: number };
  favorites: Set<string>;
  userId: string;
  loadedOrderCode?: string | null;
}

export const CatalogHeader: React.FC<CatalogHeaderProps> = ({
  settings,
  searchTerm,
  onSearchChange,
  cart,
  favorites,
  userId,
  loadedOrderCode,
}) => {
  const router = useRouter();

  return (
    <header
      className="border-b border-gray-200 bg-white"
      style={{ backgroundColor: settings?.header_color || '#FFFFFF' }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className="flex items-center justify-between py-2 text-sm"
          style={{ color: settings?.icon_color || '#4B5563' }}
        >
          <div className="flex items-center space-x-4">
            {settings?.phone && (
              <>
                <span>📞 {settings.phone}</span>
                {settings?.email && <span>|</span>}
              </>
            )}
            {settings?.email && <span>✉️ {settings.email}</span>}
          </div>
        </div>

        <div className="flex items-center justify-between py-4">
          <div className="flex items-center space-x-8">
            <div className="relative h-14 w-auto">
              <Image
                src={settings?.logo_url || SYSTEM_LOGO_URL}
                alt={settings?.name || 'Rep-Vendas'}
                fill
                style={{ objectFit: 'contain' }}
              />
            </div>
          </div>

          <div className="mx-8 max-w-2xl flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-3 pl-4 pr-12 text-lg focus:border-transparent focus:ring-2 focus:ring-blue-500"
              />
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700"
                style={{
                  backgroundColor: settings?.primary_color || '#4f46e5', // Fallback: Indigo-600
                }}
              >
                <Search className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <button
              onClick={() => router.push('/favorites')}
              className="flex flex-col items-center text-gray-600 hover:text-gray-900"
              style={{ color: settings?.icon_color || '#4B5563' }}
            >
              <Heart className="h-6 w-6" />
              <span className="text-xs">Favoritos ({favorites.size})</span>
            </button>
            <button
              onClick={() => router.push(`/catalogo/${userId}/checkout`)}
              className="flex flex-col items-center text-gray-600 hover:text-gray-900"
              style={{ color: settings?.icon_color || '#4B5563' }}
            >
              <ShoppingCart className="h-6 w-6" />
              <span className="text-xs">
                Pedido (
                {loadedOrderCode
                  ? loadedOrderCode
                  : Object.values(cart).reduce((total, qty) => total + qty, 0)}
                )
              </span>
            </button>
            <button
              onClick={() => router.push('/login')}
              className="flex flex-col items-center text-gray-600 hover:text-gray-900"
              style={{ color: settings?.icon_color || '#4B5563' }}
            >
              <LogIn className="h-6 w-6" />
              <span className="text-xs">Entrar</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
