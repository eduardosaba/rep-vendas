// src/components/catalogo/BrandProvider.tsx
'use client'

import React from 'react'
import { BrandConfig } from '@/actions/commercial/branding'

interface BrandProviderProps {
  brand: BrandConfig
  children: React.ReactNode
}

/**
 * PROVIDER DE BRANDING DINÂMICO
 * Aplica as variáveis CSS customizadas da distribuidora em runtime na árvore DOM.
 */
export function BrandProvider({ brand, children }: BrandProviderProps) {
  const brandStyles = {
    '--brand-primary': brand.primaryColor,
    '--brand-secondary': brand.secondaryColor,
    '--brand-accent': brand.accentColor,
  } as React.CSSProperties

  return (
    <div style={brandStyles} className="min-h-screen bg-slate-50">
      {children}
    </div>
  )
}
