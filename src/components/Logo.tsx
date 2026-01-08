'use client';

import React from 'react';
import Image from 'next/image';
import { Store } from 'lucide-react';
import type { Settings } from '@/lib/types';
import { SYSTEM_LOGO_URL } from '@/lib/constants';

interface LogoProps {
  settings?: Settings | null;
  className?: string;
  showText?: boolean;
  variant?: 'dark' | 'light';
  useSystemLogo?: boolean;
}

export function Logo({
  settings,
  className = 'h-12 w-auto',
  showText = false,
  variant = 'dark',
  useSystemLogo = false,
}: LogoProps) {
  const SYSTEM_NAME = 'Rep-Vendas';

  const [systemLogoError, setSystemLogoError] = React.useState(false);
  const [userLogoError, setUserLogoError] = React.useState(false);

  if (useSystemLogo) {
    if (systemLogoError) {
      // Fallback visual quando logo falha (offline/404)
      return (
        <div className="flex items-center gap-2">
          <div
            className={`p-2 rounded-lg ${variant === 'light' ? 'bg-white/10 text-white' : 'bg-primary/5 rv-text-primary'}`}
          >
            <Store size={24} />
          </div>
          {showText && (
            <span
              className={`font-bold text-xl ${variant === 'light' ? 'text-white' : 'text-[#0d1b2c]'}`}
            >
              Rep<span className="text-[#b9722e]">Vendas</span>
            </span>
          )}
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <div className={`${className} relative`}>
          <Image
            src={SYSTEM_LOGO_URL}
            alt={SYSTEM_NAME}
            fill
            style={{ objectFit: 'contain' }}
            sizes="48px"
            onError={() => setSystemLogoError(true)}
          />
        </div>
        {showText && (
          <span
            className={`font-bold text-xl ${variant === 'light' ? 'text-white' : 'text-[#0d1b2c]'}`}
          >
            Rep<span className="text-[#b9722e]">Vendas</span>
          </span>
        )}
      </div>
    );
  }

  if (settings?.logo_url && !userLogoError) {
    return (
      <div className={`${className} relative`}>
        <Image
          src={settings.logo_url}
          alt={settings.name || 'Logo da Loja'}
          fill
          style={{ objectFit: 'contain' }}
          onError={() => setUserLogoError(true)}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className={`p-2 rounded-lg ${variant === 'light' ? 'bg-white/10 text-white' : 'bg-primary/5 rv-text-primary'}`}
      >
        <Store size={24} />
      </div>
      <span
        className={`font-bold text-lg ${variant === 'light' ? 'text-white' : 'text-gray-900'}`}
      >
        {settings?.name || 'Minha Loja'}
      </span>
    </div>
  );
}

export default Logo;
