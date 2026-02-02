'use client';

import React from 'react';
import Image from 'next/image';
import { Settings } from '../../lib/types';

interface SidebarFiltersProps {
  settings: Settings | null;
  showFilters: boolean;
  priceRange: [number, number];
  onPriceChange: (range: [number, number]) => void;
  allBrands: string[];
  selectedBrands: string[];
  brandLogos?: Record<string, string | null>;
  onBrandChange: (brands: string[]) => void;
  onClearFilters: () => void;
  formatPrice: (price: number) => string;
  showOnlyBestsellers: boolean;
  showOnlyNew: boolean;
  onBestsellerChange: (show: boolean) => void;
  onNewChange: (show: boolean) => void;
}

export const SidebarFilters: React.FC<SidebarFiltersProps> = ({
  settings,
  showFilters,
  priceRange,
  onPriceChange,
  allBrands,
  selectedBrands,
  onBrandChange,
  onClearFilters,
  formatPrice,
  showOnlyBestsellers,
  showOnlyNew,
  onBestsellerChange,
  onNewChange,
  brandLogos,
}) => {
  if (
    settings?.show_filter_price === false &&
    settings?.show_filter_category === false
  ) {
    return null;
  }

  return (
    // FIX: Adicionado sticky, top-24 e self-start para travar o sidebar no topo
    // FIX: h-fit garante que ele não estique desnecessariamente
    <aside
      className={`w-64 pr-6 shrink-0 ${showFilters ? 'block' : 'hidden'} md:block sticky top-24 self-start h-fit`}
    >
      <div className="rounded bg-white p-4 shadow-sm border border-gray-100">
        <h3 className="mb-4 font-bold text-gray-900">Filtros</h3>

        {settings?.show_filter_price !== false && (
          <div className="mb-6">
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Faixa de Preço
            </label>
            <div className="space-y-3">
              <input
                type="range"
                min="0"
                max="10000"
                value={priceRange[1]}
                onChange={(e) =>
                  onPriceChange([priceRange[0], parseInt(e.target.value)])
                }
                className="w-full accent-primary cursor-pointer"
              />
              <div className="flex justify-between text-xs font-medium text-gray-600">
                <span>R$ {formatPrice(priceRange[0])}</span>
                <span>R$ {formatPrice(priceRange[1])}</span>
              </div>
            </div>
          </div>
        )}

        {settings?.show_filter_category !== false && (
          <div className="mb-6">
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Marcas
            </label>
            <div className="max-h-60 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 pr-2">
              {allBrands.map((brand) => (
                <label
                  key={brand}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(brand)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onBrandChange([...selectedBrands, brand]);
                      } else {
                        onBrandChange(
                          selectedBrands.filter((b) => b !== brand)
                        );
                      }
                    }}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div className="h-6 w-6 flex-shrink-0 flex items-center justify-center">
                    {brandLogos && brandLogos[brand] ? (
                      <div className="relative h-6 w-6">
                        <Image
                          src={String(brandLogos[brand])}
                          alt={`${brand} logo`}
                          fill
                          style={{ objectFit: 'contain' }}
                          className="rounded mix-blend-multiply"
                        />
                      </div>
                    ) : (
                      <div className="h-6 w-6 rounded bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                        {brand.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-gray-600 group-hover:text-primary transition-colors">
                    {brand}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {settings?.show_filter_bestseller !== false && (
          <div className="mb-6 pt-4 border-t border-gray-100">
            <div className="space-y-3">
              <label className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  checked={showOnlyBestsellers}
                  onChange={(e) => onBestsellerChange(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="ml-2 flex items-center text-sm text-gray-700 group-hover:text-primary transition-colors">
                  <span className="mr-2">⭐</span> Best Seller
                </span>
              </label>
              <label className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  checked={showOnlyNew}
                  onChange={(e) => onNewChange(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="ml-2 flex items-center text-sm text-gray-700 group-hover:text-primary transition-colors">
                  <span className="mr-2">🆕</span> Lançamentos
                </span>
              </label>
            </div>
          </div>
        )}

        <button
          onClick={onClearFilters}
          className="w-full rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Limpar Filtros
        </button>
      </div>
    </aside>
  );
};
