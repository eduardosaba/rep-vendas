import { Product } from './types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

/**
 * Constrói uma URL pública do Supabase Storage ou retorna a URL absoluta.
 * Suporta strings (paths) ou objetos (formato novo {url, path}).
 */
export function buildSupabaseImageUrl(
  img?: any | null,
  opts?: { width?: number; height?: number; resize?: string }
) {
  if (!img) return null;

  let normalized: string | null = null;

  // 1. Extração Inteligente (Suporta string ou Objeto)
  if (typeof img === 'string') {
    normalized = img;
  } else if (typeof img === 'object' && img !== null) {
    // Tenta path primeiro (mais seguro), depois url
    normalized =
      img.path || img.storage_path || img.url || img.src || img.publicUrl;
  }

  if (!normalized || typeof normalized !== 'string') return null;

  const trimmed = normalized.trim();

  // 2. Se já for uma URL completa (HTTP), retorna ela
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // 3. Se for um path do Storage, constrói a URL pública
  const SUPA = SUPABASE_URL.replace(/\/$/, '');
  let objectPath = trimmed;

  // Remove o prefixo do bucket se estiver presente na string
  if (trimmed.includes('/product-images/')) {
    const parts = trimmed.split('/product-images/');
    objectPath = parts[parts.length - 1];
  }

  objectPath = objectPath.replace(/^\/+/, '');
  const encoded = encodeURIComponent(objectPath);
  const base = `${SUPA}/storage/v1/object/public/product-images/${encoded}`;

  // 4. Aplica transformações se solicitado (Supabase Image Transformation)
  if (opts && (opts.width || opts.height || opts.resize)) {
    const params = new URLSearchParams();
    if (opts.width) params.set('width', String(opts.width));
    if (opts.height) params.set('height', String(opts.height));
    if (opts.resize) params.set('resize', String(opts.resize));
    return `${base}?${params.toString()}`;
  }

  return base;
}

/**
 * Resolve a imagem principal a ser exibida para um produto.
 * Segue a ordem de prioridade: Path Interno > Galeria Interna > URL Externa.
 */
export function getProductImageUrl(product: Partial<Product>) {
  // A. PRIORIDADE 1: Campo direto 'image_path' (Internalizado)
  if (product.image_path) {
    const path = product.image_path.replace(/^\//, '');
    return {
      src: `/api/storage-image?path=${encodeURIComponent(path)}`,
      isExternal: false,
      isStorage: true,
    };
  }

  // B. PRIORIDADE 2: Primeiro item da galeria que tenha 'path' (Internalizado)
  if (Array.isArray(product.images) && product.images.length > 0) {
    const firstImg = product.images[0] as any;
    const path =
      firstImg && typeof firstImg === 'object' && 'path' in firstImg
        ? (firstImg as any).path
        : null;

    if (path) {
      const cleanPath = path.replace(/^\//, '');
      return {
        src: `/api/storage-image?path=${encodeURIComponent(cleanPath)}`,
        isExternal: false,
        isStorage: true,
      };
    }
  }

  // C. PRIORIDADE 3: URLs Externas (campos diretos)
  const external = product.external_image_url || product.image_url;
  if (external && typeof external === 'string' && external.startsWith('http')) {
    return { src: external, isExternal: true, isStorage: false };
  }

  // D. PRIORIDADE 4: URLs Externas dentro da galeria (campo 'url')
  if (Array.isArray(product.images) && product.images.length > 0) {
    const firstImg = product.images[0] as any;
    const url =
      firstImg && typeof firstImg === 'object' && 'url' in firstImg
        ? (firstImg as any).url
        : firstImg;

    if (url && typeof url === 'string' && url.startsWith('http')) {
      return { src: url, isExternal: true, isStorage: false };
    }
  }

  // Fallback: Sem imagem
  return { src: null, isExternal: false, isStorage: false };
}

export default getProductImageUrl;
