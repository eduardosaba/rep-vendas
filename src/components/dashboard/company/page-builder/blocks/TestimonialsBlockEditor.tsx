'use client';

import type { CompanyPageBlock, TestimonialItem } from '@/lib/company-page-content';
import { generateId } from '@/lib/company-page-content';
import { MediaUploader } from '../MediaUploader';
import { Plus, Trash2, ArrowUp, ArrowDown, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TestimonialsBlockEditorProps {
  block: CompanyPageBlock;
  onChange: (updated: CompanyPageBlock) => void;
}

export function TestimonialsBlockEditor({ block, onChange }: TestimonialsBlockEditorProps) {
  const items: TestimonialItem[] = block.data.testimonialItems || [];

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
    const newItem: TestimonialItem = {
      id: generateId(),
      author: '',
      role: '',
      content: '',
      rating: 5,
      avatarUrl: '',
    };
    update({ testimonialItems: [...items, newItem] });
  };

  const updateItem = (index: number, patch: Partial<TestimonialItem>) => {
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    update({ testimonialItems: next });
  };

  const removeItem = (index: number) => {
    const next = [...items];
    next.splice(index, 1);
    update({ testimonialItems: next });
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    update({ testimonialItems: next });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Depoimentos ({items.length})
        </label>

        {items.map((item, idx) => (
          <div
            key={item.id || idx}
            className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-3 relative"
          >
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <span className="text-xs font-bold text-slate-700">Depoimento #{idx + 1}</span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={idx === 0}
                  onClick={() => moveItem(idx, 'up')}
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={idx === items.length - 1}
                  onClick={() => moveItem(idx, 'down')}
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-red-500 hover:text-red-700"
                  onClick={() => removeItem(idx)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Nome do Cliente</label>
                <input
                  type="text"
                  value={item.author}
                  onChange={(e) => updateItem(idx, { author: e.target.value })}
                  placeholder="Carlos Silva"
                  className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Cargo / Empresa</label>
                <input
                  type="text"
                  value={item.role || ''}
                  onChange={(e) => updateItem(idx, { role: e.target.value })}
                  placeholder="Proprietário de Loja"
                  className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Depoimento / Citação</label>
              <textarea
                value={item.content}
                onChange={(e) => updateItem(idx, { content: e.target.value })}
                rows={3}
                placeholder="Escreva a mensagem do cliente..."
                className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Classificação (Estrelas)</label>
              <div className="mt-1 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => updateItem(idx, { rating: star })}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`h-4 w-4 ${
                        star <= (item.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <MediaUploader
              value={item.avatarUrl}
              onChange={(url) => updateItem(idx, { avatarUrl: url })}
              label="Foto do Cliente (Opcional)"
            />
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
          Adicionar Depoimento
        </Button>
      </div>
    </div>
  );
}
