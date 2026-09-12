'use client';

import type { CompanyPageBlock } from '@/lib/company-page-content';

interface ColumnsBlockEditorProps {
  block: CompanyPageBlock;
  onChange: (updated: CompanyPageBlock) => void;
}

export function ColumnsBlockEditor({ block, onChange }: ColumnsBlockEditorProps) {
  const leftText = block.data.leftText || '';
  const rightText = block.data.rightText || '';

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
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Coluna Esquerda</label>
        <textarea
          value={leftText}
          onChange={(e) => update({ leftText: e.target.value })}
          rows={4}
          placeholder="Texto da primeira coluna..."
          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Coluna Direita</label>
        <textarea
          value={rightText}
          onChange={(e) => update({ rightText: e.target.value })}
          rows={4}
          placeholder="Texto da segunda coluna..."
          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}
