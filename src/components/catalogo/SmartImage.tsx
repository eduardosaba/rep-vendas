'use client';

import React, { useMemo, useEffect, useState, useRef } from 'react';
import { Loader2, ImageOff } from 'lucide-react';
import { ensure480w } from '@/lib/imageUtils';

const DEFAULT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="100%" height="100%" fill="#f8fafc" /><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="12" font-weight="bold">IMAGEM</text><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="#cbd5e1" font-family="sans-serif" font-size="10">NÃO ENCONTRADA</text></svg>`;
const DEFAULT_PLACEHOLDER = `data:image/svg+xml;utf8,${encodeURIComponent(DEFAULT_SVG)}`;

export function SmartImage({
  product,
  className = '',
  imgClassName = '',
  imgStyle = {},
  variant = 'card',
  preferredSize,
  initialSrc = null,
  priority = false,
}: any) {
  // 1. Derivar a URL primária puramente das props usando useMemo (zero estado durante render)
  const primarySrc = useMemo(() => {
    if (initialSrc) return initialSrc;

    if (variant === 'thumbnail' || preferredSize === 480) {
      const base = product?.image_url || product?.image_path;
      if (base) {
        const s = typeof base === 'string' ? base : base.url;
        if (!s) return DEFAULT_PLACEHOLDER;
        if (
          s.startsWith('/api/storage-image') ||
          s.includes('?path=') ||
          s.startsWith('http://') ||
          s.startsWith('https://')
        ) {
          return s;
        }
        return ensure480w(s);
      }
    }

    return product?.image_url || product?.image_path || DEFAULT_PLACEHOLDER;
  }, [
    initialSrc,
    product?.id,
    product?.image_url,
    product?.image_path,
    variant,
    preferredSize,
  ]);

  // 2. Estado mantido EXCLUSIVAMENTE para gerenciar fallbacks em caso de erro
  const [fallbackSrc, setFallbackSrc] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const retryCount = useRef(0);

  // 3. Quando a prop de imagem principal muda (ex: troca de variante), reseta o fallback de erro
  useEffect(() => {
    setFallbackSrc(null);
    setStatus('loading');
    retryCount.current = 0;
  }, [primarySrc]);

  // URL ativa para exibição
  const activeSrc = fallbackSrc ?? primarySrc;

  const handleError = () => {
    const placeholder = DEFAULT_PLACEHOLDER;

    // Trava de segurança: interrompe após 3 tentativas ou se já estiver no placeholder
    if (retryCount.current >= 3 || activeSrc === placeholder) {
      setStatus('error');
      return;
    }

    retryCount.current++;

    const external =
      (product && (product.external_image_url || (product as any).external)) ||
      null;

    // 1) Se a URL atual for da CDN do Supabase Storage e falhar (404), migra para o proxy /api/storage-image
    if (
      activeSrc &&
      (activeSrc.includes('supabase.co/storage') ||
        activeSrc.includes('/storage/v1/object/public/'))
    ) {
      const marker = '/storage/v1/object/public/';
      let rawPath = activeSrc;
      if (activeSrc.includes(marker)) {
        rawPath = activeSrc.split(marker).pop() || activeSrc;
      }
      rawPath = rawPath.split('?')[0];
      const proxyUrl = `/api/storage-image?path=${encodeURIComponent(rawPath)}`;
      setFallbackSrc(proxyUrl);
      setStatus('loading');
      return;
    }

    // 2) Se tentou 480w, tenta 1200w
    if (activeSrc && activeSrc.includes('-480w.webp')) {
      const nextTry = activeSrc.replace('-480w.webp', '-1200w.webp');
      setFallbackSrc(nextTry);
      setStatus('loading');
      return;
    }

    // 3) Se tentou 1200w, tenta sem sufixo
    if (activeSrc && activeSrc.includes('-1200w.webp')) {
      const original = activeSrc.replace('-1200w.webp', '');
      setFallbackSrc(original);
      setStatus('loading');
      return;
    }

    // 4) Se possui imagem externa e ainda não tentou, tenta
    if (activeSrc && external && activeSrc !== external) {
      setFallbackSrc(external);
      setStatus('loading');
      return;
    }

    // 5) Último recurso: exibe placeholder e encerra
    if (activeSrc !== placeholder) {
      setFallbackSrc(placeholder);
      setStatus('loading');
      return;
    }

    setStatus('error');
  };

  const imgRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
      setStatus('loaded');
    }
  }, [activeSrc]);

  return (
    <div
      className={`relative overflow-hidden flex items-center justify-center ${className}`}
    >
      {activeSrc && status !== 'error' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={activeSrc}
          alt={product?.name || 'Produto'}
          onLoad={() => setStatus('loaded')}
          onError={handleError}
          className={`transition-all duration-500 ${imgClassName} max-w-full max-h-full ${
            status === 'loaded' ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
          style={imgStyle}
          loading={priority ? 'eager' : 'lazy'}
        />
      ) : null}

      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50">
          <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 text-slate-400">
          <ImageOff size={20} />
          <span className="text-[10px] font-bold mt-1 uppercase">Erro</span>
        </div>
      )}
    </div>
  );
}
