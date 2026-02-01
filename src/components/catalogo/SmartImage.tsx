'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

interface SmartImageProps {
  product: any;
  className?: string; // wrapper class
  imgClassName?: string; // image class
  initialSrc?: string | null;
  sizes?: string;
}

export function SmartImage({
  product,
  className = '',
  imgClassName = '',
  initialSrc = null,
  sizes,
}: SmartImageProps) {
  const internalPath = product?.image_path
    ? `/api/storage-image?path=${encodeURIComponent(String(product.image_path).replace(/^\/+/, ''))}`
    : null;
  const external = product?.external_image_url || product?.image_url || null;

  const [src, setSrc] = useState<string | null>(
    initialSrc || internalPath || external
  );
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    const next = initialSrc || internalPath || external;
    setSrc(next);
    setErrored(false);
  }, [
    initialSrc,
    product?.image_path,
    product?.image_url,
    product?.external_image_url,
  ]);

  const handleError = () => {
    // If we tried internal first, fallback to external once
    if (src && internalPath && src === internalPath && external) {
      setSrc(external);
      return;
    }
    setErrored(true);
  };

  const isPending = product?.sync_status === 'pending';

  return (
    <div className={`relative w-full h-full ${className}`}>
      {src && !errored ? (
        <Image
          src={src}
          alt={product?.name || 'Produto'}
          fill
          sizes={sizes || '200px'}
          className={`object-contain ${imgClassName}`}
          onError={handleError}
          // allow external images optimization when configured in next.config
        />
      ) : errored ? (
        <div className="flex h-full w-full flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"
              stroke="#cbd5e1"
              strokeWidth="1.5"
            />
            <path
              d="M8 12h8"
              stroke="#94a3b8"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <span className="mt-2 text-[11px] font-black text-slate-400">
            Sem imagem
          </span>
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Loader2 className="animate-spin text-slate-400" />
        </div>
      )}

      {isPending && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/40 dark:bg-black/40">
          <div className="flex flex-col items-center gap-1">
            <Loader2 className="animate-spin text-indigo-500" />
            <span className="text-[10px] font-black text-slate-600">
              Processando
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
