'use client';

import { useState } from 'react';
import { Upload, Trash2, Link as LinkIcon, Loader2, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { sanitizeUrl } from '@/lib/url-sanitizer';

interface MediaUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  category?: string;
  className?: string;
}

export function MediaUploader({
  value = '',
  onChange,
  label = 'Imagem',
  category = 'cms-pages',
  className = '',
}: MediaUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showExternalInput, setShowExternalInput] = useState(false);

  const safeUrl = sanitizeUrl(value);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('title', file.name);
      form.append('category', category);

      const res = await fetch('/api/admin/company/gallery/upload', {
        method: 'POST',
        body: form,
      });

      const json = await res.json();
      if (!res.ok || !json?.success) {
        toast.error(json?.error || 'Falha no upload da imagem');
        return;
      }

      const url = String(json?.data?.image_url || '');
      if (!url) {
        toast.error('Upload concluído, mas nenhuma URL foi retornada.');
        return;
      }

      onChange(url);
      toast.success('Imagem enviada com sucesso');
    } catch {
      toast.error('Erro ao enviar imagem');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</label>}

      {safeUrl ? (
        <div className="relative group overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-slate-900/5">
            <img src={safeUrl} alt="Preview da mídia" className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-slate-950/60 opacity-0 transition-opacity group-hover:opacity-100">
              <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-800 shadow backdrop-blur hover:bg-white">
                <RefreshCw className="h-3.5 w-3.5" />
                Trocar
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={isUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file);
                  }}
                />
              </label>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="h-8 text-xs"
                onClick={() => onChange('')}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Remover
              </Button>
            </div>
          </div>
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 text-center transition-colors hover:border-slate-300">
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-full bg-slate-100 p-2.5 text-slate-400">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div className="text-xs text-slate-500">
              <label className="cursor-pointer font-bold text-blue-600 hover:underline">
                Clique para enviar
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={isUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file);
                  }}
                />
              </label>{' '}
              uma imagem do seu computador
            </div>
            {isUploading && (
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-600">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Enviando imagem...
              </div>
            )}
          </div>
        </div>
      )}

      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowExternalInput(!showExternalInput)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-600"
        >
          <LinkIcon className="h-3 w-3" />
          {showExternalInput ? 'Ocultar URL manual' : 'Usar URL externa'}
        </button>

        {showExternalInput && (
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://..."
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
          />
        )}
      </div>
    </div>
  );
}
