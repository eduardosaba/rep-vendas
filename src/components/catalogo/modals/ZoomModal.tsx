// src/components/catalogo/modals/ZoomModal.tsx

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getProductImage } from '@/lib/utils/image-logic';
import { buildSupabaseImageUrl } from '@/lib/imageUtils';

// --- Tipos ---
interface Product {
  image_url: string | null;
  images?: string[];
}
// -------------

interface ZoomModalProps {
  viewProduct: Product;
  isZoomOpen: boolean;
  setIsZoomOpen: (isOpen: boolean) => void;
  currentImageIndex: number;
  setCurrentImageIndex: React.Dispatch<React.SetStateAction<number>>;
  swipeThreshold?: number;
}

// Helper de Imagens (unificado): normaliza várias fontes possíveis
const getProductImages = (product: Product) => {
  if (!product) return [];

  // 1) se já existe array de imagens, normalize cada entrada
  if (product.images && product.images.length > 0) {
    return product.images
      .map((img) => normalizeImageSrc(img))
      .filter(Boolean) as string[];
  }

  // 2) tenta campos individuais por ordem de prioridade
  const candidates = [
    // image_path pode ser um storage path (ex: userId/..). Se for, servimos via proxy
    // mas o campo no tipo Product não está declarado; checamos dinamicamente
    (product as any).image_path,
    product.image_url,
    (product as any).external_image_url,
  ];

  return candidates
    .map((c) => normalizeImageSrc(c))
    .filter(Boolean) as string[];
};

function normalizeImageSrc(raw?: string | null) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;

  // Já é URL absoluta
  if (typeof s === 'string' && (s.startsWith('http://') || s.startsWith('https://'))) return s;

  // Não é uma URL absoluta — preferimos servir via proxy para evitar 403
  // Tratamos cenários common: caminhos que já incluem '/storage/v1/object/public/...'
  // ou que contenham 'product-images' em algum lugar.
  try {
    // Caso o valor inclua o segmento público do Supabase, extraímos apenas o objeto
    // Ex: '/storage/v1/object/public/product-images/foo.webp' ou full path with prefix
    const marker = '/storage/v1/object/public/';
    if (s.includes(marker)) {
      const after = s.split(marker).pop() || '';
      const parts = after.split('/');
      // if bucket present like 'product-images/...', remove bucket prefix
      if (parts[0] === 'product-images') parts.shift();
      const objectPath = parts.join('/');
      if (objectPath)
        return `/api/storage-image?path=${encodeURIComponent(objectPath)}`;
    }

    // If includes 'product-images/' segment or looks like a relative path, use proxy
    if (s.includes('/product-images/')) {
      const parts = s.split('/product-images/');
      const objectPath = parts[parts.length - 1].replace(/^\/+/, '');
      return `/api/storage-image?path=${encodeURIComponent(objectPath)}`;
    }

    // Otherwise assume it's a simple storage path or filename and proxy it
    const path = s.replace(/^\/+/, '');
    return `/api/storage-image?path=${encodeURIComponent(path)}`;
  } catch (e) {
    const path = s.replace(/^\/+/, '');
    return `/api/storage-image?path=${encodeURIComponent(path)}`;
  }
}

export function ZoomModal({
  viewProduct,
  isZoomOpen,
  setIsZoomOpen,
  currentImageIndex,
  setCurrentImageIndex,
  swipeThreshold = 50,
}: ZoomModalProps) {
  const productImages = getProductImages(viewProduct);
  const hasMultipleImages = productImages.length > 1;
  const [zoomScale, setZoomScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [mediaSize, setMediaSize] = useState({ width: 0, height: 0 });
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pinchRef = useRef<{ initialDistance: number; initialScale: number } | null>(null);
  const panRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);

  const measureViewport = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    setContainerSize({ width: el.clientWidth, height: el.clientHeight });
  }, []);

  const measureMedia = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const img = el.querySelector('img');
    if (!img) return;
    const rect = img.getBoundingClientRect();
    setMediaSize({ width: rect.width, height: rect.height });
  }, []);

  const getTouchDistance = (
    t1: { clientX: number; clientY: number },
    t2: { clientX: number; clientY: number }
  ) => {
    const dx = t2.clientX - t1.clientX;
    const dy = t2.clientY - t1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const clampScale = (v: number) => Math.max(1, Math.min(3, v));
  const getPanLimit = useCallback(
    (axis: 'x' | 'y', scale: number) => {
      const baseW = mediaSize.width || containerSize.width;
      const baseH = mediaSize.height || containerSize.height;
      const limitX = Math.max(0, (baseW * scale - containerSize.width) / 2);
      const limitY = Math.max(0, (baseH * scale - containerSize.height) / 2);
      return axis === 'x' ? limitX : limitY;
    },
    [mediaSize.width, mediaSize.height, containerSize.width, containerSize.height]
  );

  const clampPan = useCallback(
    (v: number, axis: 'x' | 'y', scale: number) => {
      const max = getPanLimit(axis, scale);
      return Math.max(-max, Math.min(max, v));
    },
    [getPanLimit]
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      pinchRef.current = {
        initialDistance: distance,
        initialScale: zoomScale,
      };
      panRef.current = null;
      return;
    }

    if (e.touches.length === 1 && zoomScale > 1.01) {
      panRef.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        initialX: pan.x,
        initialY: pan.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
      const nextScale = clampScale(
        pinchRef.current.initialScale * (currentDistance / pinchRef.current.initialDistance)
      );
      setZoomScale(nextScale);
      setPan((prev) => ({
        x: clampPan(prev.x, 'x', nextScale),
        y: clampPan(prev.y, 'y', nextScale),
      }));
      return;
    }

    if (e.touches.length === 1 && zoomScale > 1.01 && panRef.current) {
      e.preventDefault();
      const dx = e.touches[0].clientX - panRef.current.startX;
      const dy = e.touches[0].clientY - panRef.current.startY;
      setPan({
        x: clampPan(panRef.current.initialX + dx, 'x', zoomScale),
        y: clampPan(panRef.current.initialY + dy, 'y', zoomScale),
      });
    }
  };

  const handleTouchEnd = () => {
    pinchRef.current = null;
    panRef.current = null;
    if (zoomScale < 1.02) {
      setZoomScale(1);
      setPan({ x: 0, y: 0 });
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomScale(1);
    setPan({ x: 0, y: 0 });
    setCurrentImageIndex((prev) =>
      prev > 0 ? prev - 1 : productImages.length - 1
    );
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomScale(1);
    setPan({ x: 0, y: 0 });
    setCurrentImageIndex((prev) =>
      prev < productImages.length - 1 ? prev + 1 : 0
    );
  };

  useEffect(() => {
    setZoomScale(1);
    setPan({ x: 0, y: 0 });
  }, [currentImageIndex, isZoomOpen]);

  useEffect(() => {
    if (!isZoomOpen) return;
    measureViewport();
    const raf = window.requestAnimationFrame(() => {
      measureMedia();
    });
    const onResize = () => {
      measureViewport();
      window.requestAnimationFrame(() => measureMedia());
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [isZoomOpen, currentImageIndex, measureMedia, measureViewport]);

  useEffect(() => {
    if (zoomScale <= 1.01) {
      if (pan.x !== 0 || pan.y !== 0) setPan({ x: 0, y: 0 });
      return;
    }
    setPan((prev) => ({
      x: clampPan(prev.x, 'x', zoomScale),
      y: clampPan(prev.y, 'y', zoomScale),
    }));
  }, [zoomScale, clampPan]);

  // Body scroll-lock
  useEffect(() => {
    if (!isZoomOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isZoomOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isZoomOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsZoomOpen(false);
      if (e.key === 'ArrowLeft')
        setCurrentImageIndex((i) => (i > 0 ? i - 1 : productImages.length - 1));
      if (e.key === 'ArrowRight')
        setCurrentImageIndex((i) => (i < productImages.length - 1 ? i + 1 : 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isZoomOpen, setIsZoomOpen, setCurrentImageIndex, productImages.length]);

  if (!isZoomOpen || !viewProduct) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center">
      <button
        onClick={() => setIsZoomOpen(false)}
        className="absolute top-4 right-4 text-white/70 hover:text-white p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Fechar"
        title="Fechar"
      >
        <X size={32} />
      </button>

      <div className="relative w-full h-full flex items-center justify-center p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        {hasMultipleImages && (
          <button
            onClick={handlePrev}
            className="absolute left-4 p-2 min-w-[44px] min-h-[44px] text-white/50 hover:text-white hover:bg-white/10 rounded-full flex items-center justify-center"
            aria-label="Anterior"
          >
            <ChevronLeft size={48} />
          </button>
        )}

        {productImages[currentImageIndex] && (() => {
          const raw = productImages[currentImageIndex];
          const isPending = (viewProduct as any)?.sync_status === 'pending';
          const isExternalHost =
            String(raw).includes('safilo') ||
            (String(raw).startsWith('http') && !String(raw).includes('supabase.co'));

          const src = isPending || isExternalHost ? raw : getProductImage(raw, 'large') || raw;

          return (
            <div ref={viewportRef} className="relative max-w-[90vw] max-h-[85vh] w-auto h-auto flex items-center justify-center overflow-hidden touch-none">
                <AnimatePresence mode="wait">
                  {/**
                   * Quando possível usamos `next/image` para otimização; o `motion.div` envolve
                   * e recebe o gesto de drag. Para fontes externas ou pending, usamos imagem direta.
                   */}
                  {isExternalHost || (viewProduct as any)?.sync_status === 'pending' ? (
                    <motion.img
                      key={currentImageIndex}
                      src={String(src)}
                      alt={`Zoom ${currentImageIndex + 1}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      drag={zoomScale > 1 ? false : 'x'}
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.2}
                      dragMomentum={false}
                      style={{ scale: zoomScale, x: pan.x, y: pan.y, touchAction: 'none' }}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onLoad={() => {
                        window.requestAnimationFrame(() => {
                          measureViewport();
                          measureMedia();
                        });
                      }}
                      onDragEnd={(_: any, info: any) => {
                        if (zoomScale > 1.01) return;
                        if (info.offset.x < -swipeThreshold) {
                          setCurrentImageIndex((i) => Math.min(productImages.length - 1, i + 1));
                        } else if (info.offset.x > swipeThreshold) {
                          setCurrentImageIndex((i) => Math.max(0, i - 1));
                        }
                      }}
                      className="max-w-full max-h-[85vh] object-contain select-none cursor-grab active:cursor-grabbing"
                    />
                  ) : (
                    <motion.div
                      key={currentImageIndex}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      drag={zoomScale > 1 ? false : 'x'}
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.2}
                      dragMomentum={false}
                      style={{ scale: zoomScale, x: pan.x, y: pan.y, touchAction: 'none' }}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onDragEnd={(_: any, info: any) => {
                        if (zoomScale > 1.01) return;
                        if (info.offset.x < -swipeThreshold) {
                          setCurrentImageIndex((i) => Math.min(productImages.length - 1, i + 1));
                        } else if (info.offset.x > swipeThreshold) {
                          setCurrentImageIndex((i) => Math.max(0, i - 1));
                        }
                      }}
                      className="w-full h-full flex items-center justify-center"
                    >
                      <div className="relative w-full h-[85vh] max-w-full">
                        <Image
                          src={String(src)}
                          alt={`Zoom ${currentImageIndex + 1}`}
                          fill
                          style={{ objectFit: 'contain' }}
                          className="select-none"
                          loading="eager"
                          quality={95}
                          onLoadingComplete={() => {
                            window.requestAnimationFrame(() => {
                              measureViewport();
                              measureMedia();
                            });
                          }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Indicadores */}
                {productImages.length > 1 && (
                  <div className="absolute bottom-4 flex gap-1">
                    {productImages.map((_, idx) => (
                      <div
                        key={idx}
                        className={`h-1.5 w-6 rounded-full transition-colors ${
                          idx === currentImageIndex ? 'bg-white' : 'bg-white/40'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
          );
        })()}

        {hasMultipleImages && (
          <button
            onClick={handleNext}
            className="absolute right-4 p-2 min-w-[44px] min-h-[44px] text-white/50 hover:text-white hover:bg-white/10 rounded-full flex items-center justify-center"
            aria-label="Próximo"
          >
            <ChevronRight size={48} />
          </button>
        )}
      </div>
    </div>
  );
}
