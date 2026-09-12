'use client';

import type { CompanyPageBlock } from '@/lib/company-page-content';
import { resolveVideoEmbedUrl } from '@/lib/company-page-content';
import { Video, AlertCircle, CheckCircle2 } from 'lucide-react';

interface VideoBlockEditorProps {
  block: CompanyPageBlock;
  onChange: (updated: CompanyPageBlock) => void;
}

export function VideoBlockEditor({ block, onChange }: VideoBlockEditorProps) {
  const videoUrl = block.data.videoUrl || '';
  const videoTitle = block.data.videoTitle || '';
  const aspectRatio = block.data.videoAspectRatio || '16:9';

  const update = (patch: Partial<CompanyPageBlock['data']>) => {
    onChange({
      ...block,
      data: {
        ...block.data,
        ...patch,
      },
    });
  };

  const embedUrl = resolveVideoEmbedUrl(videoUrl);
  const isValidProvider = Boolean(embedUrl);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">URL do Vídeo (YouTube ou Vimeo)</label>
        <div className="relative mt-1">
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => update({ videoUrl: e.target.value })}
            placeholder="https://www.youtube.com/watch?v=... ou https://vimeo.com/..."
            className={`w-full rounded-xl border bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 ${
              videoUrl
                ? isValidProvider
                  ? 'border-emerald-300 focus:ring-emerald-500'
                  : 'border-amber-300 focus:ring-amber-500'
                : 'border-slate-200 focus:ring-blue-500'
            }`}
          />
          {videoUrl && (
            <div className="absolute right-2.5 top-2.5 flex items-center">
              {isValidProvider ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              )}
            </div>
          )}
        </div>
        {videoUrl && !isValidProvider && (
          <p className="mt-1 text-[11px] font-semibold text-amber-600">
            Apenas links de vídeos do YouTube ou Vimeo são suportados.
          </p>
        )}
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Título do Vídeo (Opcional)</label>
        <input
          type="text"
          value={videoTitle}
          onChange={(e) => update({ videoTitle: e.target.value })}
          placeholder="Ex: Conheça nossa fábrica e processos..."
          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Proporção da Tela</label>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => update({ videoAspectRatio: '16:9' })}
            className={`rounded-xl border p-2.5 text-center text-xs font-bold transition-all ${
              aspectRatio === '16:9'
                ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Widescreen (16:9)
          </button>
          <button
            type="button"
            onClick={() => update({ videoAspectRatio: '4:3' })}
            className={`rounded-xl border p-2.5 text-center text-xs font-bold transition-all ${
              aspectRatio === '4:3'
                ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Padrão (4:3)
          </button>
        </div>
      </div>
    </div>
  );
}
