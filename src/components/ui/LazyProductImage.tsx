'use client';

import { useEffect, useRef, useState } from 'react';
import { ImageIcon } from 'lucide-react';

interface LazyProductImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  showPlaceholder?: boolean;
}

/**
 * Componente de imagem otimizada com Intersection Observer
 * - Carrega imagens apenas quando visíveis no viewport
 * - Reduz uso de recursos do navegador
 * - Implementa fallback automático em caso de erro
 */
export function LazyProductImage({
  src,
  alt,
  className = '',
  fallbackSrc = '/placeholder-no-image.svg',
  showPlaceholder = true,
}: LazyProductImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Imagem está visível - carrega agora
            setImageSrc(src);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        // Começa a carregar quando a imagem está 100px antes de aparecer
        rootMargin: '100px',
        threshold: 0.01,
      }
    );

    observer.observe(imgRef.current);

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [src]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
    if (fallbackSrc && imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
    }
  };

  return (
    <div className="relative w-full h-full">
      {isLoading && showPlaceholder && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-slate-800">
          <ImageIcon className="w-6 h-6 text-gray-300 dark:text-slate-600 animate-pulse" />
        </div>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      {imageSrc ? (
        <img
          ref={imgRef}
          src={imageSrc}
          alt={alt}
          className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}`}
          loading="lazy"
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
        />
      ) : (
        // Keep a non-downloading placeholder element to avoid rendering an empty-src img
        <div ref={imgRef} className="w-full h-full" aria-hidden />
      )}
    </div>
  );
}
