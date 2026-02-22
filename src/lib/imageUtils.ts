import { Product } from './types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

/**
 * Heurística para detectar se uma URL/path provavelmente aponta para
 * um recurso interno (Supabase Storage) em vez de uma URL externa.
 */
const isLikelyInternal = (input?: string | null): boolean => {
  if (!input) return false;
  try {
    const s = String(input);
    if (s.includes('/storage/v1/object') || s.includes('supabase.co/storage')) return true;
    // If it's not an absolute http(s) URL, treat as internal path
    if (!s.startsWith('http://') && !s.startsWith('https://')) return true;
    // If SUPABASE_URL is present and hostname matches, consider internal
    if (SUPABASE_URL) {
      try {
        const supaHost = new URL(SUPABASE_URL).hostname;
        const inHost = new URL(s).hostname;
        if (inHost && supaHost && inHost.includes(supaHost)) return true;
      } catch (e) {
        // ignore URL parsing errors
      }
    }
  } catch (e) {
    // fallback false
  }
  return false;
};

/**
 * Normaliza um storage path vindo do banco ou de uma URL pública.
 * - Decodifica se necessário
 * - Remove prefixos como `/storage/v1/object/public/` e `public/`
 * - Remove barras iniciais
 */
export function normalizeStoragePath(path?: string | null): string | null {
  if (!path) return null;
  let s = typeof path === 'string' ? path : String(path);
  try {
    // Se já vier encodeURIComponent, tentar decodificar para evitar double-encoding
    s = decodeURIComponent(s);
  } catch (e) {
    // ignore se não for uma sequência codificada
  }
  s = s.trim();
  const marker = '/storage/v1/object/public/';
  if (s.includes(marker)) {
    s = s.split(marker).pop() || s;
  }
  // remove barras iniciais
  s = s.replace(/^\/+/, '');
  // remover repetidos 'public/' no início
  while (s.toLowerCase().startsWith('public/')) {
    s = s.slice(7);
  }
  return s || null;
}

/**
 * Formata uma URL usada pela UI para carregar imagens via proxy `/api/storage-image`.
 * Aceita paths relativos, caminhos já contendo 'storage/v1/object/public' ou URLs completas.
 */
export function formatImageUrl(path?: string | null) {
  const normalized = normalizeStoragePath(path);
  if (!normalized) return '/placeholder.png';
  return `/api/storage-image?path=${encodeURIComponent(normalized)}`;
}

/**
 * Normaliza/Reconstrói um item de galeria garantindo variantes 480w/1200w
 */
export const buildGalleryItem = (img: any) => {
  let url = (typeof img === 'string' ? img : img?.url || '').trim();
  let path = img?.path || null;
  if (!url) return null;

  // Função robusta para limpar quaisquer sufixos previamente aplicados
  const cleanBase = (s?: string | null) => {
    if (!s) return null;
    let r = String(s).trim();
    // remove query string
    r = r.split('?')[0];
    // remove múltiplos sufixos como -1200w.webp-480w.webp repetidamente
    while (/(?:-(480w|1200w)\.webp)$/i.test(r)) {
      r = r.replace(/-(480w|1200w)\.webp$/i, '');
    }
    // remove extensão final (.webp, .jpg, etc.)
    r = r.replace(/\.[a-zA-Z0-9]+$/, '');
    return r;
  };

  // Se já vier com variantes explícitas, preservamos, mas normalizamos cada variant
  if (img && Array.isArray(img.variants) && img.variants.length > 0) {
    const normalizedVariants = img.variants
      .map((v: any) => {
        const rawUrl = v && (v.url || v.src || v.publicUrl) ? String(v.url || v.src || v.publicUrl).trim() : null;
        const rawPath = v && (v.path || v.storage_path) ? String(v.path || v.storage_path).trim() : null;
        if (!rawUrl && !rawPath) return null;
        const baseU = cleanBase(rawUrl || rawPath) || null;
        const size = v.size || null;
        if (!baseU) return null;
        const suf = (size === 1200) ? '1200w' : '480w';
        return {
          size: size || (suf === '1200w' ? 1200 : 480),
          url: rawUrl ? `${baseU}-${suf}.webp` : null,
          path: rawPath ? `${cleanBase(rawPath)}-${suf}.webp` : null,
        };
      })
      .filter(Boolean) as any[];

    const baseUrl = cleanBase(url) || '';
    const basePath = cleanBase(path) || null;
    return { url: `${baseUrl}-1200w.webp`, path: basePath ? `${basePath}-1200w.webp` : null, variants: normalizedVariants };
  }

  // Caso contrário, construímos variantes garantidas quando for interno
  const baseUrlClean = cleanBase(url) || '';
  const basePathClean = cleanBase(path) || null;
  const internal = isLikelyInternal(url) || isLikelyInternal(path);

  const variants = internal && basePathClean
    ? [
        { size: 480, url: `${baseUrlClean}-480w.webp`, path: `${basePathClean}-480w.webp` },
        { size: 1200, url: `${baseUrlClean}-1200w.webp`, path: `${basePathClean}-1200w.webp` },
      ]
    : [
        { size: 480, url: url, path: path },
        { size: 1200, url: url, path: path },
      ];

  return { url: internal ? `${baseUrlClean}-1200w.webp` : url, path: internal && basePathClean ? `${basePathClean}-1200w.webp` : path, variants };
};

/**
 * Prepara e limpa uma lista de itens de galeria para persistência.
 * Retorna { gallery, imagesField } onde `gallery` contém itens com `variants`
 * e `imagesField` é um array simples {url,path} usado em campo legacy `images`.
 */
export const prepareProductGallery = (items: any[]) => {
  const raw = Array.isArray(items) ? items : [];
  const cleaned = raw
    .map((it: any) => (typeof it === 'string' ? { url: it, path: null } : it || { url: '', path: null }))
    .map((it: any) => buildGalleryItem(it))
    .filter(Boolean) as any[];

  const imagesField = cleaned.map((g: any) => ({ url: g.url || '', path: g.path || null }));
  return { gallery: cleaned, imagesField };
};

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
  if (typeof trimmed === 'string' && (trimmed.startsWith('http://') || trimmed.startsWith('https://'))) {
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
  // Encode each path segment separately to avoid encoding slashes
  const encoded = objectPath
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
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
 * Segue a ordem de prioridade: Path Interno > Galeria Migrada > Galeria Legada > URL Externa.
 */
export function getProductImageUrl(product: Partial<Product>) {
  // A. PRIORIDADE 1: Campo direto 'image_path' (Internalizado)
  if (product.image_path) {
    const normalizedPath = normalizeStoragePath(product.image_path);
    if (normalizedPath) {
      return {
        src: `/api/storage-image?path=${encodeURIComponent(normalizedPath)}`,
        isExternal: false,
        isStorage: true,
      };
    }
  }

  // B. PRIORIDADE 2: Galeria migrada 'gallery_images' (novo schema)
  const galleryImages = (product as any).gallery_images;
  if (Array.isArray(galleryImages) && galleryImages.length > 0) {
    const firstImg = galleryImages[0] as any;

    // B1. Se for objeto, prioriza 'path' (storage otimizado) sobre 'url' (externa)
    if (firstImg && typeof firstImg === 'object') {
      const path = firstImg.path || firstImg.storage_path;
      if (path && typeof path === 'string') {
        const normalizedPath = normalizeStoragePath(path);
        if (normalizedPath) {
          return {
            src: `/api/storage-image?path=${encodeURIComponent(normalizedPath)}`,
            isExternal: false,
            isStorage: true,
          };
        }
      }

      // B2. Se não tem path mas tem url, usa url
      const url = firstImg.url || firstImg.src;
      if (url && typeof url === 'string') {
        // Se URL é do storage, usa proxy
        if (url.includes('supabase.co/storage') || url.includes('/storage/v1/object')) {
          const normalizedPath = normalizeStoragePath(url);
          if (normalizedPath) {
            return {
              src: `/api/storage-image?path=${encodeURIComponent(normalizedPath)}`,
              isExternal: false,
              isStorage: true,
            };
          }
        }
        // Senão, é externa
        if (typeof url === 'string' && url.startsWith('http')) {
          return { src: url, isExternal: true, isStorage: false };
        }
      }
    }

    // B3. Se for string simples
    if (typeof firstImg === 'string') {
      if (firstImg.includes('supabase.co/storage') || firstImg.includes('/storage/v1/object')) {
        const normalizedPath = normalizeStoragePath(firstImg);
        if (normalizedPath) {
          return {
            src: `/api/storage-image?path=${encodeURIComponent(normalizedPath)}`,
            isExternal: false,
            isStorage: true,
          };
        }
      }
      if (typeof firstImg === 'string' && firstImg.startsWith('http')) {
        return { src: firstImg, isExternal: true, isStorage: false };
      }
    }
  }

  // C. PRIORIDADE 3: Galeria legada 'images' (fallback para produtos não migrados)
  if (Array.isArray(product.images) && product.images.length > 0) {
    const firstImg = product.images[0] as any;

    // C1. Se for objeto, prioriza 'path' (storage otimizado) sobre 'url' (externa)
    if (firstImg && typeof firstImg === 'object') {
      const path = firstImg.path || firstImg.storage_path;
      if (path && typeof path === 'string') {
        const normalizedPath = normalizeStoragePath(path);
        if (normalizedPath) {
          return {
            src: `/api/storage-image?path=${encodeURIComponent(normalizedPath)}`,
            isExternal: false,
            isStorage: true,
          };
        }
      }

      // C2. Se não tem path mas tem url, usa url
      const url = firstImg.url || firstImg.src;
      if (url && typeof url === 'string') {
        // Se URL é do storage, usa proxy
        if (url.includes('supabase.co/storage') || url.includes('/storage/v1/object')) {
          const normalizedPath = normalizeStoragePath(url);
          if (normalizedPath) {
            return {
              src: `/api/storage-image?path=${encodeURIComponent(normalizedPath)}`,
              isExternal: false,
              isStorage: true,
            };
          }
        }
        // Senão, é externa
        if (typeof url === 'string' && url.startsWith('http')) {
          return { src: url, isExternal: true, isStorage: false };
        }
      }
    }

    // C3. Se for string simples
    if (typeof firstImg === 'string') {
      if (firstImg.includes('supabase.co/storage') || firstImg.includes('/storage/v1/object')) {
        const normalizedPath = normalizeStoragePath(firstImg);
        if (normalizedPath) {
          return {
            src: `/api/storage-image?path=${encodeURIComponent(normalizedPath)}`,
            isExternal: false,
            isStorage: true,
          };
        }
      }
      if (typeof firstImg === 'string' && firstImg.startsWith('http')) {
        return { src: firstImg, isExternal: true, isStorage: false };
      }
    }
  }

  // D. PRIORIDADE 4: URLs Externas (campos diretos)
  const external = product.external_image_url || product.image_url;
  if (external && typeof external === 'string' && external.startsWith('http')) {
    return { src: external, isExternal: true, isStorage: false };
  }

  // Fallback: Sem imagem
  return { src: null, isExternal: false, isStorage: false };
}

export default getProductImageUrl;
