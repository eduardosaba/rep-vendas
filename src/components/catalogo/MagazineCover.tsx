'use client';

import React from 'react';
import { useStore } from './store-context';
import { SmartImage } from './SmartImage';

interface MagazineCoverProps {
  title: string;
  subtitle?: string;
}

export function MagazineCover({ title, subtitle }: MagazineCoverProps) {
  const { store } = useStore();

  const primaryColor = store.primary_color || '#1F6FEB';
  const secondaryColor = store.secondary_color || '#0D1B2C';

  return (
    <div
      className="relative w-full h-full flex flex-col justify-between overflow-hidden shadow-2xl"
      style={{
        background: `linear-gradient(135deg, ${secondaryColor} 0%, #000 100%)`,
      }}
    >
      {/* Detalhe Estético Superior (Linha de Grife) */}
      <div className="h-3 w-full" style={{ backgroundColor: primaryColor }} />

      {/* Background Decorativo (Pattern sutil) */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(${primaryColor} 1px, transparent 1px)`,
            backgroundSize: '30px 30px',
          }}
        />
      </div>

      {/* Conteúdo Central */}
      <div className="relative z-10 flex flex-col items-center px-8 text-center mt-12">
        {/* Logo Principal */}
        <div className="mb-8 p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl">
          {store.logo_url ? (
            <div className="h-24 w-48 relative">
              <SmartImage
                product={{ image_url: store.logo_url, name: store.name }}
                imgClassName="object-contain"
                className="w-full h-full"
              />
            </div>
          ) : (
            <h2 className="text-3xl font-bold text-white tracking-tighter italic">
              {store.name}
            </h2>
          )}
        </div>

        {/* Título da Coleção */}
        <div className="mt-6">
          <h1 className="text-5xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none mb-4">
            {title}
          </h1>
          <div
            className="h-1 w-24 bg-white mx-auto mb-6"
            style={{ backgroundColor: primaryColor }}
          />
          {subtitle && (
            <p className="text-xl text-white/70 font-light tracking-[0.2em] uppercase">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Rodapé da Capa (Dados do Representante) */}
      <div className="relative z-10 p-10 bg-white/5 backdrop-blur-lg border-t border-white/10 flex justify-between items-end">
        <div className="text-left">
          <p className="text-xs text-white/50 uppercase tracking-widest mb-1">
            Representante Oficial
          </p>
          <p className="text-lg font-bold text-white">{store.name}</p>
          <p className="text-sm text-white/70">{store.email}</p>
        </div>

        <div className="text-right">
          <p
            className="text-2xl font-black text-white"
            style={{ color: primaryColor }}
          >
            2026
          </p>
          <p className="text-[10px] text-white/40 uppercase tracking-widest">
            Edição Digital
          </p>
        </div>
      </div>

      {/* Selo de Qualidade Animado (CSS apenas) */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 rounded-full border border-white/10 flex items-center justify-center animate-pulse">
        <div className="text-[10px] text-white/20 font-bold uppercase tracking-widest rotate-12">
          Premium Quality
        </div>
      </div>
    </div>
  );
}
