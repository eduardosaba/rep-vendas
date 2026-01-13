import { Product } from './types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

export function getProductImageUrl(product: Partial<Product>) {
  // Prefer internalized storage path when available
  if (product.image_path) {
    const path = product.image_path.replace(/^\//, '');
    return {
      src: `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/product-images/${path}`,
      isExternal: false,
      isStorage: true,
    };
  }

  // If there's an external image URL (imported via CSV/URL), use it directly
  const external = product.external_image_url || product.image_url || null;
  if (external && typeof external === 'string' && external.startsWith('http')) {
    return { src: external, isExternal: true, isStorage: false };
  }

  // Fallback: no image available
  return { src: null, isExternal: false, isStorage: false };
}

export default getProductImageUrl;
