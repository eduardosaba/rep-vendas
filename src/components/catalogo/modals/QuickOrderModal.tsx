"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { useStore } from '../store-context'
import { useRep } from '../RepProvider'
import OrderGrid from '../OrderGrid'

export default function QuickOrderModal({ product, open, onClose }: any) {
  const { addToCart } = useStore();
  const rep = useRep();
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  if (!open) return null;

  const variants = Array.isArray((product as any).variants) && (product as any).variants.length > 0
    ? (product as any).variants
    : (product as any).product_variants || [];

  const updateQty = (id: string, val: number) => {
    setQuantities((s) => ({ ...s, [id]: Math.max(0, (s[id] || 0) + val) }));
  }

  const handleAddAll = () => {
    const entries = Object.entries(quantities).filter(([, q]) => q > 0);
    entries.forEach(([variantId, qty]) => {
      // Build minimal product object for cart
      const variant = variants.find((v: any) => (v.id || v.sku) === variantId) || {};
      const item = {
        id: variant.id || variant.sku || `${product.id}-${variantId}`,
        name: `${product.name} ${variant.name ? `- ${variant.name}` : ''}`,
        price: variant.price || product.price || 0,
      };
      for (let i = 0; i < qty; i++) {
        addToCart(item as any, 1);
      }
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-lg">Pedido Rápido — {product.name}</h3>
          <button onClick={onClose} className="p-2 rounded-full bg-slate-100"><X /></button>
        </div>
        <div className="space-y-3">
          {variants.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded">Nenhuma variação encontrada para este modelo.</div>
          ) : (
            <OrderGrid product={product} quantities={quantities} setQuantities={setQuantities} showImages={true} />
          )}
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleAddAll}>Adicionar ao Carrinho</Button>
        </div>
      </div>
    </div>
  )
}
