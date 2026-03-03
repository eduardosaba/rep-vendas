import React from 'react';
import { SmartImage } from '@/components/catalogo/SmartImage';
import { buildSupabaseImageUrl } from '@/lib/imageUtils';

interface ProductVariant {
  id: string;
  reference_code: string;
  image_url?: string | null;
  image_path?: string | null;
  color?: string | null;
  name?: string | null;
}

interface ProductVariantsProps {
  currentReferenceId?: string | null;
  variants: ProductVariant[];
  currentProductId: string;
  onVariantSelect: (variant: ProductVariant) => void;
}

export const ProductVariants: React.FC<ProductVariantsProps> = ({
  variants,
  currentProductId,
  onVariantSelect,
}) => {
  if (!variants || variants.length <= 1) return null;
  return (
    <div className="mt-4">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cores Disponíveis:</p>
      <div className="flex flex-wrap gap-3">
        {variants.map((variant) => {
          const thumb = resolveThumb(variant);
          const isActive = variant.id === currentProductId;
          return (
            <button
              key={variant.id}
              onClick={() => onVariantSelect(variant)}
              aria-pressed={isActive}
              className={`flex flex-col items-center w-20 text-center focus:outline-none ${isActive ? 'ring-2 ring-[var(--primary)] ring-opacity-30' : ''}`}
              title={variant.reference_code}
            >
              <div className={`w-16 h-16 rounded-md overflow-hidden border ${isActive ? 'border-[var(--primary)]' : 'border-gray-200 dark:border-slate-700'} bg-white flex items-center justify-center`}>
                {thumb ? (
                  <SmartImage
                    product={{ id: variant.id, name: variant.name, brand: '', image_url: thumb, image_path: variant.image_path }}
                    preferredSize={480}
                    className="w-full h-full"
                    imgClassName="object-cover"
                    variant="thumbnail"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 text-xs text-gray-600">{(variant.color && variant.color[0]) || variant.reference_code?.slice(0,1)}</div>
                )}
              </div>
              <div className="mt-1 text-[11px] text-gray-600 dark:text-gray-300 truncate w-full px-1">
                {variant.color || variant.reference_code || variant.name}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
 const resolveThumb = (p: ProductVariant) => {
   if (!p) return null;
   if (p.image_url) return p.image_url;
   // image_variants may be array of variants with url/path
   if ((p as any).image_variants && Array.isArray((p as any).image_variants) && (p as any).image_variants.length > 0) {
     const v = (p as any).image_variants.find((x: any) => x && (x.size === 480 || x.size === '480')) || (p as any).image_variants[0];
     if (v) {
       if (v.url) return v.url;
       if (v.path) return buildSupabaseImageUrl(v.path);
     }
   }
   // gallery_images
   if ((p as any).gallery_images && Array.isArray((p as any).gallery_images) && (p as any).gallery_images.length > 0) {
     const first = (p as any).gallery_images[0];
     if (typeof first === 'string') return first;
     if (first && first.url) return first.url;
     if (first && first.path) return buildSupabaseImageUrl(first.path);
   }
   if (p.image_path) return buildSupabaseImageUrl(p.image_path);
   return null;
 };

export default ProductVariants;
