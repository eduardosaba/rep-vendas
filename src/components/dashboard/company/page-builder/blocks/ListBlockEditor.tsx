'use client';

import type { CompanyPageBlock } from '@/lib/company-page-content';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ListBlockEditorProps {
  block: CompanyPageBlock;
  onChange: (updated: CompanyPageBlock) => void;
}

export function ListBlockEditor({ block, onChange }: ListBlockEditorProps) {
  const items = block.data.items || [''];

  const updateItems = (nextItems: string[]) => {
    onChange({
      ...block,
      data: {
        ...block.data,
        items: nextItems,
      },
    });
  };

  const handleItemChange = (index: number, val: string) => {
    const next = [...items];
    next[index] = val;
    updateItems(next);
  };

  const addItem = () => {
    updateItems([...items, '']);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      updateItems(['']);
      return;
    }
    const next = [...items];
    next.splice(index, 1);
    updateItems(next);
  };

  return (
    <div className="space-y-3">
      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Itens da Lista</label>
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <input
            type="text"
            value={item}
            onChange={(e) => handleItemChange(idx, e.target.value)}
            placeholder={`Item ${idx + 1}...`}
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-slate-400 hover:text-red-600"
            onClick={() => removeItem(idx)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
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
        Adicionar Item
      </Button>
    </div>
  );
}
