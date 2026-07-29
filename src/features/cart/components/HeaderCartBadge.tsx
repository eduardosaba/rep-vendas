'use client'

import React from 'react'
import { useDraftCart } from '../use-draft-cart'

export function HeaderCartBadge() {
  const { setIsOpen } = useDraftCart()

  return (
    <button 
      onClick={() => setIsOpen(true)}
      className="relative p-1 hover:opacity-80 transition-opacity flex items-center justify-center"
      title="Ver Bloco de Pré-Venda"
    >
      <span className="text-xl">🛒</span>
      <span className="absolute -top-1 -right-1 bg-[var(--brand-primary)] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
        !
      </span>
    </button>
  )
}
