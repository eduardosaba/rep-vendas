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
  // Normalize different possible image representations
  let normalized: string | null = null;
  if (typeof img === 'string') {
    normalized = img;
  } else if (typeof img === 'object' && img !== null) {
    // Common object shapes: { url: '...', src: '...', path: '...'}
    const anyImg = img as any;
    if (anyImg.url && typeof anyImg.url === 'string') normalized = anyImg.url;
    else if (anyImg.src && typeof anyImg.src === 'string')
      normalized = anyImg.src;
    else if (anyImg.publicUrl && typeof anyImg.publicUrl === 'string')
      normalized = anyImg.publicUrl;
    else if (anyImg.public_url && typeof anyImg.public_url === 'string')
      normalized = anyImg.public_url;
    else if (anyImg.path && typeof anyImg.path === 'string')
      normalized = anyImg.path;
    else if (anyImg.storage_path && typeof anyImg.storage_path === 'string')
      normalized = anyImg.storage_path;
    else {
      // Unknown object shape — don't coerce to "[object Object]", return null
      normalized = null;
    }
  } else {
    normalized = String(img);
  }

  if (!normalized) return null;
  const trimmed = (normalized || '').trim();
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
  // If the product is pending internalization, prefer the external URL so
  // the storefront shows the original image while worker runs.
  const external = product.external_image_url || product.image_url || null;
  if (
    product.sync_status === 'pending' &&
    external &&
    typeof external === 'string' &&
    external.startsWith('http')
  ) {
    return { src: external, isExternal: true, isStorage: false };
  }

  // Prefer internalized storage path when available
  if (product.image_path) {
    const path = product.image_path.replace(/^\//, '');
    // Serve stored images via server proxy to avoid 403 when bucket is private
    // The proxy endpoint will use the service role to fetch the object and stream it.
    const proxied = `/api/storage-image?path=${encodeURIComponent(path)}`;
    return {
      src: proxied,
      isExternal: false,
      isStorage: true,
    };
  }

  // If there's an external image URL (imported via CSV/URL), use it directly
  if (external && typeof external === 'string' && external.startsWith('http')) {
    return { src: external, isExternal: true, isStorage: false };
  }

  // Fallback: no image available
  return { src: null, isExternal: false, isStorage: false };
}

export default getProductImageUrl;
