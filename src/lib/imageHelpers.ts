// Helpers reutilizáveis para normalização e deduplicação de imagens
export function normalizeImageEntry(
  entry: any
): { url: string; path: string | null }[] {
  if (!entry) return [];

  if (typeof entry === 'string') {
    return entry
      .split(';')
      .map((u: string) => u.trim())
      .filter(Boolean)
      .map((u: string) => ({ url: u, path: null }));
  }

  if (typeof entry === 'object' && !Array.isArray(entry)) {
    const url =
      entry.optimized_url ||
      entry.optimizedUrl ||
      entry.url ||
      entry.src ||
      entry.publicUrl ||
      entry.public_url ||
      '';
    const path = entry.storage_path || entry.path || entry.image_path || null;
    return [{ url: String(url || ''), path: path || null }];
  }

  return [];
}

export function normalizeAndExplodeImageEntries(
  images: any
): { url: string; path: string | null }[] {
  if (!images) return [];
  const arr = Array.isArray(images) ? images : [images];
  const out: { url: string; path: string | null }[] = [];

  for (const entry of arr) {
    const items = normalizeImageEntry(entry);
    for (const it of items) {
      if (it.url) out.push({ url: it.url.trim(), path: it.path });
    }
  }

  const seen = new Set<string>();
  return out.filter((i) => {
    if (seen.has(i.url)) return false;
    seen.add(i.url);
    return true;
  });
}

export function getBaseKeyFromUrl(url: string): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    const filename = u.pathname.split('/').pop() || url;
    return filename
      .replace(/-\d+w(\.[a-zA-Z0-9]+)?$/, '')
      .replace(/\.[a-zA-Z0-9]+$/, '');
  } catch (e) {
    const filename = url.split('/').pop() || url;
    return String(filename)
      .replace(/-\d+w(\.[a-zA-Z0-9]+)?$/, '')
      .replace(/\.[a-zA-Z0-9]+$/, '');
  }
}

export function dedupePreferOptimized(
  arr: { url: string; path: string | null }[]
) {
  const map = new Map<string, { url: string; path: string | null }>();
  for (const it of arr) {
    const key = getBaseKeyFromUrl(it.url || '');
    if (!key) continue;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, it);
      continue;
    }
    if (!existing.path && it.path) {
      map.set(key, it);
    }
  }
  return Array.from(map.values());
}

export function ensureOptimizedFirst(
  arr: { url: string; path: string | null }[]
) {
  if (!Array.isArray(arr) || arr.length <= 1) return arr;
  const idx = arr.findIndex((i) => Boolean(i && i.path));
  if (idx <= 0) return arr;
  const copy = [...arr];
  const [item] = copy.splice(idx, 1);
  copy.unshift(item);
  return copy;
}

export function upgradeTo1200w(url: string): string {
  if (!url) return url;
  return url.replace(/-480w(\.[a-zA-Z0-9]+)$/, '-1200w$1');
}

export function ensure480w(url: string): string {
  if (!url) return url;
  if (/-480w(\.[a-zA-Z0-9]+)(\?.*)?$/.test(url)) return url;
  if (/-1200w(\.[a-zA-Z0-9]+)(\?.*)?$/.test(url)) return url.replace(/-1200w(\.[a-zA-Z0-9]+)(\?.*)?$/, '-480w$1$2');
  return url.replace(/(\.[a-zA-Z0-9]+)(\?.*)?$/, '-480w$1$2');
}

export function normalizeImageForDB(img: any) {
  if (!img) return null;
  if (img.variants && Array.isArray(img.variants)) return img;
  const url = (img && (img.url || img)) || '';
  const path = img && (img.path || null);

  const url1200 = upgradeTo1200w(String(url || ''));
  const url480 = ensure480w(String(url || ''));

  const path1200 = path ? String(path).replace(/-(480w|1200w)\.webp$/, '') + '-1200w.webp' : null;
  const path480 = path ? String(path).replace(/-(480w|1200w)\.webp$/, '') + '-480w.webp' : null;

  return {
    url: url1200 || url,
    path: path1200,
    variants: [
      { size: 480, url: url480 || url, path: path480 },
      { size: 1200, url: url1200 || url, path: path1200 },
    ],
  };
}

export default {
  normalizeImageEntry,
  normalizeAndExplodeImageEntries,
  getBaseKeyFromUrl,
  dedupePreferOptimized,
  ensureOptimizedFirst,
  upgradeTo1200w,
};
