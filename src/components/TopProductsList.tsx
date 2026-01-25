import React from 'react';
import { TrendingUp, Eye } from 'lucide-react';

interface TopProduct {
  id: string;
  name: string;
  reference_code: string;
  image_url: string;
  views: number;
}

export const TopProductsList = ({ products }: { products: TopProduct[] }) => {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">
            Mais Vistos
          </h3>
          <p className="text-sm text-slate-500">
            Modelos que despertaram mais interesse
          </p>
        </div>
        <TrendingUp className="text-blue-500" size={24} />
      </div>

      <div className="space-y-4">
        {products.map((product, index) => (
          <div
            key={product.id}
            className="flex items-center gap-4 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors"
          >
            <span className="text-sm font-black text-slate-300 w-4">
              #{index + 1}
            </span>
            <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700">
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-800 dark:text-white truncate">
                {product.reference_code}
              </h4>
              <p className="text-xs text-slate-500 truncate">{product.name}</p>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
              <Eye size={12} />
              <span className="text-xs font-bold">{product.views}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopProductsList;
