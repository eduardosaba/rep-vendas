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
  variant?: 'thumbnail' | 'card' | 'full'; // Novo: controla qual variante usar
}

export function SmartImage({
  product,
  className = '',
  imgClassName = '',
  initialSrc = null,
  sizes,
  variant = 'card',
}: SmartImageProps) {
  // Gera srcset a partir de image_variants se disponível
  const generateSrcSet = () => {
    if (!product?.image_variants || !Array.isArray(product.image_variants)) {
      return null;
    }

    return product.image_variants
      .map((v: any) => {
        const cleanPath = String(v.path).startsWith('/')
          ? String(v.path).substring(1)
          : String(v.path);
        const path = encodeURIComponent(cleanPath);
        return `/api/storage-image?path=${path} ${v.size}w`;
      })
      .join(', ');
  };

  // Escolhe URL baseado na variante solicitada
  const getImageSrc = () => {
    if (initialSrc) return initialSrc;

    // Se tem variantes, escolhe baseado no contexto
    if (product?.image_variants && Array.isArray(product.image_variants)) {
      const variants = product.image_variants;
      let targetVariant = variants[variants.length - 1]; // Default: maior

      if (variant === 'thumbnail') {
        // Thumbnail: sempre a menor (480w)
        targetVariant = variants[0];
      } else if (variant === 'card') {
        // Card: usa 480w se disponível, senão maior
        targetVariant =
          variants.find((v: any) => v.size === 480) || variants[0];
      }
      // variant === 'full': usa a maior (já é o default)

      const cleanPath = String(targetVariant.path).startsWith('/')
        ? String(targetVariant.path).substring(1)
        : String(targetVariant.path);
      const path = encodeURIComponent(cleanPath);
      return `/api/storage-image?path=${path}`;
    }

    // Fallback: lógica antiga
    if (product?.image_path) {
      const cleanPath = String(product.image_path).startsWith('/')
        ? String(product.image_path).substring(1)
        : String(product.image_path);
      return `/api/storage-image?path=${encodeURIComponent(cleanPath)}`;
    }

    return product?.external_image_url || product?.image_url || null;
  };

  const srcSet = generateSrcSet();
  const imageSrc = getImageSrc();
  const external = product?.external_image_url || product?.image_url || null;

  const [src, setSrc] = useState<string | null>(imageSrc);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setSrc(imageSrc);
    setErrored(false);
  }, [
    imageSrc,
    product?.image_path,
    product?.image_url,
    product?.external_image_url,
    product?.image_variants,
  ]);

  const handleError = () => {
    // If we tried internal first, fallback to external once
    if (src && imageSrc && src === imageSrc && external) {
      setSrc(external);
      return;
    }
    setErrored(true);
  };

  const isPending = product?.sync_status === 'pending';

  // Se tem srcset, usa img nativo para aproveitar responsive images
  const useNativeImg = srcSet && variant !== 'thumbnail';

  return (
    <div className={`relative w-full h-full ${className}`}>
      {src && !errored ? (
        useNativeImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            srcSet={srcSet || undefined}
            alt={product?.name || 'Produto'}
            className={`w-full h-full object-contain ${imgClassName}`}
            sizes={sizes || '(max-width: 768px) 100vw, 200px'}
            loading="lazy"
            decoding="async"
            onError={handleError}
          />
        ) : (
          <Image
            src={src}
            alt={product?.name || 'Produto'}
            fill
            sizes={sizes || '200px'}
            className={`object-contain ${imgClassName}`}
            onError={handleError}
          />
        )
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
