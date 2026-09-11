"use client";

import React from 'react';
import Link from 'next/link';

export interface BrandOrCollectionItem {
  id?: string;
  name: string;
  type?: 'brand' | 'collection';
  brand_name?: string;
  logo_url?: string | null;
}

export default function BrandFilterBar({
  brands = [],
  collections = [],
  activeBrand,
  activeCollection,
  mode = 'both',
}: {
  brands?: BrandOrCollectionItem[];
  collections?: BrandOrCollectionItem[];
  activeBrand?: string | null;
  activeCollection?: string | null;
  mode?: 'brands' | 'collections' | 'both';
}) {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

  const showBrands = (mode === 'brands' || mode === 'both') && Array.isArray(brands) && brands.length > 0;
  const showCollections = (mode === 'collections' || mode === 'both') && Array.isArray(collections) && collections.length > 0;

  if (!showBrands && !showCollections) return null;

  return (
    <div className="py-4 space-y-4">
      {/* SEÇÃO 1: MARCAS */}
      {showBrands && (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Marcas Comercializadas
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {brands.map((brand) => {
              const brandKey = brand.name;
              const isActive = String(activeBrand || '').toLowerCase() === brandKey.toLowerCase();
              const href = isActive
                ? currentPath
                : `${currentPath}?marca=${encodeURIComponent(brandKey)}`;

              return (
                <Link
                  href={href}
                  key={brand.id || brandKey}
                  className={`flex-shrink-0 px-5 py-2.5 rounded-2xl border transition-all flex items-center gap-2.5 ${
                    isActive
                      ? 'bg-slate-900 border-slate-900 text-white shadow-md scale-105'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-primary/50'
                  }`}
                >
                  {brand.logo_url ? (
                    <img src={brand.logo_url} className="h-4 object-contain" alt={brandKey} />
                  ) : null}
                  <span className="text-[11px] font-black uppercase tracking-widest">
                    {brandKey}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* SEÇÃO 2: COLEÇÕES DESTAQUE */}
      {showCollections && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Coleções e Linhas em Destaque
          </p>
          <div className="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar">
            {collections.map((col) => {
              const collectionKey = col.name;
              const isActive = String(activeCollection || '').toLowerCase() === collectionKey.toLowerCase();
              const href = isActive
                ? currentPath
                : `${currentPath}?colecao=${encodeURIComponent(collectionKey)}`;

              return (
                <Link
                  href={href}
                  key={col.id || collectionKey}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    isActive
                      ? 'bg-primary text-white shadow-sm scale-105'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {col.brand_name ? (
                    <span className="text-[9px] opacity-70 uppercase tracking-wider">{col.brand_name} /</span>
                  ) : null}
                  <span>{collectionKey}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
