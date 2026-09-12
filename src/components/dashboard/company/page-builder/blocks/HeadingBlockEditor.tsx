'use client';

import type { CompanyPageBlock } from '@/lib/company-page-content';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

interface HeadingBlockEditorProps {
  block: CompanyPageBlock;
  onChange: (updated: CompanyPageBlock) => void;
}

export function HeadingBlockEditor({ block, onChange }: HeadingBlockEditorProps) {
  const text = block.data.text || '';
  const level = block.data.level || 'h2';
  const align = block.data.align || 'left';

  const update = (patch: Partial<CompanyPageBlock['data']>) => {
    onChange({
      ...block,
      data: {
        ...block.data,
        ...patch,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Texto do Título</label>
        <input
          type="text"
          value={text}
          onChange={(e) => update({ text: e.target.value })}
          placeholder="Ex: Nossa História, Como Funciona..."
          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Estilo / Nível</label>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {[
            { value: 'h1', label: 'Título Principal', desc: 'Maior (H1)' },
            { value: 'h2', label: 'Título de Seção', desc: 'Médio (H2)' },
            { value: 'h3', label: 'Subtítulo', desc: 'Menor (H3)' },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => update({ level: item.value as any })}
              className={`rounded-xl border p-2.5 text-center transition-all ${
                level === item.value
                  ? 'border-blue-600 bg-blue-50/80 text-blue-700 font-bold shadow-sm'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="text-xs">{item.label}</div>
              <div className="text-[10px] text-slate-400 font-normal">{item.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Alinhamento</label>
        <div className="mt-1.5 flex gap-2">
          {[
            { value: 'left', icon: AlignLeft, label: 'Esquerda' },
            { value: 'center', icon: AlignCenter, label: 'Centro' },
            { value: 'right', icon: AlignRight, label: 'Direita' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => update({ align: item.value as any })}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-medium transition-all ${
                  align === item.value
                    ? 'border-blue-600 bg-blue-50/80 text-blue-700 font-bold shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
