import { Product } from './types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

/**
 * Build a public Supabase storage URL for a product image.
 * Accepts absolute URLs (returned unchanged), storage object paths,
 * or full URLs containing the `/product-images/` segment.
 */
export function buildSupabaseImageUrl(
  img?: string | null,
  opts?: { width?: number; height?: number; resize?: string }
) {
  if (!img) return null;
  const trimmed = img.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://'))
    return trimmed;

  const SUPA = SUPABASE_URL.replace(/\/$/, '');

  let objectPath = trimmed;
  if (trimmed.includes('/product-images/')) {
    const parts = trimmed.split('/product-images/');
    objectPath = parts[parts.length - 1].replace(/^\/+/, '');
  }

  objectPath = objectPath.replace(/^\/+/, '');
  const encoded = encodeURIComponent(objectPath);
  const base = `${SUPA}/storage/v1/object/public/product-images/${encoded}`;

  if (opts && (opts.width || opts.height || opts.resize)) {
    const params = new URLSearchParams();
    if (opts.width) params.set('width', String(opts.width));
    if (opts.height) params.set('height', String(opts.height));
    if (opts.resize) params.set('resize', String(opts.resize));
    return `${base}?${params.toString()}`;
  }

  return base;
}

export function getProductImageUrl(product: Partial<Product>) {
  // Prefer internalized storage path when available
  if (product.image_path) {
    const path = product.image_path.replace(/^\//, '');
    return {
      src: buildSupabaseImageUrl(path),
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
