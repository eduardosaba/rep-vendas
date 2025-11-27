// src/components/catalog/modals/ZoomModal.tsx

'use client';

import React from 'react';
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
  setCurrentImageIndex: (index: number) => void;
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

  return (
    <div className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center">
      <button
        onClick={() => setIsZoomOpen(false)}
        className="absolute top-4 right-4 text-white/70 hover:text-white p-2"
      >
        <X size={32} />
      </button>
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
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={productImages[currentImageIndex]}
            alt="Zoom"
            className="max-w-full max-h-full object-contain select-none"
          />
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
