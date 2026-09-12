'use client';

import { useState } from 'react';
import type { CompanyPageBlock } from '@/lib/company-page-content';
import { MediaUploader } from '../MediaUploader';
import { Plus, Trash2, ArrowUp, ArrowDown, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GalleryBlockEditorProps {
  block: CompanyPageBlock;
  onChange: (updated: CompanyPageBlock) => void;
}

export function GalleryBlockEditor({ block, onChange }: GalleryBlockEditorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const images = block.data.galleryImages || [];
  const galleryColumns = block.data.galleryColumns || 3;
  const maxHeight = block.data.maxHeight || 320;
  const objectFit = block.data.objectFit || 'cover';

  const update = (patch: Partial<CompanyPageBlock['data']>) => {
    onChange({
      ...block,
      data: {
        ...block.data,
        ...patch,
      },
    });
  };

  const addImage = (url: string) => {
    if (!url) return;
    update({
      galleryImages: [...images, { url }],
    });
  };

  const updateImage = (index: number, newUrl: string) => {
    const next = [...images];
    if (!newUrl) {
      next.splice(index, 1);
    } else {
      next[index] = { ...next[index], url: newUrl };
    }
    update({ galleryImages: next });
  };

  const removeImage = (index: number) => {
    const next = [...images];
    next.splice(index, 1);
    update({ galleryImages: next });
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    update({ galleryImages: next });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Colunas na Galeria</label>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {[2, 3, 4].map((cols) => (
            <button
              key={cols}
              type="button"
              onClick={() => update({ galleryColumns: cols })}
              className={`rounded-xl border p-2 text-xs font-bold transition-all ${
                galleryColumns === cols
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
          Imagens da Galeria ({images.length})
        </label>

        {images.map((img, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2"
          >
            <img src={img.url} alt={`Item ${idx + 1}`} className="h-12 w-12 rounded-lg object-cover" />
            <div className="flex-1 truncate text-xs font-medium text-slate-600">{img.url}</div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={idx === 0}
                onClick={() => moveImage(idx, 'up')}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={idx === images.length - 1}
                onClick={() => moveImage(idx, 'down')}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-red-500 hover:text-red-700"
                onClick={() => removeImage(idx)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}

        <MediaUploader
          onChange={(url) => addImage(url)}
          label="Adicionar Nova Imagem à Galeria"
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
              <div className="flex justify-between text-xs text-slate-600 font-semibold mb-1">
                <span>Altura Máxima dos Cards</span>
                <span>{maxHeight}px</span>
              </div>
              <input
                type="range"
                min={120}
                max={600}
                step={20}
                value={maxHeight}
                onChange={(e) => update({ maxHeight: Number(e.target.value) })}
                className="w-full accent-blue-600"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Preenchimento da Imagem</label>
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
          </div>
        )}
      </div>
    </div>
  );
}
