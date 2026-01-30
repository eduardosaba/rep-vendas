'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  src: string;
  alt?: string;
  onClose: () => void;
}

export default function ImageLightbox({ src, alt = '', onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative max-w-full max-h-full"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-2 top-2 z-10 bg-white/80 dark:bg-slate-800 rounded-full p-1 shadow"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        {src ? (
          <img
            src={src}
            alt={alt}
            className="block max-w-[90vw] max-h-[90vh] object-contain rounded-md shadow-lg"
          />
        ) : (
          <div className="w-[90vw] h-[60vh] bg-gray-100 flex items-center justify-center text-sm text-gray-400 rounded-md">
            Imagem indisponível
          </div>
        )}
      </div>
    </div>
  );
}
