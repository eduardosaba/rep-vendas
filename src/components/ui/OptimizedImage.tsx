/**
 * OptimizedImage Component
 *
 * Componente otimizado de imagem com suporte a:
 * - Lazy loading automático
 * - Responsive images (srcset)
 * - WebP com fallback
 * - Dimensões explícitas (evita CLS)
 * - Placeholder blur
 *
 * @example
 * ```tsx
 * <OptimizedImage
 *   src="/images/product.jpg"
 *   alt="Produto"
 *   width={400}
 *   height={300}
 *   priority={false} // true para imagens "above the fold"
 * />
 * ```
 */

import React from 'react';
import Image from 'next/image';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean; // True para imagens críticas (acima da dobra)
  className?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  quality?: number; // 1-100, padrão 75
  sizes?: string; // Responsive sizes hint
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Gera srcset para imagens responsivas
 */
function generateSrcSet(src: string): string {
  // Se for URL externa ou não suportar otimização, retorna src original
  if (src.startsWith('http') || src.startsWith('//')) {
    return '';
  }

  const breakpoints = [320, 640, 1024, 1920];
  const basePath = src.replace(/\.[^.]+$/, ''); // Remove extensão

  return breakpoints
    .map((width) => `${basePath}-${width}w.webp ${width}w`)
    .join(', ');
}

/**
 * Gera sizes hint para responsive images
 */
function getDefaultSizes(priority: boolean): string {
  if (priority) {
    // Imagens prioritárias (hero, banner) ocupam tela toda
    return '100vw';
  }

  // Imagens normais: mobile full width, tablet/desktop parcial
  return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className = '',
  objectFit = 'cover',
  quality = 80,
  sizes,
  onLoad,
  onError,
}: OptimizedImageProps) {
  // Para URLs externas, usa Image do Next.js sem otimizações adicionais
  const isExternal = src.startsWith('http') || src.startsWith('//');

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      quality={quality}
      priority={priority}
      loading={priority ? 'eager' : 'lazy'}
      sizes={sizes || getDefaultSizes(priority)}
      className={className}
      style={{ objectFit }}
      placeholder={isExternal ? 'empty' : 'blur'}
      blurDataURL={
        isExternal
          ? undefined
          : `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}'%3E%3Cfilter id='b' color-interpolation-filters='sRGB'%3E%3CfeGaussianBlur stdDeviation='20'/%3E%3C/filter%3E%3Cimage filter='url(%23b)' width='100%25' height='100%25' href='${src}'/%3E%3C/svg%3E`
      }
      onLoad={onLoad}
      onError={onError}
    />
  );
}

/**
 * Componente Picture para máximo controle sobre responsive images
 * Usa elemento <picture> nativo com WebP + fallback
 */
interface ResponsivePictureProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
  breakpoints?: { width: number; src: string }[];
}

export function ResponsivePicture({
  src,
  alt,
  width,
  height,
  priority = false,
  className = '',
  breakpoints,
}: ResponsivePictureProps) {
  const basePath = src.replace(/\.[^.]+$/, '');
  const ext = src.match(/\.[^.]+$/)?.[0] || '.jpg';

  return (
    <picture>
      {/* WebP sources (modern browsers) */}
      {breakpoints?.map(({ width: bpWidth, src: bpSrc }) => (
        <source
          key={`webp-${bpWidth}`}
          media={`(max-width: ${bpWidth}px)`}
          srcSet={`${bpSrc.replace(ext, '.webp')}`}
          type="image/webp"
        />
      ))}
      <source srcSet={`${basePath}.webp`} type="image/webp" />

      {/* Fallback (JPEG/PNG) */}
      {breakpoints?.map(({ width: bpWidth, src: bpSrc }) => (
        <source
          key={`fallback-${bpWidth}`}
          media={`(max-width: ${bpWidth}px)`}
          srcSet={bpSrc}
        />
      ))}

      {/* Imagem padrão */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={className}
        style={{ height: 'auto' }}
      />
    </picture>
  );
}

export default OptimizedImage;
