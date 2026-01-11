'use client';

import { useState } from 'react';
import { Plus, Minus, Loader2 } from 'lucide-react';
import { getProductImageUrl } from '@/lib/imageUtils';
import { updateStockAction } from './actions';
import { toast } from 'sonner';

export function InventoryCard({ product }: { product: any }) {
  const [loading, setLoading] = useState(false);
  const [currentStock, setCurrentStock] = useState(product.stock_quantity);

  const handleUpdate = async (amount: number) => {
    if (currentStock + amount < 0) return;
    setLoading(true);
    const result = await updateStockAction(product.id, amount);
    if (result.success) {
      setCurrentStock(result.newQuantity);
      toast.success('Estoque atualizado');
    } else {
      toast.error('Erro ao atualizar estoque');
    }
    setLoading(false);
  };

  const isLow = currentStock <= product.min_stock_level;

  return (
    <div className="p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden border border-gray-100 flex items-center justify-center">
          {(() => {
            const { src, isExternal } = getProductImageUrl(product);
            if (src) {
              if (isExternal) {
                // eslint-disable-next-line @next/next/no-img-element
                return (
                  <img
                    src={src}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                );
              }
              // internal storage URL (optimized)
              return (
                <img
                  src={src}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              );
            }

            return <div className="text-gray-300">N/A</div>;
          })()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
            {product.name}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            Mínimo: {product.min_stock_level} un.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div
            className={`text-2xl font-black tabular-nums ${isLow ? 'text-red-500' : 'text-slate-700'}`}
          >
            {currentStock}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleUpdate(-1)}
              disabled={loading || currentStock <= 0}
              className="p-2 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition-all active:scale-95 disabled:opacity-40"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <Minus size={14} />
              )}
            </button>
            <button
              onClick={() => handleUpdate(1)}
              disabled={loading}
              className="p-2 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-emerald-500 hover:border-emerald-200 transition-all active:scale-95"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
