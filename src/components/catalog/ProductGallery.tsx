'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, AlertCircle, ImageIcon, ZoomIn, X } from 'lucide-react';

interface GalleryProps {
  imageUrls: {
    id: string;
    url: string; // medium (600px) para visualização principal
    thumbnailUrl?: string; // small (200px) para miniaturas
    zoomUrl?: string; // large (1200px) para zoom/detalhes
    sync_status: string;
  }[];
  productName: string;
}

export const ProductGallery = ({ imageUrls, productName }: GalleryProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [showZoomModal, setShowZoomModal] = useState(false);

  const handleImageError = (index: number) => {
    setImageErrors((prev) => new Set(prev).add(index));
  };

  // Se não houver imagens, exibe placeholder
  if (!imageUrls || imageUrls.length === 0) {
    return (
      <div className="aspect-square w-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center rounded-2xl">
        <ImageIcon className="text-slate-300 dark:text-slate-600 w-12 h-12" />
      </div>
    );
  }

  const activeImage = imageUrls[activeIndex];
  const isPending = activeImage?.sync_status === 'pending';
  const isFailed = activeImage?.sync_status === 'failed';
  const hasImageError = imageErrors.has(activeIndex);
  const modalRef = useRef<HTMLDivElement | null>(null);

  const goNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % imageUrls.length);
  }, [imageUrls.length]);

  const goPrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length);
  }, [imageUrls.length]);

  useEffect(() => {
    if (!showZoomModal) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowZoomModal(false);
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
        return;
      }
    };

    window.addEventListener('keydown', onKey);
    // foco no modal para acessibilidade — usar requestAnimationFrame evita reflows síncronos
    window.requestAnimationFrame(() => modalRef.current?.focus());

    return () => window.removeEventListener('keydown', onKey);
  }, [showZoomModal, goNext, goPrev]);

  return (
    <div className="flex flex-col gap-4">
      {/* IMAGEM PRINCIPAL EM DESTAQUE */}
      <div
        className="relative aspect-square w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm cursor-pointer group"
        onClick={() => setShowZoomModal(true)}
      >
        {/* Overlay de Processamento (Worker em execução) */}
        {isPending && (
          <div className="absolute inset-0 z-10 bg-white/60 dark:bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
              Otimizando Galeria para HD...
            </p>
          </div>
        )}

        {/* Ícone de Zoom (aparece no hover) */}
        <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-black/50 backdrop-blur-sm rounded-full p-2">
            <ZoomIn className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Overlay de Erro */}
        {(isFailed || hasImageError) && (
          <div className="absolute inset-0 z-10 bg-red-50 dark:bg-red-900/20 flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
            <p className="text-[10px] font-bold uppercase text-red-500">
              {hasImageError
                ? 'Erro ao carregar imagem'
                : 'Erro na sincronização da imagem'}
            </p>
          </div>
        )}

        {hasImageError || !activeImage?.url ? (
          <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
            <ImageIcon className="text-slate-300 dark:text-slate-600 w-16 h-16" />
          </div>
        ) : (
          <img
            src={activeImage.url} // medium (600px)
            alt={`${productName} - vista ${activeIndex + 1}`}
            className={`w-full h-full object-contain transition-all duration-500 ${
              isPending
                ? 'scale-90 opacity-40 grayscale'
                : 'scale-100 opacity-100'
            }`}
            onError={() => handleImageError(activeIndex)}
          />
        )}
      </div>

      {/* MINIATURAS (THUMBNAILS) */}
      {imageUrls.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {imageUrls.map((img, index) => (
            <button
              key={img.id || index}
              onClick={() => setActiveIndex(index)}
              className={`
                relative flex-shrink-0 w-20 h-20 rounded-xl border-2 transition-all
                ${activeIndex === index ? 'border-indigo-600 ring-2 ring-indigo-100 dark:ring-indigo-900' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}
                overflow-hidden bg-white dark:bg-slate-900
              `}
            >
              {imageErrors.has(index) || !img.url ? (
                <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                  <ImageIcon className="text-slate-300 dark:text-slate-600 w-8 h-8" />
                </div>
              ) : (
                <img
                  src={img.thumbnailUrl || img.url} // small (200px) para thumbnails
                  alt={`Minitatura ${index + 1}`}
                  className={`w-full h-full object-cover ${img.sync_status === 'pending' ? 'opacity-30' : 'opacity-100'}`}
                  onError={() => handleImageError(index)}
                />
              )}
              {img.sync_status === 'pending' && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100/40 dark:bg-black/40">
                  <Loader2 size={12} className="text-indigo-500 animate-spin" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* MODAL DE ZOOM (usa versão large - 1200px) */}
      {showZoomModal && (
        <div
          ref={modalRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Imagem ampliada"
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowZoomModal(false)}
        >
          <div
            className="relative max-w-6xl max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botão Fechar */}
            <button
              onClick={() => setShowZoomModal(false)}
              className="absolute -top-12 right-0 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-2 transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            {/* Imagem em Alta Resolução (large - 1200px) */}
            {hasImageError || !activeImage?.url ? (
              <div className="w-96 h-96 flex items-center justify-center bg-slate-800 rounded-2xl">
                <ImageIcon className="text-slate-600 w-24 h-24" />
              </div>
            ) : (
              <img
                src={activeImage.zoomUrl || activeImage.url} // large (1200px) ou fallback para medium
                alt={`${productName} - ampliado`}
                className="max-h-[90vh] max-w-full object-contain rounded-2xl"
                onError={() => handleImageError(activeIndex)}
              />
            )}

            {/* Indicador de qual versão está sendo usada */}
            {activeImage?.zoomUrl && activeImage.sync_status === 'synced' && (
              <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full">
                <p className="text-[10px] font-bold text-white uppercase tracking-wider">
                  HD 1200px
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
