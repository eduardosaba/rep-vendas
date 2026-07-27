import React from 'react'
import { ApplicationContext } from '@/core/context/application-context'
import { HeaderCartBadge } from '@/features/cart/components/HeaderCartBadge'

interface DistributorHeaderProps {
  context: ApplicationContext
}

export function DistributorHeader({ context }: DistributorHeaderProps) {
  return (
    <header className="h-14 bg-white border-b border-[var(--brand-border)] px-8 flex items-center justify-between shadow-sm shrink-0">
      <div className="text-xs font-semibold text-[var(--brand-text)] opacity-70">
        Ambiente Seguro • RepVendas Enterprise v2.6
      </div>
      <div className="flex items-center gap-4">
        <HeaderCartBadge />
        <div className="w-2.5 h-2.5 rounded-full bg-[var(--brand-accent)] shadow-sm animate-pulse" />
        <span className="text-xs font-bold text-[var(--brand-text)] opacity-80 uppercase tracking-wider">
          Sincronizado
        </span>
      </div>
    </header>
  )
}
