'use client'

import React from 'react'
import { useDraftCart } from '../use-draft-cart'

interface CartItemProps {
  item: any
}

export function CartItem({ item }: CartItemProps) {
  const { executeUpdateQuantity, executeRemoveItem } = useDraftCart()
  const subtotal = item.quantity * item.unit_price

  return (
    <div className="p-4 bg-[var(--brand-secondary)] border border-[var(--brand-border)] rounded-xl flex flex-col gap-3 transition-all hover:border-slate-300">
      <div className="flex justify-between items-start gap-2">
        <div>
          <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
            {item.product?.brand || 'Grife'}
          </span>
          <h4 className="font-bold text-sm text-[var(--brand-text)] mt-1 line-clamp-1">{item.product?.name || 'Modelo Óptico'}</h4>
          <p className="font-mono text-[11px] text-slate-400 font-bold">Ref: {item.product?.reference_code || 'N/A'}</p>
        </div>
        <button 
          onClick={() => executeRemoveItem(item.id)}
          className="text-slate-400 hover:text-rose-600 transition-colors text-xs p-1"
          title="Remover da pré-venda"
        >
          🗑️
        </button>
      </div>

      <div className="flex items-center justify-between gap-4 pt-1 border-t border-dashed border-[var(--brand-border)]">
        <div className="flex items-center border border-[var(--brand-border)] bg-[var(--brand-background)] rounded-lg overflow-hidden">
          <button onClick={() => executeUpdateQuantity(item.id, item.quantity - 1)} className="px-2.5 py-1 text-xs font-bold hover:bg-slate-100 text-slate-500 transition-colors" disabled={item.quantity <= 1}>-</button>
          <span className="px-3 py-1 text-xs font-bold text-[var(--brand-text)] min-w-[24px] text-center font-mono">{item.quantity}</span>
          <button onClick={() => executeUpdateQuantity(item.id, item.quantity + 1)} className="px-2.5 py-1 text-xs font-bold hover:bg-slate-100 text-slate-500 transition-colors">+</button>
        </div>

        <div className="text-right">
          <p className="text-[10px] text-slate-400 font-medium font-mono">
            {parseFloat(item.unit_price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} un
          </p>
          <p className="font-black text-sm text-[var(--brand-text)] font-mono">
            {subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
      </div>
    </div>
  )
}
