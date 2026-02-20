'use client';

import React, { useState, useEffect } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  onUploadReady: (file: File) => void;
  defaultValue?: string | null;
  maxSizeMB?: number;
}

export default function SmartImageUpload({
  onUploadReady,
  defaultValue,
  maxSizeMB = 5,
}: Props) {
  const [preview, setPreview] = useState<string | null>(defaultValue || null);
  const [isDragging, setIsDragging] = useState(false);

  // Atualiza preview quando defaultValue mudar
  useEffect(() => {
    if (defaultValue) {
      setPreview(defaultValue);
    }
  }, [defaultValue]);

  const handleFile = (file: File | null) => {
    if (!file) return;

    // Validação de tipo
    if (!(typeof file.type === 'string' && file.type.startsWith('image/'))) {
      toast.error('Apenas imagens são permitidas');
      return;
    }

    // Validação de tamanho
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      const sizeMB = Math.round((file.size / 1024 / 1024) * 10) / 10;
      const proceed = window.confirm(
        `Arquivo muito grande (${sizeMB}MB). Deseja otimizar e converter para WebP automaticamente (qualidade balanceada) e enviar?`
      );
      if (!proceed) return;

      // Tenta otimizar/convertendo para WebP em client-side
      compressAndConvertToWebp(file, 1200, 0.82)
        .then((blob) => {
          try {
            const optimizedFile = new File([blob], changeExtToWebp(file.name), { type: 'image/webp' });
            setPreview(URL.createObjectURL(optimizedFile));
            onUploadReady(optimizedFile);
          } catch (e) {
            toast.error('Falha ao preparar imagem otimizada');
          }
        })
        .catch((err) => {
          console.warn('SmartImageUpload: compress failed', err);
          toast.error('Falha ao otimizar imagem. Tente um arquivo menor.');
        });

      return;
    }

    setPreview(URL.createObjectURL(file));
    onUploadReady(file);
  };

  const changeExtToWebp = (name: string) => {
    return name.replace(/\.[^/.]+$/, '') + '.webp';
  };

  const compressAndConvertToWebp = async (
    file: File,
    maxWidth = 1200,
    quality = 0.8
  ): Promise<Blob> => {
    // Utiliza createImageBitmap / canvas para redimensionar e converter
    const blob = file.slice(0, file.size, file.type);
    const imageBitmap = await createImageBitmap(blob as Blob);
    const ratio = imageBitmap.width / imageBitmap.height;
    const width = Math.min(maxWidth, imageBitmap.width);
    const height = Math.round(width / ratio);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    ctx.drawImage(imageBitmap, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) => {
      // toBlob com webp
      // @ts-ignore
      canvas.toBlob(
        (b: Blob | null) => {
          if (!b) return reject(new Error('toBlob_failed'));
          resolve(b);
        },
        'image/webp',
        quality
      );
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0];
    handleFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    handleFile(f);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const clearImage = () => {
    setPreview(null);
  };

  return (
    <div className="space-y-3">
      <div
        className={`relative w-full h-48 md:h-56 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed overflow-hidden flex items-center justify-center transition-all ${
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-slate-200 dark:border-slate-700'
        } ${preview ? 'p-0' : 'p-6'}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="preview"
              className="w-full h-full object-cover"
            />
            <button
              onClick={clearImage}
              className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
              type="button"
            >
              <X size={16} />
            </button>
          </>
        ) : (
          <label
            htmlFor="banner-upload"
            className="cursor-pointer flex flex-col items-center gap-3 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <ImageIcon size={24} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Clique ou arraste sua imagem
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Máximo: {maxSizeMB}MB | Ideal: 1200x630px
              </p>
            </div>
            <div className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors">
              <Upload size={16} />
              Escolher arquivo
            </div>
          </label>
        )}
      </div>

      <input
        id="banner-upload"
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
      />

      {preview && (
        <label
          htmlFor="banner-upload"
          className="block w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium text-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        >
          Trocar imagem
        </label>
      )}
    </div>
  );
}
