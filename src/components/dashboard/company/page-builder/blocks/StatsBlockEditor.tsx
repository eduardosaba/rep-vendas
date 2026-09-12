'use client';

import type { CompanyPageBlock, StatItem } from '@/lib/company-page-content';
import { generateId } from '@/lib/company-page-content';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StatsBlockEditorProps {
  block: CompanyPageBlock;
  onChange: (updated: CompanyPageBlock) => void;
}

export function StatsBlockEditor({ block, onChange }: StatsBlockEditorProps) {
  const items: StatItem[] = block.data.statsItems || [];
  const statsColumns = block.data.statsColumns || 3;

  const update = (patch: Partial<CompanyPageBlock['data']>) => {
    onChange({
      ...block,
      data: {
        ...block.data,
        ...patch,
      },
    });
  };

  const addItem = () => {
    const newItem: StatItem = {
      id: generateId(),
      number: '100%',
      label: 'Novo Indicador',
    };
    update({ statsItems: [...items, newItem] });
  };

  const updateItem = (index: number, patch: Partial<StatItem>) => {
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    update({ statsItems: next });
  };

  const removeItem = (index: number) => {
    const next = [...items];
    next.splice(index, 1);
    update({ statsItems: next });
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    update({ statsItems: next });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Número de Colunas</label>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {[2, 3, 4].map((cols) => (
            <button
              key={cols}
              type="button"
              onClick={() => update({ statsColumns: cols as 2 | 3 | 4 })}
              className={`rounded-xl border p-2 text-xs font-bold transition-all ${
                statsColumns === cols
                  ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cols} Colunas
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Indicadores ({items.length})
        </label>

        {items.map((item, idx) => (
          <div
            key={item.id || idx}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5"
          >
            <div className="w-1/3">
              <input
                type="text"
                value={item.number}
                onChange={(e) => updateItem(idx, { number: e.target.value })}
                placeholder="+500"
                className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-black text-slate-900"
              />
            </div>
            <div className="flex-1">
              <input
                type="text"
                value={item.label}
                onChange={(e) => updateItem(idx, { label: e.target.value })}
                placeholder="Clientes Atendidos"
                className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-medium text-slate-700"
              />
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={idx === 0}
                onClick={() => moveItem(idx, 'up')}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={idx === items.length - 1}
                onClick={() => moveItem(idx, 'down')}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-red-500 hover:text-red-700"
                onClick={() => removeItem(idx)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          className="w-full text-xs font-semibold text-slate-700"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Adicionar Indicador
        </Button>
      </div>
    </div>
  );
}
