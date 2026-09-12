'use client';

import { useState } from 'react';
import type { CompanyPageBlock } from '@/lib/company-page-content';
import { MediaUploader } from '../MediaUploader';
import { ChevronDown, ChevronUp, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

interface ImageBlockEditorProps {
  block: CompanyPageBlock;
  onChange: (updated: CompanyPageBlock) => void;
}

export function ImageBlockEditor({ block, onChange }: ImageBlockEditorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const url = block.data.url || '';
  const alt = block.data.alt || '';
  const align = block.data.align || 'center';
  const objectFit = block.data.objectFit || 'cover';
  const widthPercent = block.data.widthPercent ?? 100;
  const maxHeight = block.data.maxHeight ?? 480;

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
      <MediaUploader
        value={url}
        onChange={(newUrl) => update({ url: newUrl })}
        label="Imagem do Bloco"
      />

      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Texto Alternativo (Alt)</label>
        <input
          type="text"
          value={alt}
          onChange={(e) => update({ alt: e.target.value })}
          placeholder="Descrição da imagem para leitores de tela..."
          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Como Exibir a Imagem</label>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => update({ objectFit: 'cover' })}
            className={`rounded-xl border p-2.5 text-center text-xs transition-all ${
              objectFit === 'cover'
                ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold shadow-sm'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Preencher área
          </button>
          <button
            type="button"
            onClick={() => update({ objectFit: 'contain' })}
            className={`rounded-xl border p-2.5 text-center text-xs transition-all ${
              objectFit === 'contain'
                ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold shadow-sm'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Mostrar imagem inteira
          </button>
        </div>
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Alinhamento na Página</label>
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
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-medium transition-all ${
                  align === item.value
                    ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold shadow-sm'
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

      <div className="pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full items-center justify-between text-xs font-bold text-slate-500 hover:text-slate-700"
        >
          <span>Configurações Avançadas</span>
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div>
              <div className="flex justify-between text-xs text-slate-600 font-semibold mb-1">
                <span>Largura Relativa</span>
                <span>{widthPercent}%</span>
              </div>
              <input
                type="range"
                min={20}
                max={100}
                value={widthPercent}
                onChange={(e) => update({ widthPercent: Number(e.target.value) })}
                className="w-full accent-blue-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-600 font-semibold mb-1">
                <span>Altura Máxima</span>
                <span>{maxHeight}px</span>
              </div>
              <input
                type="range"
                min={100}
                max={1000}
                step={20}
                value={maxHeight}
                onChange={(e) => update({ maxHeight: Number(e.target.value) })}
                className="w-full accent-blue-600"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
