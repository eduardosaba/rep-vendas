'use client';

import { useStore } from '@/components/catalogo/store-context';
import { ChevronRight } from 'lucide-react';

export const CategoryBar = () => {
  const {
    categories = [],
    categoriesWithData = [],
    setSelectedCategory,
    brandsWithLogos = [],
    setSelectedBrand,
    genders = [],
    gendersWithData = [],
    setSelectedGender,
    showOnlyNew,
    setShowOnlyNew,
    showOnlyBestsellers,
    setShowOnlyBestsellers,
    store,
  } = useStore();

  const gendersList =
    Array.isArray(gendersWithData) && gendersWithData.length > 0
      ? gendersWithData
      : Array.isArray(genders)
        ? genders.map((name: any) => ({ name, image_url: null }))
        : [];

  const categoriesList =
    Array.isArray(categoriesWithData) && categoriesWithData.length > 0
      ? categoriesWithData
      : Array.isArray(categories)
        ? categories.map((name: any) => ({ name, image_url: null }))
        : [];

  const displayedBrands = brandsWithLogos.slice(0, 7);

  // Se não houver filtros para mostrar, não renderiza a barra
  if (
    brandsWithLogos.length === 0 &&
    gendersList.length === 0 &&
    categoriesList.length === 0
  ) {
    return null;
  }

  return (
    <div className="w-full bg-white/80 backdrop-blur-lg border-b border-t border-black/5 z-40 sticky top-[60px] md:top-[80px]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center lg:justify-start h-16">
          <div className="flex items-center space-x-8 h-full">
            {/* DROPDOWN: MARCAS */}
            {brandsWithLogos && brandsWithLogos.length > 0 && (
              <div className="relative group h-full flex items-center">
                <button className="menu-link relative flex items-center text-sm font-semibold uppercase tracking-wider text-gray-800 py-6 outline-none">
                  Marcas
                </button>
                <div className="dropdown-content absolute left-1/2 -translate-x-1/2 top-full mt-2 w-[650px] bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
                  <div className="grid grid-cols-4 gap-6">
                    {displayedBrands.map((brand) => (
                      <button
                        key={brand.name}
                        onClick={() => setSelectedBrand(brand.name)}
                        className="brand-logo-container border border-gray-50 rounded-2xl p-6 flex items-center justify-center h-24"
                      >
                        {brand.logo_url ? (
                          <img
                            src={brand.logo_url}
                            alt={brand.name}
                            className="max-h-10 object-contain"
                          />
                        ) : (
                          <span className="text-xs font-bold text-center text-gray-500 uppercase">
                            {brand.name}
                          </span>
                        )}
                      </button>
                    ))}
                    <button
                      onClick={() => setSelectedBrand('all')}
                      className="brand-logo-container border border-dashed border-gray-200 rounded-2xl p-6 flex items-center justify-center h-24 bg-gray-50"
                    >
                      <span className="text-xs font-bold text-gray-400 uppercase">
                        Ver Todas
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* DROPDOWN: GÊNERO */}
            {gendersList && gendersList.length > 0 && (
              <div className="relative group h-full flex items-center">
                <button className="menu-link relative text-sm font-semibold uppercase tracking-wider text-gray-800 py-6 outline-none">
                  Gênero
                </button>
                <div className="dropdown-content absolute left-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden flex flex-col p-2">
                  {gendersList.map((gender) => (
                    <button
                      key={gender.name}
                      onClick={() => setSelectedGender(gender.name)}
                      className="hover:bg-gray-50 px-6 py-4 text-left text-sm font-semibold uppercase tracking-tighter text-gray-700 rounded-xl transition-colors"
                    >
                      {gender.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* DROPDOWN: CATEGORIA */}
            {categoriesList && categoriesList.length > 0 && (
              <div className="relative group h-full flex items-center">
                <button className="menu-link relative text-sm font-semibold uppercase tracking-wider text-gray-800 py-6 outline-none">
                  Categoria
                </button>
                <div className="dropdown-content absolute left-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-lg border border-gray-100 p-4">
                  <div className="flex flex-col space-y-1">
                    {categoriesList.map((cat) => (
                      <button
                        key={cat.name}
                        onClick={() => setSelectedCategory(cat.name)}
                        className="flex items-center justify-between hover:bg-gray-50 px-4 py-3 rounded-xl group/item"
                      >
                        <span className="text-sm font-semibold uppercase text-gray-700">
                          {cat.name}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover/item:text-black transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* LINKS SIMPLES */}
            <button
              onClick={() => setShowOnlyBestsellers(!showOnlyBestsellers)}
              className={`menu-link relative text-sm font-semibold uppercase tracking-wider py-6 ${showOnlyBestsellers ? 'text-primary' : 'text-gray-800'}`}
            >
              Best Sellers
            </button>

            <div className="relative group h-full flex items-center">
              <button
                onClick={() => setShowOnlyNew(!showOnlyNew)}
                className={`menu-link relative text-sm font-semibold uppercase tracking-wider py-6 ${showOnlyNew ? 'text-primary' : 'text-gray-800'}`}
              >
                Lançamentos
                {showOnlyNew && (
                  <span className="absolute top-5 -right-3 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
