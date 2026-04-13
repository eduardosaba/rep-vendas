'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Loader2, ImageOff } from 'lucide-react';
import { ensure480w } from '@/lib/imageUtils';

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
  const [src, setSrc] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  const retryCount = useRef(0);
  const lastAttemptedSrc = useRef<string | null>(null);

  const resolveInitialSrc = () => {
    if (initialSrc) return initialSrc;

    // If thumbnail is requested, prefer 480w
    if (variant === 'thumbnail' || preferredSize === 480) {
      const base = product?.image_url || product?.image_path;
      if (base) {
        const s = typeof base === 'string' ? base : base.url;
        if (!s) return '/placeholder.png';
        // If the value is already a proxy URL or an absolute external URL, do not rewrite it
        if (s.startsWith('/api/storage-image') || s.includes('?path=') || s.startsWith('http://') || s.startsWith('https://')) {
          return s;
        }
        return ensure480w(s);
      }
    }

    return product?.image_url || product?.image_path || '/placeholder.png';
  };

  useEffect(() => {
    const newSrc = resolveInitialSrc();
    if (newSrc !== src) {
      setSrc(newSrc);
      setStatus('loading');
      retryCount.current = 0;
      lastAttemptedSrc.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, product?.image_url, variant]);

  const handleError = () => {
    const placeholder = '/placeholder.png';

    // Prevent infinite loops
    if (retryCount.current >= 4) {
      setStatus('error');
      return;
    }

    retryCount.current++;

    const external = (product && (product.external_image_url || (product as any).external)) || null;

    // 1) If we tried 480w, next try 1200w
    if (src && src.includes('-480w.webp')) {
      const nextTry = src.replace('-480w.webp', '-1200w.webp');
      setSrc(nextTry);
      setStatus('loading');
      return;
    }

    // 2) If we tried 1200w, try original (strip suffix)
    if (src && src.includes('-1200w.webp')) {
      const original = src.replace('-1200w.webp', '');
      setSrc(original);
      setStatus('loading');
      return;
    }

    // 3) If the current src looks like an encoded proxy path (with ?path=...),
    // try to decode to original path without suffixes (already covered above) — skip

    // 4) If we have an external_image_url, try it
    if (src && external && src !== external) {
      setSrc(external);
      setStatus('loading');
      return;
    }

    // 5) Last resort: placeholder
    if (src !== placeholder) {
      setSrc(placeholder);
      setStatus('loading');
      return;
    }

    setStatus('error');
  };

  return (
    <div className={`relative overflow-hidden flex items-center justify-center ${className}`}>
      {src && status !== 'error' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={product?.name || 'Produto'}
          onLoad={() => setStatus('loaded')}
          onError={handleError}
          className={`transition-all duration-500 ${imgClassName} max-w-full max-h-full ${status === 'loaded' ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
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
