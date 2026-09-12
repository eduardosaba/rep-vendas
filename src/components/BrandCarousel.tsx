'use client';

import React, { useMemo, useState } from 'react';
import { useStore } from '@/components/catalogo/store-context';
import type { Product } from '@/lib/types';

export function BrandCarousel() {
  // 1. Acessamos os produtos filtrados e as marcas com logos do contexto
  const { displayProducts, brandsWithLogos } = useStore();

  // 2. Extraímos as marcas únicas (String) dos produtos
  const brands = useMemo(() => {
    if (!displayProducts || displayProducts.length === 0) return [];

    // Filtra nomes de marcas válidos e remove duplicatas
    const brandNames = (displayProducts as Product[])
      .map((p) => p.brand)
      .filter(
        (b): b is string => !!b && typeof b === 'string' && b.trim().length > 0
      );

    const uniqueNames = Array.from(new Set(brandNames)).sort();

    // Cria o objeto para o carrossel usando o logo_url do banco quando disponível
    return uniqueNames.map((name) => {
      const needle = name.trim().toLowerCase();
      const foundWithLogo = (brandsWithLogos || []).find(
        (b: any) => String(b.name || '').trim().toLowerCase() === needle
      );
      const logoUrl =
        foundWithLogo?.logo_url ||
        `/brands/${name.toLowerCase().trim().replace(/\s+/g, '-')}.png`;
      return {
        name,
        logoPath: logoUrl,
      };
    });
  }, [displayProducts, brandsWithLogos]);

  // Se não houver marcas no catálogo, não exibe o componente
  if (brands.length === 0) return null;

  return (
    <div className="w-full py-6 bg-white border-y border-gray-100 mb-6 block">
      <div className="container mx-auto px-4">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-4">
          Nossas Marcas
        </p>

        {/* 
            AJUSTES NO CONTAINER:
            1. snap-x + snap-mandatory: Faz com que a marca "pare" centralizada ao arrastar.
            2. scroll-smooth: Suaviza o movimento.
            3. touch-pan-x: Melhora a captura do gesto no mobile.
        */}
        <div className="flex items-center gap-8 overflow-x-auto pb-4 scrollbar-hide snap-x snap-proximity touch-pan-x select-none cursor-grab active:cursor-grabbing">
  {brands.map((brand, index) => (
    <div key={`${brand.name}-${index}`} className="snap-center shrink-0">
      <BrandItem brand={brand} />
    </div>
  ))}
</div>
      </div>
    </div>
  );
}

// Subcomponente para controlar o erro de imagem individualmente
function BrandItem({ brand }: { brand: { name: string; logoPath: string } }) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="flex-shrink-0 relative group z-10 hover:z-50 py-2">
      <div className="h-8 md:h-12 flex items-center justify-center min-w-[80px]">
        {!imageError ? (
          <img
            src={brand.logoPath}
            alt={brand.name}
            className="h-full w-auto object-contain max-w-[140px] select-none transition-transform duration-300 ease-out group-hover:scale-[2] hover:scale-[2] origin-center cursor-pointer group-hover:drop-shadow-xl"
            onError={() => setImageError(true)}
            draggable={false}
          />
        ) : (
          <span className="text-sm md:text-base font-bold text-gray-400 whitespace-nowrap px-2 select-none transition-transform duration-300 ease-out group-hover:scale-[1.8] hover:scale-[1.8]">
            {brand.name}
          </span>
        )}
      </div>
    </div>
  );
}
