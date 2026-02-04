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

  // Se o valor já contém um caminho completo do Supabase (/storage/v1/object/public/...),
  // extraímos apenas a parte após esse segmento para evitar duplicações (ex: public/public/...)
  const marker = '/storage/v1/object/public/';
  if (trimmed.includes(marker)) {
    objectPath = trimmed.split(marker).pop() || '';
  } else if (trimmed.includes('/product-images/')) {
    // Compatibilidade antiga: remove o prefixo de product-images se presente
    const parts = trimmed.split('/product-images/');
    objectPath = parts[parts.length - 1];
  }

  // Remova barras iniciais e possíveis prefixos redundantes "public/"
  objectPath = objectPath.replace(/^\/+/, '').replace(/^public\//, '');

  // Agora construímos a URL pública usando o bucket/prefix que veio no próprio path
  // (não forçamos mais "product-images" como bucket estático)
  const encoded = encodeURIComponent(objectPath);
  const base = `${SUPA}/storage/v1/object/public/${encoded}`;

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

  // B. PRIORIDADE 2: Primeiro item da galeria (suporta objetos {url, path} ou strings)
  if (Array.isArray(product.images) && product.images.length > 0) {
    const firstImg = product.images[0] as any;

    // B1. Se for objeto, prioriza 'path' (storage otimizado) sobre 'url' (externa)
    if (firstImg && typeof firstImg === 'object') {
      const path = firstImg.path || firstImg.storage_path;
      if (path && typeof path === 'string') {
        const cleanPath = path.replace(/^\//, '');
        return {
          src: `/api/storage-image?path=${encodeURIComponent(cleanPath)}`,
          isExternal: false,
          isStorage: true,
        };
      }

      // B2. Se não tem path mas tem url, usa url
      const url = firstImg.url || firstImg.src;
      if (url && typeof url === 'string') {
        // Se URL é do storage, usa proxy
        if (
          url.includes('supabase.co/storage') ||
          url.includes('/storage/v1/object')
        ) {
          const cleanPath = url.replace(/^\//, '');
          return {
            src: `/api/storage-image?path=${encodeURIComponent(cleanPath)}`,
            isExternal: false,
            isStorage: true,
          };
        }
        // Senão, é externa
        if (url.startsWith('http')) {
          return { src: url, isExternal: true, isStorage: false };
        }
      }
    }

    // B3. Se for string simples
    if (typeof firstImg === 'string') {
      if (
        firstImg.includes('supabase.co/storage') ||
        firstImg.includes('/storage/v1/object')
      ) {
        const cleanPath = firstImg.replace(/^\//, '');
        return {
          src: `/api/storage-image?path=${encodeURIComponent(cleanPath)}`,
          isExternal: false,
          isStorage: true,
        };
      }
      if (firstImg.startsWith('http')) {
        return { src: firstImg, isExternal: true, isStorage: false };
      }
    }
  }

  // C. PRIORIDADE 3: URLs Externas (campos diretos)
  const external = product.external_image_url || product.image_url;
  if (external && typeof external === 'string' && external.startsWith('http')) {
    return { src: external, isExternal: true, isStorage: false };
  }

  // Fallback: Sem imagem
  return { src: null, isExternal: false, isStorage: false };
}

export default getProductImageUrl;
