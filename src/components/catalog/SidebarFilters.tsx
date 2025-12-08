'use client';

import React from 'react';
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
    <aside className={`w-64 pr-6 ${showFilters ? 'block' : 'hidden'} md:block`}>
      <div className="rounded bg-white p-4 shadow-sm">
        <h3 className="mb-4 font-medium text-gray-900">Filtros</h3>

        {settings?.show_filter_price !== false && (
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Preço
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="10000"
                value={priceRange[1]}
                onChange={(e) =>
                  onPriceChange([priceRange[0], parseInt(e.target.value)])
                }
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-600">
                <span>R$ {formatPrice(priceRange[0])}</span>
                <span>R$ {formatPrice(priceRange[1])}</span>
              </div>
            </div>
          </div>
        )}

        {settings?.show_filter_category !== false && (
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Marcas
            </label>
            <div className="max-h-60 space-y-2 overflow-y-auto">
              {allBrands.map((brand) => (
                <label key={brand} className="flex items-center gap-3">
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
                    className="mr-2"
                  />
                  <div className="h-6 w-6 flex-shrink-0 flex items-center justify-center">
                    {brandLogos && brandLogos[brand] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={brandLogos[brand] || ''}
                        alt={`${brand} logo`}
                        className="h-6 w-6 object-contain rounded"
                      />
                    ) : (
                      <div className="h-6 w-6 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                        {brand.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-gray-700">{brand}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {settings?.show_filter_bestseller !== false && (
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Destaques
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showOnlyBestsellers}
                  onChange={(e) => onBestsellerChange(e.target.checked)}
                  className="mr-2"
                />
                <span className="flex items-center text-sm text-gray-700">
                  ⭐ Best sellers
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showOnlyNew}
                  onChange={(e) => onNewChange(e.target.checked)}
                  className="mr-2"
                />
                <span className="flex items-center text-sm text-gray-700">
                  🆕 Novos Lançamentos
                </span>
              </label>
            </div>
          </div>
        )}

        <button
          onClick={onClearFilters}
          className="w-full rounded bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200"
        >
          Limpar Filtros
        </button>
      </div>
    </aside>
  );
};
