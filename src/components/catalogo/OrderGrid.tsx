"use client"

import React from 'react'

export default function OrderGrid({ product, quantities, setQuantities, showImages = true }: any) {
  const variants = Array.isArray(product?.variants) && product.variants.length > 0 ? product.variants : product?.product_variants || [];

  const updateQty = (id: string, delta: number) => {
    setQuantities((s: any) => ({ ...s, [id]: Math.max(0, (s[id] || 0) + delta) }));
  }

  return (
    <div className="space-y-4">
      {variants.map((variant: any) => (
        <div key={variant.id || variant.sku} className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
          {showImages ? (
            <img src={variant.image_url || variant.thumbnail || product.image_url || ''} alt={variant.name || variant.sku} className="w-16 h-10 object-cover rounded-lg shadow-sm" />
          ) : null}

          <div className="flex-1">
            <p className="text-[10px] font-black uppercase text-slate-400">{variant.color_code || variant.sku || ''}</p>
            <p className="text-xs font-bold text-slate-900">{variant.color_name || variant.name || '—'}</p>
          </div>

          <div className="flex items-center gap-3 bg-white p-1 rounded-xl border">
            <button onClick={() => updateQty(variant.id || variant.sku, -1)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-primary">-</button>
            <input type="number" className="w-12 text-center font-black text-sm border-none focus:ring-0" value={quantities[variant.id || variant.sku] || 0} onChange={(e) => setQuantities((s: any) => ({ ...s, [variant.id || variant.sku]: Math.max(0, Number(e.target.value || 0)) }))} />
            <button onClick={() => updateQty(variant.id || variant.sku, 1)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-primary">+</button>
          </div>
        </div>
      ))}
    </div>
  )
}
