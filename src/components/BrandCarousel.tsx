'use client';

import React, { useMemo, useState } from 'react';
import { useStore } from '@/components/catalogo/store-context';
import type { Product } from '@/lib/types';

export function BrandCarousel() {
  // 1. Acessamos os produtos filtrados do contexto (displayProducts)
  const { displayProducts } = useStore();

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

    // Cria o objeto para o carrossel
    return uniqueNames.map((name) => ({
      name: name,
      // Tenta gerar um caminho de logo padrão: "Ray-Ban" -> "/brands/ray-ban.png"
      // Se não tiver a imagem na pasta public/brands, o fallback de erro vai tratar
      logoPath: `/brands/${name.toLowerCase().trim().replace(/\s+/g, '-')}.png`,
    }));
  }, [displayProducts]);

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
    <div className="flex-shrink-0 pointer-events-none"> {/* O segredo está aqui */}
      <div className="h-8 md:h-12 flex items-center justify-center min-w-[80px]">
        {!imageError ? (
          <img
            src={brand.logoPath}
            alt={brand.name}
            className="h-full w-auto object-contain max-w-[140px] select-none"
            onError={() => setImageError(true)}
            draggable={false} // Impede o navegador de tentar arrastar o arquivo da imagem
          />
        ) : (
          <span className="text-sm md:text-base font-bold text-gray-400 whitespace-nowrap px-2 select-none">
            {brand.name}
          </span>
        )}
      </div>
    </div>
  );
}
