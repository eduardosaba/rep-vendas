'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { CompanyPageBlock } from '@/lib/company-page-content';
import { Package, Sparkles, Search, Check, X, Grid, LayoutList } from 'lucide-react';

interface ProductsBlockEditorProps {
  block: CompanyPageBlock;
  onChange: (updated: CompanyPageBlock) => void;
  availableBrands?: Array<{ id: string; name: string }>;
  availableCategories?: Array<{ id: string; name: string }>;
}

export function ProductsBlockEditor({
  block,
  onChange,
  availableBrands = [],
  availableCategories = [],
}: ProductsBlockEditorProps) {
  const title = block.data.productsTitle ?? 'Produtos em Destaque';
  const source = block.data.productsSource || 'featured';
  const brandId = block.data.productsBrandId || '';
  const categoryId = block.data.productsCategoryId || '';
  const limit = block.data.productsLimit || 8;
  const layout = block.data.productsLayout || 'grid';
  const manualIds: string[] = Array.isArray(block.data.productIds) ? block.data.productIds : [];

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; price?: number; image_url?: string; brand_name?: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchReqCountRef = useRef(0);

  const update = (patch: Partial<CompanyPageBlock['data']>) => {
    onChange({
      ...block,
      data: {
        ...block.data,
        ...patch,
      },
    });
  };

  // Busca debounced com proteção contra race-conditions
  useEffect(() => {
    if (!searchQuery.trim() || source !== 'manual') {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const currentReq = ++searchReqCountRef.current;
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/company/products/search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const json = await res.json();
          if (currentReq === searchReqCountRef.current && Array.isArray(json?.products)) {
            setSearchResults(json.products);
          }
        }
      } catch {
        // Ignora erros de rede na busca
      } finally {
        if (currentReq === searchReqCountRef.current) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, source]);

  const toggleManualProduct = (id: string) => {
    const exists = manualIds.includes(id);
    const nextIds = exists ? manualIds.filter((item) => item !== id) : [...manualIds, id];
    update({ productIds: nextIds });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Título da Seção</label>
        <input
          type="text"
          value={title}
          onChange={(e) => update({ productsTitle: e.target.value })}
          placeholder="Ex: Lançamentos da Estação, Produtos em Destaque..."
          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
        />
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Origem dos Produtos</label>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {[
            { value: 'featured', label: 'Produtos em Destaque', desc: 'Filtra por destaque (is_featured)' },
            { value: 'launches', label: 'Lançamentos da Loja', desc: 'Filtra produtos novos (is_launch)' },
            { value: 'brand', label: 'Por Marca', desc: 'Filtra por uma marca específica' },
            { value: 'category', label: 'Por Categoria', desc: 'Filtra por uma categoria' },
            { value: 'manual', label: 'Seleção Manual', desc: 'Escolha produtos individualmente' },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => update({ productsSource: item.value as any })}
              className={`rounded-xl border p-2.5 text-left transition-all ${
                source === item.value
                  ? 'border-blue-600 bg-blue-50/80 text-blue-700 font-bold shadow-sm'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="text-xs">{item.label}</div>
              <div className="text-[10px] text-slate-400 font-normal mt-0.5">{item.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {source === 'brand' && (
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Selecionar Marca</label>
          <select
            value={brandId}
            onChange={(e) => update({ productsBrandId: e.target.value || null })}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
          >
            <option value="">Selecione uma marca...</option>
            {availableBrands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          {!brandId && (
            <p className="mt-1 text-[11px] font-semibold text-amber-600">
              Selecione uma marca para exibir os produtos no catálogo.
            </p>
          )}
        </div>
      )}

      {source === 'category' && (
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Selecionar Categoria</label>
          <select
            value={categoryId}
            onChange={(e) => update({ productsCategoryId: e.target.value || null })}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
          >
            <option value="">Selecione uma categoria...</option>
            {availableCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {!categoryId && (
            <p className="mt-1 text-[11px] font-semibold text-amber-600">
              Selecione uma categoria para exibir os produtos no catálogo.
            </p>
          )}
        </div>
      )}

      {source === 'manual' && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Buscar Produtos para Seleção ({manualIds.length} selecionados)
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome ou referência..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {isSearching && (
            <div className="text-[11px] text-slate-400 animate-pulse px-1">Buscando produtos...</div>
          )}

          {searchResults.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-1.5 pt-1">
              {searchResults.map((prod) => {
                const isSelected = manualIds.includes(prod.id);
                return (
                  <div
                    key={prod.id}
                    onClick={() => toggleManualProduct(prod.id)}
                    className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/80 text-blue-900 font-semibold'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {prod.image_url ? (
                      <img src={prod.image_url} alt="" className="h-8 w-8 rounded-md object-cover border border-slate-200" />
                    ) : (
                      <div className="h-8 w-8 rounded-md bg-slate-100 flex items-center justify-center text-slate-400">
                        <Package className="h-4 w-4" />
                      </div>
                    )}
                    <div className="flex-1 truncate">
                      <div className="text-xs truncate">{prod.name}</div>
                      {prod.brand_name && (
                        <div className="text-[10px] text-slate-400 truncate">{prod.brand_name}</div>
                      )}
                    </div>
                    {typeof prod.price === 'number' && (
                      <div className="text-xs font-bold text-slate-800">
                        R$ {prod.price.toFixed(2)}
                      </div>
                    )}
                    <div
                      className={`h-5 w-5 rounded-md flex items-center justify-center border ${
                        isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div>
        <div className="flex justify-between text-xs text-slate-600 font-semibold mb-1">
          <span>Quantidade Máxima de Produtos</span>
          <span>{limit} produtos</span>
        </div>
        <input
          type="range"
          min={4}
          max={24}
          step={2}
          value={limit}
          onChange={(e) => update({ productsLimit: Number(e.target.value) })}
          className="w-full accent-blue-600"
        />
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Formato de Exibição</label>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => update({ productsLayout: 'grid' })}
            className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition-all ${
              layout === 'grid'
                ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Grid className="h-4 w-4" />
            Grade Responsiva
          </button>
          <button
            type="button"
            onClick={() => update({ productsLayout: 'carousel' })}
            className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition-all ${
              layout === 'carousel'
                ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <LayoutList className="h-4 w-4" />
            Linha de Lançamentos
          </button>
        </div>
      </div>
    </div>
  );
}
