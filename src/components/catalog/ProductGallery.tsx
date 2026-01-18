'use client';

import React, { useState } from 'react';
import { Loader2, AlertCircle, ImageIcon } from 'lucide-react';

interface GalleryProps {
  imageUrls: {
    id: string;
    url: string;
    sync_status: string;
  }[];
  productName: string;
}

export const ProductGallery = ({ imageUrls, productName }: GalleryProps) => {
  const [activeIndex, setActiveIndex] = useState(0);

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

  return (
    <div className="flex flex-col gap-4">
      {/* IMAGEM PRINCIPAL EM DESTAQUE */}
      <div className="relative aspect-square w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {/* Overlay de Processamento (Worker em execução) */}
        {isPending && (
          <div className="absolute inset-0 z-10 bg-white/60 dark:bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
              Otimizando Galeria para HD...
            </p>
          </div>
        )}

        {/* Overlay de Erro */}
        {isFailed && (
          <div className="absolute inset-0 z-10 bg-red-50 dark:bg-red-900/20 flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
            <p className="text-[10px] font-bold uppercase text-red-500">
              Erro na sincronização da imagem
            </p>
          </div>
        )}

        <img
          src={activeImage?.url}
          alt={`${productName} - vista ${activeIndex + 1}`}
          className={`w-full h-full object-contain transition-all duration-500 ${
            isPending
              ? 'scale-90 opacity-40 grayscale'
              : 'scale-100 opacity-100'
          }`}
        />
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
              <img
                src={img.url}
                alt={`Minitatura ${index + 1}`}
                className={`w-full h-full object-cover ${img.sync_status === 'pending' ? 'opacity-30' : 'opacity-100'}`}
              />
              {img.sync_status === 'pending' && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100/40 dark:bg-black/40">
                  <Loader2 size={12} className="text-indigo-500 animate-spin" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
