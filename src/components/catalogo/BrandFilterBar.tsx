"use client"

import React from 'react'
import Link from 'next/link'

export default function BrandFilterBar({ brands, activeBrand }: { brands: any[]; activeBrand?: string | null }) {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''

  return (
    <div className="py-6">
      <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar">
        {brands.map((brand) => {
          const isActive = String(activeBrand || '') === String(brand?.slug || brand?.name || '')
          const href = isActive ? currentPath : `${currentPath}?marca=${encodeURIComponent(brand?.slug || brand?.name)}`
          return (
            <Link
              href={href}
              key={brand.id || brand.name}
              className={`flex-shrink-0 px-6 py-3 rounded-2xl border transition-all flex items-center gap-3 ${
                isActive ? 'bg-slate-900 border-slate-900 text-white shadow-lg scale-105' : 'bg-white border-slate-100 text-slate-500 hover:border-primary'
              }`}
            >
              {brand.logo_url ? <img src={brand.logo_url} className="h-4 object-contain" alt={brand.name} /> : null}
              <span className="text-[11px] font-black uppercase tracking-widest">{brand.name}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
