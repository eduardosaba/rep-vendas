'use client';

import type { CompanyPageBlock } from '@/lib/company-page-content';

interface SpacerBlockEditorProps {
  block: CompanyPageBlock;
  onChange: (updated: CompanyPageBlock) => void;
}

export function SpacerBlockEditor({ block, onChange }: SpacerBlockEditorProps) {
  const height = block.data.height || 32;
  const lineStyle = block.data.lineStyle || 'space';

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
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Estilo do Divisor</label>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => update({ lineStyle: 'space' })}
            className={`rounded-xl border p-2.5 text-center text-xs font-bold transition-all ${
              lineStyle === 'space'
                ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Espaço Transparente
          </button>
          <button
            type="button"
            onClick={() => update({ lineStyle: 'line' })}
            className={`rounded-xl border p-2.5 text-center text-xs font-bold transition-all ${
              lineStyle === 'line'
                ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Linha Divisória
          </button>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-slate-600 font-semibold mb-1">
          <span>Altura do Espaçamento</span>
          <span>{height}px</span>
        </div>
        <input
          type="range"
          min={8}
          max={160}
          step={8}
          value={height}
          onChange={(e) => update({ height: Number(e.target.value) })}
          className="w-full accent-blue-600"
        />
      </div>
    </div>
  );
}
