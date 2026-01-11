'use client';

import { useState } from 'react';
import { Plus, Minus, Loader2 } from 'lucide-react';
import { getProductImageUrl } from '@/lib/imageUtils';
import { updateStockAction } from './actions';
import { toast } from 'sonner';

interface InventoryRowProps {
  product: any;
}

export function InventoryRow({ product }: InventoryRowProps) {
  const [loading, setLoading] = useState(false);
  const [currentStock, setCurrentStock] = useState(product.stock_quantity);

  const handleUpdate = async (amount: number) => {
    if (currentStock + amount < 0) return;

    setLoading(true);
    const result = await updateStockAction(product.id, amount);

    if (result.success) {
      setCurrentStock(result.newQuantity);
    } else {
      toast.error('Erro ao atualizar estoque');
    }
    setLoading(false);
  };

  const isLow = currentStock <= product.min_stock_level;

  return (
    <tr className="hover:bg-gray-50/50 transition-colors border-b border-gray-50 last:border-0">
      <td className="p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden border border-gray-100">
            {(() => {
              const { src, isExternal } = getProductImageUrl(product);
              if (src) {
                // eslint-disable-next-line @next/next/no-img-element
                return (
                  <img
                    src={src}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                );
              }

              return (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  N/A
                </div>
              );
            })()}
          </div>
          <div>
            <p className="font-bold text-slate-800 leading-tight">
              {product.name}
            </p>
            <p className="text-[10px] font-black text-gray-400 uppercase mt-1">
              Mínimo: {product.min_stock_level} un.
            </p>
          </div>
        </div>
      </td>

      <td className="p-6">
        <span
          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
            currentStock <= 0
              ? 'bg-red-100 text-red-600'
              : isLow
                ? 'bg-orange-100 text-orange-600'
                : 'bg-emerald-100 text-emerald-600'
          }`}
        >
          {currentStock <= 0 ? 'Esgotado' : isLow ? 'Crítico' : 'Estável'}
        </span>
      </td>

      <td className="p-6 text-center">
        <div className="relative inline-block">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50">
              <Loader2 className="animate-spin text-primary" size={16} />
            </div>
          )}
          <span
            className={`text-2xl font-black tabular-nums ${isLow ? 'text-red-500' : 'text-slate-700'}`}
          >
            {currentStock}
          </span>
        </div>
      </td>

      <td className="p-6">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => handleUpdate(-1)}
            disabled={loading || currentStock <= 0}
            className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition-all active:scale-90 disabled:opacity-30"
          >
            <Minus size={18} />
          </button>
          <button
            onClick={() => handleUpdate(1)}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-emerald-500 hover:border-emerald-200 transition-all active:scale-90"
          >
            <Plus size={18} />
          </button>
        </div>
      </td>
    </tr>
  );
}
