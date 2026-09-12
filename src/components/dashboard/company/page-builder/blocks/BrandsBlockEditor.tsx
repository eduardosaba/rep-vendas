'use client';

import { useState } from 'react';
import type { CompanyPageBlock } from '@/lib/company-page-content';
import { Award, Grid } from 'lucide-react';

interface BrandsBlockEditorProps {
  block: CompanyPageBlock;
  onChange: (updated: CompanyPageBlock) => void;
  availableBrands?: Array<{ id: string; name: string }>;
}

export function BrandsBlockEditor({
  block,
  onChange,
  availableBrands = [],
}: BrandsBlockEditorProps) {
  const [searchFilter, setSearchFilter] = useState('');
  const title = block.data.brandsTitle ?? 'Nossas Marcas';
  const source = block.data.brandsSource || 'company';
  const columns = block.data.brandsColumns || 4;
  const brandIds = block.data.brandIds || [];

  const filteredBrands = availableBrands.filter((b) =>
    b.name.toLowerCase().includes(searchFilter.trim().toLowerCase())
  );

  const update = (patch: Partial<CompanyPageBlock['data']>) => {
    onChange({
      ...block,
      data: {
        ...block.data,
        ...patch,
      },
    });
  };

  const toggleBrandId = (id: string) => {
    const next = brandIds.includes(id)
      ? brandIds.filter((bId) => bId !== id)
      : [...brandIds, id];
    update({ brandIds: next });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Título da Seção</label>
        <input
          type="text"
          value={title}
          onChange={(e) => update({ brandsTitle: e.target.value })}
          placeholder="Ex: Marcas que Representamos, Nossas Marcas..."
          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
        />
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Origem das Marcas</label>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => update({ brandsSource: 'company' })}
            className={`rounded-xl border p-2.5 text-left transition-all ${
              source === 'company'
                ? 'border-blue-600 bg-blue-50/80 text-blue-700 font-bold shadow-sm'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className="text-xs">Todas da Empresa</div>
            <div className="text-[10px] text-slate-400 font-normal mt-0.5">Exibe todas as marcas ativas</div>
          </button>
          <button
            type="button"
            onClick={() => update({ brandsSource: 'manual' })}
            className={`rounded-xl border p-2.5 text-left transition-all ${
              source === 'manual'
                ? 'border-blue-600 bg-blue-50/80 text-blue-700 font-bold shadow-sm'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className="text-xs">Seleção Manual</div>
            <div className="text-[10px] text-slate-400 font-normal mt-0.5">Escolha marcas específicas</div>
          </button>
        </div>
      </div>

      {source === 'manual' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Selecionar Marcas ({brandIds.length} selecionadas)
            </label>
          </div>
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filtrar marca..."
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2 space-y-1">
            {filteredBrands.length === 0 ? (
              <p className="p-2 text-xs text-slate-400 font-medium">Nenhuma marca encontrada.</p>
            ) : (
              filteredBrands.map((brand) => {
                const isSelected = brandIds.includes(brand.id);
                return (
                  <label
                    key={brand.id}
                    className={`flex items-center gap-2 rounded-lg p-2 text-xs font-semibold cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-100/70 text-blue-900' : 'bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleBrandId(brand.id)}
                      className="rounded border-slate-300 text-blue-600 accent-blue-600"
                    />
                    <span>{brand.name}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}

      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Número de Colunas</label>
        <div className="mt-1.5 grid grid-cols-4 gap-2">
          {[2, 3, 4, 6].map((cols) => (
            <button
              key={cols}
              type="button"
              onClick={() => update({ brandsColumns: cols as 2 | 3 | 4 | 6 })}
              className={`rounded-xl border p-2 text-xs font-bold transition-all ${
                columns === cols
                  ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cols} Cols
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
