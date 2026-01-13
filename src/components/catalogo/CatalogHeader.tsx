'use client';

import { useRouter } from 'next/navigation';
import { useStore } from './store-context';
import { Search, Heart, ShoppingCart, LogIn, Phone, Mail } from 'lucide-react';
import { useRef } from 'react';
import Image from 'next/image';
import { Settings } from '../../lib/types';
import { normalizePhone } from '@/lib/phone';
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
  const inputRef = useRef<HTMLInputElement | null>(null);

  const router = useRouter();
  const { customerSession, clearCustomerSession } = useStore();

  return (
    <header
      className="border-b border-gray-200 bg-white"
      style={{
        backgroundColor: settings?.header_background_color || '#FFFFFF',
      }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className="flex items-center justify-between py-2 text-sm"
          style={{ color: settings?.icon_color || '#4B5563' }}
        >
          <div className="flex items-center space-x-4">
            {(settings?.phone || settings?.email) && (
              <div className="flex items-center gap-3">
                {settings?.phone &&
                  (() => {
                    const raw = String(settings.phone || '').replace(/\D/g, '');
                    const digits = raw.startsWith('55') ? raw : `55${raw}`;
                    const display = normalizePhone(settings.phone);
                    return (
                      <a
                        href={`https://wa.me/${digits}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Chamar no WhatsApp ${display}`}
                        className="flex items-center gap-2 hover:underline"
                      >
                        <Phone size={16} />
                        <span className="hidden sm:inline">{display}</span>
                      </a>
                    );
                  })()}
                {settings?.email && (
                  <a
                    href={`mailto:${settings.email}`}
                    aria-label={`Enviar email para ${settings.email}`}
                    className="flex items-center gap-2 hover:underline"
                  >
                    <Mail size={16} />
                    <span className="hidden sm:inline">{settings.email}</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between py-4">
          <div className="flex items-center space-x-8">
            <div className="relative h-14 w-auto">
              <Image
                src={settings?.logo_url || SYSTEM_LOGO_URL}
                alt={settings?.store_name || 'Rep-Vendas'}
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
            {customerSession ? (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                  {customerSession.name?.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    Que bom ver você de novo!
                  </p>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-gray-900">
                      Olá, {customerSession.name.split(' ')[0]} 👋
                    </h3>
                    <button
                      onClick={() => {
                        clearCustomerSession();
                        router.refresh();
                      }}
                      className="text-xs text-gray-500 hover:underline"
                    >
                      Não é você?
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
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
