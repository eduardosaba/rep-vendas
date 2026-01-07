'use client';

import React, { useEffect, useState } from 'react';

type Props = {
  src: string;
  alt?: string;
  className?: string;
  fallback?: string;
  maxRetries?: number;
  retryDelay?: number; // base ms
  onClick?: () => void;
  loading?: 'eager' | 'lazy';
};

export default function ImageWithRetry({
  src,
  alt,
  className,
  fallback = 'https://via.placeholder.com/600x600?text=Imagem+indispon%C3%ADvel',
  maxRetries = 3,
  retryDelay = 300,
  onClick,
  loading = 'lazy',
}: Props) {
  const [attempt, setAttempt] = useState(0);
  const [curSrc, setCurSrc] = useState(src);

  useEffect(() => {
    setCurSrc(src);
    setAttempt(0);
  }, [src]);

  useEffect(() => {
    if (attempt === 0) return;
    const ms = retryDelay * attempt;
    const t = setTimeout(() => {
      // add cache-bust to force re-request
      setCurSrc(src + (src.includes('?') ? '&' : '?') + 'retry=' + Date.now());
    }, ms);
    return () => clearTimeout(t);
  }, [attempt, src, retryDelay]);

  const handleError = () => {
    if (attempt < maxRetries) {
      setAttempt((a) => a + 1);
    } else {
      setCurSrc(fallback);
    }
  };

  return (
    // eslint-disable-next-line jsx-a11y/alt-text
    <img
      src={curSrc}
      alt={alt}
      className={className}
      onError={handleError}
      onClick={onClick}
      loading={loading}
    />
  );
}
