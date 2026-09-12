'use client';

import type { CompanyPageBlock } from '@/lib/company-page-content';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';

interface TextBlockEditorProps {
  block: CompanyPageBlock;
  onChange: (updated: CompanyPageBlock) => void;
}

export function TextBlockEditor({ block, onChange }: TextBlockEditorProps) {
  const text = block.data.text || '';
  const textAlign = block.data.textAlign || 'left';
  const fontSize = block.data.fontSize || 16;

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
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Conteúdo do Texto</label>
        <textarea
          value={text}
          onChange={(e) => update({ text: e.target.value })}
          rows={5}
          placeholder="Escreva aqui o texto da sua página institucional..."
          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Alinhamento</label>
        <div className="mt-1.5 flex gap-2">
          {[
            { value: 'left', icon: AlignLeft, label: 'Esquerda' },
            { value: 'center', icon: AlignCenter, label: 'Centro' },
            { value: 'right', icon: AlignRight, label: 'Direita' },
            { value: 'justify', icon: AlignJustify, label: 'Justificado' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => update({ textAlign: item.value as any })}
                className={`flex-1 flex items-center justify-center gap-1 rounded-xl border p-2 text-xs font-medium transition-all ${
                  textAlign === item.value
                    ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tamanho da Fonte</label>
          <span className="text-xs font-bold text-slate-600">{fontSize}px</span>
        </div>
        <input
          type="range"
          min={12}
          max={36}
          value={fontSize}
          onChange={(e) => update({ fontSize: Number(e.target.value) })}
          className="mt-2 w-full accent-blue-600"
        />
      </div>
    </div>
  );
}
