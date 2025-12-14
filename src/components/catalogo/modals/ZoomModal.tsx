// src/components/catalogo/modals/ZoomModal.tsx

'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

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

// Helper de Imagens (movido do Storefront)
const getProductImages = (product: Product) => {
  if (product.images && product.images.length > 0) return product.images;
  if (product.image_url) return [product.image_url];
  return [];
};

export function ZoomModal({
  viewProduct,
  isZoomOpen,
  setIsZoomOpen,
  currentImageIndex,
  setCurrentImageIndex,
}: ZoomModalProps) {
  if (!isZoomOpen || !viewProduct) return null;

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsZoomOpen(false);
      if (e.key === 'ArrowLeft')
        setCurrentImageIndex((i) => (i > 0 ? i - 1 : productImages.length - 1));
      if (e.key === 'ArrowRight')
        setCurrentImageIndex((i) => (i < productImages.length - 1 ? i + 1 : 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setIsZoomOpen, setCurrentImageIndex, productImages.length]);

  return (
    <div className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center">
      <button
        onClick={() => setIsZoomOpen(false)}
        className="absolute top-4 right-4 text-white/70 hover:text-white p-2"
        aria-label="Fechar"
        title="Fechar"
      >
        <X size={32} />
      </button>

      {/* Fecha ao pressionar Escape */}
      {/** useEffect below to add keydown listener when modal aberto */}
      <div className="relative w-full h-full flex items-center justify-center p-4">
        {hasMultipleImages && (
          <button
            onClick={handlePrev}
            className="absolute left-4 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full"
          >
            <ChevronLeft size={48} />
          </button>
        )}

        {productImages[currentImageIndex] && (
          <div className="relative max-w-[90vw] max-h-[90vh] w-auto h-auto">
            <Image
              src={productImages[currentImageIndex]}
              alt="Zoom"
              fill
              style={{ objectFit: 'contain' }}
              className="select-none"
            />
          </div>
        )}

        {hasMultipleImages && (
          <button
            onClick={handleNext}
            className="absolute right-4 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full"
          >
            <ChevronRight size={48} />
          </button>
        )}
      </div>
    </div>
  );
}
