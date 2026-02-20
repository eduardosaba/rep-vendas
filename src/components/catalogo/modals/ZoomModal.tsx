// src/components/catalogo/modals/ZoomModal.tsx

'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
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
}: ZoomModalProps) {
  const productImages = getProductImages(viewProduct);
  const hasMultipleImages = productImages.length > 1;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) =>
      prev > 0 ? prev - 1 : productImages.length - 1
    );
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) =>
      prev < productImages.length - 1 ? prev + 1 : 0
    );
  };

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

        {productImages[currentImageIndex] && (
          <div className="relative max-w-[90vw] max-h-[85vh] w-auto h-auto">
            {(() => {
              const raw = productImages[currentImageIndex];
              const isPending = (viewProduct as any)?.sync_status === 'pending';
              const isExternalHost =
                String(raw).includes('safilo') ||
                (String(raw).startsWith('http') &&
                  !String(raw).includes('supabase.co'));

              const src =
                isPending || isExternalHost
                  ? raw
                  : getProductImage(raw, 'large') || raw;

              return (
                <Image
                  src={src}
                  alt="Zoom"
                  fill
                  style={{ objectFit: 'contain', maxWidth: '100%' }}
                  className="select-none"
                  loading="eager"
                  quality={95}
                />
              );
            })()}
          </div>
        )}

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
