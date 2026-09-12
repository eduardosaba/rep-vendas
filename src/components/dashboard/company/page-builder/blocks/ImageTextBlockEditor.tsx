'use client';

import { useState } from 'react';
import type { CompanyPageBlock } from '@/lib/company-page-content';
import { MediaUploader } from '../MediaUploader';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ImageTextBlockEditorProps {
  block: CompanyPageBlock;
  onChange: (updated: CompanyPageBlock) => void;
}

export function ImageTextBlockEditor({ block, onChange }: ImageTextBlockEditorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const imageUrl = block.data.imageUrl || '';
  const imageAlt = block.data.imageAlt || '';
  const text = block.data.text || '';
  const imagePosition = block.data.imagePosition || 'left';
  const objectFit = block.data.objectFit || 'cover';
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
        value={imageUrl}
        onChange={(newUrl) => update({ imageUrl: newUrl })}
        label="Imagem da Seção"
      />

      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Posição da Imagem</label>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => update({ imagePosition: 'left' })}
            className={`rounded-xl border p-2.5 text-center text-xs font-semibold transition-all ${
              imagePosition === 'left'
                ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Imagem à Esquerda
          </button>
          <button
            type="button"
            onClick={() => update({ imagePosition: 'right' })}
            className={`rounded-xl border p-2.5 text-center text-xs font-semibold transition-all ${
              imagePosition === 'right'
                ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Imagem à Direita
          </button>
        </div>
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Texto da Seção</label>
        <textarea
          value={text}
          onChange={(e) => update({ text: e.target.value })}
          rows={5}
          placeholder="Escreva a mensagem sobre seu produto, história ou diferencial..."
          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
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
              <label className="text-xs font-semibold text-slate-600">Texto Alternativo (Alt)</label>
              <input
                type="text"
                value={imageAlt}
                onChange={(e) => update({ imageAlt: e.target.value })}
                placeholder="Descrição da imagem..."
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Modo de Exibição da Imagem</label>
              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => update({ objectFit: 'cover' })}
                  className={`flex-1 rounded-lg border p-2 text-xs ${
                    objectFit === 'cover' ? 'border-blue-600 bg-blue-50 font-bold text-blue-700' : 'bg-white text-slate-600'
                  }`}
                >
                  Preencher
                </button>
                <button
                  type="button"
                  onClick={() => update({ objectFit: 'contain' })}
                  className={`flex-1 rounded-lg border p-2 text-xs ${
                    objectFit === 'contain' ? 'border-blue-600 bg-blue-50 font-bold text-blue-700' : 'bg-white text-slate-600'
                  }`}
                >
                  Conter
                </button>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-600 font-semibold mb-1">
                <span>Altura Máxima da Imagem</span>
                <span>{maxHeight}px</span>
              </div>
              <input
                type="range"
                min={160}
                max={800}
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
