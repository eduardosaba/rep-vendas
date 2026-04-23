export type CompanyPageBlockType =
  | 'text'
  | 'image'
  | 'columns'
  | 'list'
  | 'image_text'
  | 'spacer'
  | 'banner'
  | 'gallery';

export type CompanyPageBlock = {
  id: string;
  type: CompanyPageBlockType;
  data: {
    text?: string;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    fontSize?: number;
    url?: string;
    alt?: string;
    leftText?: string;
    rightText?: string;
    items?: string[];
    imagePosition?: 'left' | 'right';
    align?: 'left' | 'center' | 'right';
    imageUrl?: string;
    imageAlt?: string;
    height?: number;
    lineStyle?: 'space' | 'line';
    title?: string;
    subtitle?: string;
    ctaText?: string;
    ctaUrl?: string;
    widthPercent?: number;
    maxHeight?: number;
    objectFit?: 'contain' | 'cover';
    galleryImages?: Array<{ url: string; alt?: string }>;
    galleryColumns?: number;
  };
};

export type CompanyPageContent = {
  version: 1;
  title: string;
  heroImage: string;
  heroHeight?: number;
  blocks: CompanyPageBlock[];
};

function randomId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null;
}

function normalizePercent(value: unknown, fallback = 100) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? Math.max(10, Math.min(100, n)) : fallback;
}

function normalizePx(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

function normalizeBlock(raw: unknown): CompanyPageBlock | null {
  if (!isRecord(raw)) return null;

  const type = String(raw.type || '').trim() as CompanyPageBlockType;
  if (!['text', 'image', 'columns', 'list', 'image_text', 'spacer', 'banner', 'gallery'].includes(type)) {
    return null;
  }

  const data = isRecord(raw.data) ? raw.data : {};

  if (type === 'text') {
    return {
      id: String(raw.id || randomId()),
      type,
      data: {
        text: String(data.text || ''),
        textAlign: ['left', 'center', 'right', 'justify'].includes(String(data.textAlign || ''))
          ? (data.textAlign as any)
          : 'left',
        fontSize: normalizePx(data.fontSize, 12, 48, 16),
      },
    };
  }

  if (type === 'image') {
    return {
      id: String(raw.id || randomId()),
      type,
      data: {
        url: String(data.url || ''),
        alt: String(data.alt || ''),
        align: data.align === 'left' ? 'left' : data.align === 'right' ? 'right' : 'center',
        widthPercent: normalizePercent(data.widthPercent, 100),
        maxHeight: normalizePx(data.maxHeight, 80, 1200, 480),
        objectFit: data.objectFit === 'contain' ? 'contain' : 'cover',
      },
    };
  }

  if (type === 'columns') {
    return {
      id: String(raw.id || randomId()),
      type,
      data: {
        leftText: String(data.leftText || ''),
        rightText: String(data.rightText || ''),
      },
    };
  }

  if (type === 'image_text') {
    return {
      id: String(raw.id || randomId()),
      type,
      data: {
        imageUrl: String(data.imageUrl || ''),
        imageAlt: String(data.imageAlt || ''),
        text: String(data.text || ''),
        imagePosition: data.imagePosition === 'right' ? 'right' : 'left',
        widthPercent: normalizePercent(data.widthPercent, 100),
        maxHeight: normalizePx(data.maxHeight, 80, 1200, 480),
        objectFit: data.objectFit === 'contain' ? 'contain' : 'cover',
        align: data.align === 'left' ? 'left' : data.align === 'right' ? 'right' : 'center',
      },
    };
  }

  if (type === 'spacer') {
    return {
      id: String(raw.id || randomId()),
      type,
      data: {
        height: normalizePx(data.height, 8, 160, 32),
        lineStyle: data.lineStyle === 'line' ? 'line' : 'space',
      },
    };
  }

  if (type === 'banner') {
    return {
      id: String(raw.id || randomId()),
      type,
      data: {
        imageUrl: String(data.imageUrl || ''),
        title: String(data.title || ''),
        subtitle: String(data.subtitle || ''),
        ctaText: String(data.ctaText || ''),
        ctaUrl: String(data.ctaUrl || ''),
        maxHeight: normalizePx(data.maxHeight, 160, 900, 320),
      },
    };
  }

  if (type === 'gallery') {
    const rawItems = Array.isArray(data.galleryImages) ? data.galleryImages : [];
    const galleryImages = rawItems.reduce<Array<{ url: string; alt?: string }>>((acc, item) => {
      if (!isRecord(item)) return acc;
      const url = String(item.url || '').trim();
      if (!url) return acc;
      const alt = String(item.alt || '').trim();
      acc.push(alt ? { url, alt } : { url });
      return acc;
    }, []);

    return {
      id: String(raw.id || randomId()),
      type,
      data: {
        galleryImages,
        galleryColumns: normalizePx(data.galleryColumns, 2, 4, 3),
        maxHeight: normalizePx(data.maxHeight, 100, 900, 320),
        objectFit: data.objectFit === 'contain' ? 'contain' : 'cover',
      },
    };
  }

  return {
    id: String(raw.id || randomId()),
    type,
    data: {
      items: Array.isArray(data.items)
        ? data.items.map((item) => String(item || '')).filter(Boolean)
        : [],
    },
  };
}

function createFallbackTextBlock(text: string): CompanyPageBlock[] {
  const trimmed = String(text || '').trim();
  if (!trimmed) return [];
  return [
    {
      id: randomId(),
      type: 'text',
      data: { text: trimmed.replace(/<[^>]*>/g, '') },
    },
  ];
}

export function createDefaultCompanyPageContent(title = ''): CompanyPageContent {
  return {
    version: 1,
    title: String(title || ''),
    heroImage: '',
    heroHeight: 360,
    blocks: [],
  };
}

export function parseCompanyPageContent(
  raw: unknown,
  fallbackTitle = ''
): { isStructured: boolean; content: CompanyPageContent } {
  const base = createDefaultCompanyPageContent(fallbackTitle);

  const parseFromObject = (obj: Record<string, any>) => {
    const blocks = Array.isArray(obj.blocks)
      ? obj.blocks
          .map((block: unknown) => normalizeBlock(block))
          .filter((block): block is CompanyPageBlock => Boolean(block))
      : [];

    return {
      isStructured: true,
      content: {
        version: 1 as const,
        title: String(obj.title || fallbackTitle || ''),
        heroImage: String(obj.heroImage || ''),
        heroHeight: normalizePx(obj.heroHeight, 180, 900, 360),
        blocks,
      },
    };
  };

  if (isRecord(raw)) {
    return parseFromObject(raw);
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return { isStructured: false, content: base };

    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (isRecord(parsed)) {
          return parseFromObject(parsed);
        }
      } catch {
        // conte�do legado em HTML/texto
      }
    }

    return {
      isStructured: false,
      content: {
        ...base,
        blocks: createFallbackTextBlock(trimmed),
      },
    };
  }

  return { isStructured: false, content: base };
}

export function serializeCompanyPageContent(content: CompanyPageContent): string {
  return JSON.stringify(content);
}

function escapeHtml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function companyPageContentToHtml(raw: unknown, fallbackTitle = ''): string {
  const parsed = parseCompanyPageContent(raw, fallbackTitle);

  if (!parsed.isStructured && typeof raw === 'string') {
    return raw || '<p>Conteúdo não disponível.</p>';
  }

  const sections: string[] = [];

  if (parsed.content.heroImage) {
    const safeHeroHeight = normalizePx(parsed.content.heroHeight, 180, 900, 360);
    sections.push(
      `<section style="margin-bottom:24px"><img src="${escapeHtml(
        parsed.content.heroImage
      )}" alt="capa" style="width:100%;height:${safeHeroHeight}px;border-radius:16px;object-fit:cover"/></section>`
    );
  }

  for (const block of parsed.content.blocks) {
    if (block.type === 'text') {
      sections.push(`<p>${escapeHtml(block.data.text || '').replace(/\n/g, '<br/>')}</p>`);
      continue;
    }

      if (block.type === 'image') {
        if (!block.data.url) continue;
        const widthPercent = normalizePercent(block.data.widthPercent, 100);
        const maxHeight = normalizePx(block.data.maxHeight, 80, 1200, 480);
        const objectFit = block.data.objectFit === 'contain' ? 'contain' : 'cover';
        const align = block.data.align === 'left' || block.data.align === 'right' ? block.data.align : 'center';
        sections.push(
          `<div style="text-align:${escapeHtml(align)}"><figure style="display:inline-block;margin:0"><img src="${escapeHtml(
            block.data.url
          )}" alt="${escapeHtml(block.data.alt || '')}" style="width:${widthPercent}%;max-width:100%;height:auto;max-height:${maxHeight}px;border-radius:16px;object-fit:${objectFit}"/></figure></div>`
        );
        continue;
      }

    if (block.type === 'columns') {
      sections.push(
        `<section style="display:grid;grid-template-columns:1fr 1fr;gap:16px"><div>${escapeHtml(
          block.data.leftText || ''
        ).replace(/\n/g, '<br/>')}</div><div>${escapeHtml(block.data.rightText || '').replace(
          /\n/g,
          '<br/>'
        )}</div></section>`
      );
      continue;
    }

    if (block.type === 'image_text') {
      const imageUrl = String(block.data.imageUrl || '');
      const imageAlt = String(block.data.imageAlt || '');
      const text = String(block.data.text || '').replace(/\n/g, '<br/>');
      const imagePosition = block.data.imagePosition === 'right' ? 'right' : 'left';
        const widthPercent = normalizePercent(block.data.widthPercent, 100);
      const maxHeight = normalizePx(block.data.maxHeight, 80, 1200, 480);
      const objectFit = block.data.objectFit === 'contain' ? 'contain' : 'cover';
        const align = block.data.align === 'left' || block.data.align === 'right' ? block.data.align : 'center';
        const imageTag = `<div style="text-align:${escapeHtml(align)}"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(
          imageAlt
        )}" style="width:${widthPercent}%;max-width:100%;height:auto;max-height:${maxHeight}px;border-radius:16px;object-fit:${objectFit}"/></div>`;
      const leftCol = imagePosition === 'left' ? imageTag : `<div>${escapeHtml(text)}</div>`;
      const rightCol = imagePosition === 'left' ? `<div>${escapeHtml(text)}</div>` : imageTag;
      sections.push(`<section style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:center">${leftCol}${rightCol}</section>`);
      continue;
    }

    if (block.type === 'spacer') {
      const safeHeight = normalizePx(block.data.height, 8, 160, 32);
      if (block.data.lineStyle === 'line') {
        sections.push(`<div style="height:${safeHeight}px;display:flex;align-items:center"><hr style="width:100%;border:none;border-top:1px solid #e2e8f0"/></div>`);
      } else {
        sections.push(`<div style="height:${safeHeight}px"></div>`);
      }
      continue;
    }

    if (block.type === 'banner') {
      const imageUrl = String(block.data.imageUrl || '');
      const title = String(block.data.title || '');
      const subtitle = String(block.data.subtitle || '');
      const ctaText = String(block.data.ctaText || '');
      const ctaUrl = String(block.data.ctaUrl || '');
      const maxHeight = normalizePx(block.data.maxHeight, 160, 900, 320);
      const ctaHtml = ctaText
        ? `<a href="${escapeHtml(ctaUrl || '#')}" style="display:inline-block;margin-top:12px;padding:10px 16px;border-radius:999px;background:#0f172a;color:#fff;text-decoration:none;font-weight:700">${escapeHtml(ctaText)}</a>`
        : '';
      const titleHtml = title ? `<h3 style="margin:0 0 8px 0">${escapeHtml(title)}</h3>` : '';
      const subtitleHtml = subtitle ? `<p style="margin:0">${escapeHtml(subtitle)}</p>` : '';
      const imageHtml = imageUrl
        ? `<img src="${escapeHtml(imageUrl)}" alt="banner" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"/>`
        : '';
      sections.push(`<section style="position:relative;overflow:hidden;border-radius:20px;min-height:${maxHeight}px;padding:24px;background:#0f172a;color:#fff">${imageHtml}<div style="position:relative;z-index:1;max-width:520px;background:rgba(15,23,42,0.55);padding:16px;border-radius:14px">${titleHtml}${subtitleHtml}${ctaHtml}</div></section>`);
      continue;
    }

    if (block.type === 'gallery') {
      const images = Array.isArray(block.data.galleryImages) ? block.data.galleryImages : [];
      if (!images.length) continue;
      const cols = normalizePx(block.data.galleryColumns, 2, 4, 3);
      const maxHeight = normalizePx(block.data.maxHeight, 100, 900, 320);
      const objectFit = block.data.objectFit === 'contain' ? 'contain' : 'cover';
      const cards = images
        .map(
          (item) =>
            `<img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.alt || '')}" style="width:100%;height:${maxHeight}px;object-fit:${objectFit};border-radius:12px"/>`
        )
        .join('');
      sections.push(`<section style="display:grid;grid-template-columns:repeat(${cols}, minmax(0,1fr));gap:12px">${cards}</section>`);
      continue;
    }

    const items = Array.isArray(block.data.items) ? block.data.items : [];
    if (!items.length) continue;
    sections.push(`<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`);
  }

  if (!sections.length) {
    sections.push('<p>Conteúdo não disponível.</p>');
  }

  return sections.join('\n');
}
