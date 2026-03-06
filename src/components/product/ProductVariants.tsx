import React from 'react';
import { SmartImage } from '@/components/catalogo/SmartImage';
import { buildSupabaseImageUrl } from '@/lib/imageUtils';
import { ensure480w } from '@/lib/imageHelpers';

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

  // Resolve a miniatura de forma agressiva focando em 480w e retornando uma URL absoluta
  const resolveThumb = (p: any) => {
    if (!p) return null;

    // 1) image_variants geradas pelo sync/otimização
    if (Array.isArray((p as any).image_variants) && (p as any).image_variants.length > 0) {
      const v480 = (p as any).image_variants.find((x: any) => x && Number(x.size) === 480);
      const chosen = v480 || (p as any).image_variants[0];
      if (chosen) {
        if (chosen.url) {
          const s = String(chosen.url);
          if (s.startsWith('/api/storage-image') || s.includes('?path=')) return s;
          return ensure480w(s);
        }
        if (chosen.path) {
          // Prefer proxy for consistent caching/formatting
          return `/api/storage-image?path=${encodeURIComponent(chosen.path)}&format=webp&q=80&w=480`;
        }
      }
    }

    // 2) image_path direto -> monta URL pública e força 480w
    if (p.image_path) {
      return `/api/storage-image?path=${encodeURIComponent(p.image_path)}&format=webp&q=80&w=480`;
    }

    // 3) image_url legado
    if (p.image_url) {
      const s = String(p.image_url);
      if (s.startsWith('/api/storage-image') || s.includes('?path=')) return s;
      return ensure480w(s);
    }

    return null;
  };

  return (
    <div className="mt-6">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Cores Disponíveis</p>
      <div className="flex flex-wrap gap-2">
        {variants.map((variant) => {
          const thumb = resolveThumb(variant);
          const isActive = variant.id === currentProductId;

          return (
            <button
              key={variant.id}
              onClick={() => onVariantSelect(variant)}
              aria-pressed={isActive}
              className={`group relative flex flex-col items-center w-16 transition-all ${
                isActive ? 'scale-110' : 'hover:scale-105 opacity-70 hover:opacity-100'
              }`}
            >
              <div className={`aspect-square w-full rounded-xl overflow-hidden border-2 transition-colors flex items-center justify-center bg-white ${
                isActive ? 'border-primary shadow-lg shadow-primary/20' : 'border-slate-100 dark:border-slate-800'
              }`}>
                {thumb ? (
                  <SmartImage
                    product={{ ...variant, image_url: thumb }}
                    preferredSize={480}
                    variant="thumbnail"
                    className="w-full h-full"
                    imgClassName="object-contain p-1"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-50 text-[10px] font-bold text-slate-400">
                    {variant.color?.slice(0, 2).toUpperCase() || 'S/C'}
                  </div>
                )}
              </div>

              <div className={`mt-1.5 text-[9px] font-bold truncate w-full px-1 text-center transition-colors ${
                isActive ? 'text-primary' : 'text-slate-500'
              }`}>
                {variant.color || variant.reference_code}
              </div>

              {isActive && <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-white" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
// note: resolveThumb is now internal to the component above

export default ProductVariants;
