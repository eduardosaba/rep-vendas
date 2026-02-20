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
  preferredSize?: number; // solicita explicitamente a variante (ex: 480, 1200)
  priority?: boolean;
}

export function SmartImage({
  product,
  className = '',
  imgClassName = '',
  initialSrc = null,
  sizes,
  variant = 'card',
  preferredSize,
  priority = false,
}: SmartImageProps) {
  // Gera srcset a partir de image_variants se disponível
  const generateSrcSet = () => {
    // Prefer `optimized_variants` (per-image) then fallback to `image_variants` (product-level)
    const raw = product?.optimized_variants || product?.image_variants;
    if (!raw || !Array.isArray(raw) || raw.length === 0) return null;

    const variants = raw
      .map((v: any) => ({
        size: Number(v.size || v.width || 0),
        url: v.url,
        path: v.path,
      }))
      .filter((v: any) => v.size && (v.url || v.path));

    if (variants.length === 0) return null;

    return variants
      .map((v: any) => {
        if (v.url) return `${v.url} ${v.size}w`;
        const cleanPath = String(v.path || '').startsWith('/')
          ? String(v.path).substring(1)
          : String(v.path || '');
        const path = encodeURIComponent(cleanPath);
        return `/api/storage-image?path=${path} ${v.size}w`;
      })
      .join(', ');
  };

  // Escolhe URL baseado na variante solicitada
  const getImageSrc = () => {
    if (initialSrc) return initialSrc;

    // Collect variants from optimized_variants (image row) or image_variants (product)
    const raw = product?.optimized_variants || product?.image_variants;
    const variants = Array.isArray(raw)
      ? raw
          .map((v: any) => ({
            size: Number(v.size || v.width || 0),
            url: v.url,
            path: v.path,
          }))
          .filter((v: any) => v.size && (v.url || v.path))
      : [];

    if (variants.length > 0) {
      // Try preferredSize -> if not present pick the largest
      let chosen = null as any;
      if (typeof preferredSize === 'number') {
        chosen = variants.find(
          (v: any) => Number(v.size) === Number(preferredSize)
        );
      }
      if (!chosen) {
        chosen = variants.reduce((a: any, b: any) =>
          a.size >= b.size ? a : b
        );
      }
      if (chosen) {
        if (chosen.url) return chosen.url;
        const cleanPath = String(chosen.path || '').startsWith('/')
          ? String(chosen.path).substring(1)
          : String(chosen.path || '');
        return `/api/storage-image?path=${encodeURIComponent(cleanPath)}`;
      }
    }

    // Fallback: product.image_path -> external URLs
    if (product?.image_path) {
      const cleanPath = String(product.image_path).startsWith('/')
        ? String(product.image_path).substring(1)
        : String(product.image_path);
      return `/api/storage-image?path=${encodeURIComponent(cleanPath)}`;
    }

    // APENAS usar external URLs se não houver image_path e a URL for válida
    const extUrl = product?.external_image_url || product?.image_url || null;
    if (extUrl && typeof extUrl === 'string' && extUrl.trim().length > 6) {
      return extUrl;
    }
    return null;
  };

  const srcSet = generateSrcSet();
  const imageSrc = getImageSrc();
  // Validar external URLs apenas se não houver image_path
  const external = !product?.image_path
    ? product?.external_image_url || product?.image_url || null
    : null;

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
    product?.optimized_variants,
    preferredSize,
  ]);

  const handleError = () => {
    // Fallback sequence:
    // 1) If we tried internal first and there's an external URL, use it.
    // 2) Else try local placeholder asset.
    // 3) If already tried placeholder, mark errored.
    const placeholder = '/placeholder.png';
    try {
      if (src && imageSrc && src === imageSrc && external) {
        setSrc(external);
        return;
      }
      if (src !== placeholder) {
        setSrc(placeholder);
        return;
      }
    } catch (err) {
      // ignore
    }
    setErrored(true);
  };

  const isPending = product?.sync_status === 'pending';

  // Use elemento <img> nativo quando tivermos srcSet ou quando for miniatura (mais resiliente que next/Image para thumbs)
  const useNativeImg = Boolean(srcSet) || variant === 'thumbnail';

  return (
    <div className={`relative w-full h-full ${className}`}>
      {src && !errored ? (
        // Sempre preferimos <img> nativo para maior compatibilidade e fallback direto
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
