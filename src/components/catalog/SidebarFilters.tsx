"use client";

import { Settings } from "../../lib/types";

interface SidebarFiltersProps {
  settings: Settings | null;
  showFilters: boolean;
  priceRange: [number, number];
  onPriceChange: (range: [number, number]) => void;
  allBrands: string[];
  selectedBrands: string[];
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
}) => {
  if (
    settings?.show_filter_price === false &&
    settings?.show_filter_category === false
  ) {
    return null;
  }

  return (
    <aside className={`w-64 pr-6 ${showFilters ? "block" : "hidden"} md:block`}>
      <div className="bg-white p-4 rounded shadow-sm">
        <h3 className="font-medium text-gray-900 mb-4">Filtros</h3>

        {settings?.show_filter_price !== false && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Marcas
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {allBrands.map((brand) => (
                <label key={brand} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(brand)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onBrandChange([...selectedBrands, brand]);
                      } else {
                        onBrandChange(
                          selectedBrands.filter((b) => b !== brand),
                        );
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">{brand}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {settings?.show_filter_bestseller !== false && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <span className="text-sm text-gray-700 flex items-center">
                  ⭐ Bestsellers
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showOnlyNew}
                  onChange={(e) => onNewChange(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 flex items-center">
                  🆕 Novos Lançamentos
                </span>
              </label>
            </div>
          </div>
        )}

        <button
          onClick={onClearFilters}
          className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded hover:bg-gray-200"
        >
          Limpar Filtros
        </button>
      </div>
    </aside>
  );
};
