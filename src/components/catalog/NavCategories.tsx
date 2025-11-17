'use client';

import { Settings } from '../../lib/types';

interface NavCategoriesProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  settings: Settings | null;
}

export const NavCategories: React.FC<NavCategoriesProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  settings,
}) => {
  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center space-x-8">
            <span className="text-lg font-semibold text-gray-900">
              Categorias
            </span>
            <div className="flex items-center space-x-6 overflow-x-auto">
              {categories.slice(0, 6).map((category) => (
                <button
                  key={category}
                  onClick={() => onSelectCategory(category)}
                  className={`whitespace-nowrap text-sm font-medium ${
                    selectedCategory === category
                      ? 'border-b-2 border-blue-600 pb-1 text-blue-600'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">|</span>
            {settings?.show_filter_new !== false && (
              <button className="text-sm text-gray-700 hover:text-gray-900">
                Lançamentos
              </button>
            )}
            {settings?.show_filter_bestseller !== false && (
              <button className="text-sm text-gray-700 hover:text-gray-900">
                Best Sellers
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
