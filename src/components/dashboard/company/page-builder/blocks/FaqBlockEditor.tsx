'use client';

import type { CompanyPageBlock, FaqItem } from '@/lib/company-page-content';
import { generateId } from '@/lib/company-page-content';
import { Plus, Trash2, ArrowUp, ArrowDown, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FaqBlockEditorProps {
  block: CompanyPageBlock;
  onChange: (updated: CompanyPageBlock) => void;
}

export function FaqBlockEditor({ block, onChange }: FaqBlockEditorProps) {
  const faqTitle = block.data.faqTitle ?? 'Perguntas Frequentes';
  const items: FaqItem[] = block.data.faqItems || [];

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
    const newItem: FaqItem = {
      id: generateId(),
      question: '',
      answer: '',
    };
    update({ faqItems: [...items, newItem] });
  };

  const updateItem = (index: number, patch: Partial<FaqItem>) => {
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    update({ faqItems: next });
  };

  const removeItem = (index: number) => {
    const next = [...items];
    next.splice(index, 1);
    update({ faqItems: next });
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    update({ faqItems: next });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Título da Seção FAQ</label>
        <input
          type="text"
          value={faqTitle}
          onChange={(e) => update({ faqTitle: e.target.value })}
          placeholder="Ex: Dúvidas Frequentes, FAQ..."
          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Perguntas & Respostas ({items.length})
          </label>
        </div>

        {items.map((item, idx) => (
          <div
            key={item.id || idx}
            className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2 relative group"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <HelpCircle className="h-3.5 w-3.5 text-blue-600" />
                <span>Pergunta #{idx + 1}</span>
              </div>
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

            <div>
              <input
                type="text"
                value={item.question}
                onChange={(e) => updateItem(idx, { question: e.target.value })}
                placeholder="Pergunta..."
                className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-800"
              />
            </div>

            <div>
              <textarea
                value={item.answer}
                onChange={(e) => updateItem(idx, { answer: e.target.value })}
                rows={2}
                placeholder="Resposta..."
                className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700"
              />
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
          Adicionar Pergunta
        </Button>
      </div>
    </div>
  );
}
