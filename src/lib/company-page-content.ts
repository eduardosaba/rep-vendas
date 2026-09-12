import { sanitizeUrl } from './url-sanitizer';

export { sanitizeUrl };

export type CompanyPageBlockType =
  | 'heading'
  | 'text'
  | 'image'
  | 'columns'
  | 'list'
  | 'image_text'
  | 'spacer'
  | 'banner'
  | 'gallery'
  | 'faq'
  | 'stats'
  | 'testimonials'
  | 'video'
  | 'contact'
  | 'products'
  | 'brands';

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type StatItem = {
  id: string;
  number: string;
  label: string;
};

export type TestimonialItem = {
  id: string;
  author: string;
  role?: string;
  content: string;
  rating?: number; // 1 to 5
  avatarUrl?: string;
};

export type CompanyPageBlock = {
  id: string;
  type: CompanyPageBlockType;
  data: {
    // Heading
    level?: 'h1' | 'h2' | 'h3';

    // General Text / Heading
    text?: string;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    fontSize?: number;

    // Image / Media
    url?: string;
    alt?: string;
    imageUrl?: string;
    imageAlt?: string;

    // Columns
    leftText?: string;
    rightText?: string;

    // List
    items?: string[];

    // Image Text
    imagePosition?: 'left' | 'right';
    align?: 'left' | 'center' | 'right';

    // Spacer
    height?: number;
    lineStyle?: 'space' | 'line';

    // Banner
    title?: string;
    subtitle?: string;
    ctaText?: string;
    ctaUrl?: string;

    // Layout / Sizing
    widthPercent?: number;
    maxHeight?: number;
    objectFit?: 'contain' | 'cover';

    // Gallery
    galleryImages?: Array<{ url: string; alt?: string }>;
    galleryColumns?: number;

    // FAQ (2A)
    faqTitle?: string;
    faqItems?: FaqItem[];

    // Stats (2A)
    statsItems?: StatItem[];
    statsColumns?: 2 | 3 | 4;

    // Testimonials (2A)
    testimonialItems?: TestimonialItem[];

    // Video (2A)
    videoUrl?: string;
    videoTitle?: string;
    videoAspectRatio?: '16:9' | '4:3';

    // Contact (2A)
    useCompanyDefaults?: boolean;
    contactPhone?: string;
    contactWhatsapp?: string;
    contactEmail?: string;
    contactInstagram?: string;
    contactAddress?: string;

    // Products (2B - Dinâmico)
    productsTitle?: string;
    productsSource?: 'featured' | 'launches' | 'brand' | 'category' | 'manual';
    productsBrandId?: string | null;
    productsCategoryId?: string | null;
    productIds?: string[];
    productsLimit?: number; // 4 a 24
    productsLayout?: 'grid' | 'carousel';

    // Brands (2B - Dinâmico)
    brandsTitle?: string;
    brandsSource?: 'company' | 'manual';
    brandIds?: string[];
    brandsColumns?: 2 | 3 | 4 | 6;
  };
};

export type CompanyPageContent = {
  version: 1;
  title: string;
  heroImage: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroCtaText?: string;
  heroCtaUrl?: string;
  heroAlign?: 'left' | 'center' | 'right';
  heroOverlayOpacity?: number; // 0 to 100
  heroHeight?: number; // px
  heroImagePosition?: 'center' | 'top' | 'bottom';
  blocks: CompanyPageBlock[];
};

export type PageBuilderHistoryState<T> = {
  past: T[];
  present: T;
  future: T[];
  maxHistory: number;
};

export function createHistory<T>(initial: T, maxHistory = 80): PageBuilderHistoryState<T> {
  return {
    past: [],
    present: initial,
    future: [],
    maxHistory,
  };
}

export function pushHistoryState<T>(
  history: PageBuilderHistoryState<T>,
  next: T
): PageBuilderHistoryState<T> {
  const max = history.maxHistory || 80;
  const newPast = [...history.past, history.present];
  if (newPast.length > max) {
    newPast.shift();
  }
  return {
    past: newPast,
    present: next,
    future: [],
    maxHistory: max,
  };
}

export function undoHistoryState<T>(history: PageBuilderHistoryState<T>): PageBuilderHistoryState<T> {
  if (history.past.length === 0) return history;
  const previous = history.past[history.past.length - 1];
  const newPast = history.past.slice(0, history.past.length - 1);
  return {
    past: newPast,
    present: previous,
    future: [history.present, ...history.future],
    maxHistory: history.maxHistory,
  };
}

export function redoHistoryState<T>(history: PageBuilderHistoryState<T>): PageBuilderHistoryState<T> {
  if (history.future.length === 0) return history;
  const next = history.future[0];
  const newFuture = history.future.slice(1);
  return {
    past: [...history.past, history.present],
    present: next,
    future: newFuture,
    maxHistory: history.maxHistory,
  };
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
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

export function resolveVideoEmbedUrl(url: string | undefined | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const host = parsed.hostname.toLowerCase();

    // YouTube
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      let videoId = '';
      if (host.includes('youtu.be')) {
        videoId = parsed.pathname.substring(1);
      } else if (parsed.pathname.startsWith('/embed/')) {
        videoId = parsed.pathname.replace('/embed/', '');
      } else if (parsed.pathname.startsWith('/watch')) {
        videoId = parsed.searchParams.get('v') || '';
      } else if (parsed.pathname.startsWith('/shorts/')) {
        videoId = parsed.pathname.replace('/shorts/', '');
      }

      if (videoId) {
        const cleanId = videoId.split('&')[0].split('?')[0];
        return `https://www.youtube-nocookie.com/embed/${cleanId}`;
      }
    }

    // Vimeo
    if (host.includes('vimeo.com')) {
      const match = parsed.pathname.match(/\/(\d+)/);
      if (match && match[1]) {
        return `https://player.vimeo.com/video/${match[1]}`;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function normalizeWhatsApp(phone: string | undefined | null): string {
  if (!phone || typeof phone !== 'string') return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

export function normalizeInstagram(input: string | undefined | null): { username: string; url: string } {
  if (!input || typeof input !== 'string') return { username: '', url: '' };
  let trimmed = input.trim();
  if (!trimmed) return { username: '', url: '' };

  if (trimmed.startsWith('@')) {
    trimmed = trimmed.substring(1);
  }

  if (trimmed.includes('instagram.com/')) {
    try {
      const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      const parts = parsed.pathname.split('/').filter(Boolean);
      const user = parts[0] || '';
      return {
        username: user.replace('@', ''),
        url: sanitizeUrl(`https://instagram.com/${user.replace('@', '')}`),
      };
    } catch {
      // fallback simples
    }
  }

  const cleanUser = trimmed.replace(/[^a-zA-Z0-9_.]/g, '');
  if (!cleanUser) return { username: '', url: '' };

  return {
    username: cleanUser,
    url: `https://instagram.com/${cleanUser}`,
  };
}

export function createBlock(type: CompanyPageBlockType): CompanyPageBlock {
  const id = generateId();

  if (type === 'heading') {
    return {
      id,
      type: 'heading',
      data: {
        text: '',
        level: 'h2',
        align: 'left',
      },
    };
  }

  if (type === 'text') {
    return {
      id,
      type: 'text',
      data: {
        text: '',
        textAlign: 'left',
        fontSize: 16,
      },
    };
  }

  if (type === 'image') {
    return {
      id,
      type: 'image',
      data: {
        url: '',
        alt: '',
        align: 'center',
        widthPercent: 100,
        maxHeight: 480,
        objectFit: 'cover',
      },
    };
  }

  if (type === 'columns') {
    return {
      id,
      type: 'columns',
      data: {
        leftText: '',
        rightText: '',
      },
    };
  }

  if (type === 'list') {
    return {
      id,
      type: 'list',
      data: {
        items: [''],
      },
    };
  }

  if (type === 'image_text') {
    return {
      id,
      type: 'image_text',
      data: {
        imageUrl: '',
        imageAlt: '',
        text: '',
        imagePosition: 'left',
        widthPercent: 100,
        maxHeight: 480,
        objectFit: 'cover',
        align: 'center',
      },
    };
  }

  if (type === 'spacer') {
    return {
      id,
      type: 'spacer',
      data: {
        height: 32,
        lineStyle: 'space',
      },
    };
  }

  if (type === 'gallery') {
    return {
      id,
      type: 'gallery',
      data: {
        galleryImages: [],
        galleryColumns: 3,
        maxHeight: 320,
        objectFit: 'cover',
      },
    };
  }

  if (type === 'faq') {
    return {
      id,
      type: 'faq',
      data: {
        faqTitle: 'Perguntas Frequentes',
        faqItems: [
          { id: generateId(), question: 'Como faço para realizar um pedido?', answer: 'Entre em contato com nossos representantes ou utilize nosso catálogo online.' },
          { id: generateId(), question: 'Qual o prazo de entrega?', answer: 'O prazo varia conforme a região de entrega e disponibilidade dos produtos.' },
        ],
      },
    };
  }

  if (type === 'stats') {
    return {
      id,
      type: 'stats',
      data: {
        statsColumns: 3,
        statsItems: [
          { id: generateId(), number: '+500', label: 'Clientes Atendidos' },
          { id: generateId(), number: '15 Anos', label: 'de Tradição' },
          { id: generateId(), number: '100%', label: 'Garantia de Qualidade' },
        ],
      },
    };
  }

  if (type === 'testimonials') {
    return {
      id,
      type: 'testimonials',
      data: {
        testimonialItems: [
          { id: generateId(), author: 'Carlos Silva', role: 'Proprietário de Loja', content: 'Excelente atendimento e rapidez na entrega. Produtos de altíssima qualidade.', rating: 5, avatarUrl: '' },
        ],
      },
    };
  }

  if (type === 'video') {
    return {
      id,
      type: 'video',
      data: {
        videoUrl: '',
        videoTitle: '',
        videoAspectRatio: '16:9',
      },
    };
  }

  if (type === 'contact') {
    return {
      id,
      type: 'contact',
      data: {
        useCompanyDefaults: true,
        contactPhone: '',
        contactWhatsapp: '',
        contactEmail: '',
        contactInstagram: '',
        contactAddress: '',
      },
    };
  }

  if (type === 'products') {
    return {
      id,
      type: 'products',
      data: {
        productsTitle: 'Produtos em Destaque',
        productsSource: 'featured',
        productsBrandId: null,
        productsCategoryId: null,
        productIds: [],
        productsLimit: 8,
        productsLayout: 'grid',
      },
    };
  }

  if (type === 'brands') {
    return {
      id,
      type: 'brands',
      data: {
        brandsTitle: 'Nossas Marcas',
        brandsSource: 'company',
        brandIds: [],
        brandsColumns: 4,
      },
    };
  }

  return {
    id,
    type: 'banner',
    data: {
      imageUrl: '',
      title: '',
      subtitle: '',
      ctaText: '',
      ctaUrl: '',
      maxHeight: 320,
    },
  };
}

export function insertBlock(
  blocks: CompanyPageBlock[],
  type: CompanyPageBlockType,
  targetIndex?: number
): CompanyPageBlock[] {
  const newBlock = createBlock(type);
  const nextBlocks = [...blocks];

  if (targetIndex === undefined || targetIndex < 0 || targetIndex >= nextBlocks.length) {
    nextBlocks.push(newBlock);
  } else {
    nextBlocks.splice(targetIndex, 0, newBlock);
  }

  return nextBlocks;
}

export function duplicateBlock(blocks: CompanyPageBlock[], id: string): CompanyPageBlock[] {
  const index = blocks.findIndex((b) => b.id === id);
  if (index < 0) return blocks;

  const target = blocks[index];
  const duplicated: CompanyPageBlock = {
    ...structuredClone(target),
    id: generateId(),
  };

  if (Array.isArray(duplicated.data.faqItems)) {
    duplicated.data.faqItems = duplicated.data.faqItems.map((item) => ({ ...item, id: generateId() }));
  }
  if (Array.isArray(duplicated.data.statsItems)) {
    duplicated.data.statsItems = duplicated.data.statsItems.map((item) => ({ ...item, id: generateId() }));
  }
  if (Array.isArray(duplicated.data.testimonialItems)) {
    duplicated.data.testimonialItems = duplicated.data.testimonialItems.map((item) => ({ ...item, id: generateId() }));
  }

  const nextBlocks = [...blocks];
  nextBlocks.splice(index + 1, 0, duplicated);
  return nextBlocks;
}

export function moveBlock(
  blocks: CompanyPageBlock[],
  id: string,
  direction: 'up' | 'down'
): CompanyPageBlock[] {
  const index = blocks.findIndex((b) => b.id === id);
  if (index < 0) return blocks;

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= blocks.length) return blocks;

  const nextBlocks = [...blocks];
  const [moved] = nextBlocks.splice(index, 1);
  nextBlocks.splice(targetIndex, 0, moved);
  return nextBlocks;
}

export function removeBlock(blocks: CompanyPageBlock[], id: string): CompanyPageBlock[] {
  return blocks.filter((b) => b.id !== id);
}

export function reorderBlocks(
  blocks: CompanyPageBlock[],
  fromId: string,
  toId: string
): CompanyPageBlock[] {
  if (!fromId || !toId || fromId === toId) return blocks;
  const fromIndex = blocks.findIndex((b) => b.id === fromId);
  const toIndex = blocks.findIndex((b) => b.id === toId);
  if (fromIndex < 0 || toIndex < 0) return blocks;

  const nextBlocks = [...blocks];
  const [moved] = nextBlocks.splice(fromIndex, 1);
  nextBlocks.splice(toIndex, 0, moved);
  return nextBlocks;
}

export function normalizeBlock(raw: unknown): CompanyPageBlock | null {
  if (!isRecord(raw)) return null;

  const type = String(raw.type || '').trim() as CompanyPageBlockType;
  if (
    ![
      'heading',
      'text',
      'image',
      'columns',
      'list',
      'image_text',
      'spacer',
      'banner',
      'gallery',
      'faq',
      'stats',
      'testimonials',
      'video',
      'contact',
      'products',
      'brands',
    ].includes(type)
  ) {
    return null;
  }

  const data = isRecord(raw.data) ? raw.data : {};

  if (type === 'heading') {
    return {
      id: String(raw.id || generateId()),
      type: 'heading',
      data: {
        text: String(data.text || data.headingText || ''),
        level: ['h1', 'h2', 'h3'].includes(String(data.level || ''))
          ? (data.level as 'h1' | 'h2' | 'h3')
          : 'h2',
        align: ['left', 'center', 'right'].includes(String(data.align || ''))
          ? (data.align as 'left' | 'center' | 'right')
          : 'left',
      },
    };
  }

  if (type === 'text') {
    return {
      id: String(raw.id || generateId()),
      type: 'text',
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
      id: String(raw.id || generateId()),
      type: 'image',
      data: {
        url: sanitizeUrl(data.url || data.imageUrl || ''),
        alt: String(data.alt || data.imageAlt || ''),
        align: data.align === 'left' ? 'left' : data.align === 'right' ? 'right' : 'center',
        widthPercent: normalizePercent(data.widthPercent, 100),
        maxHeight: normalizePx(data.maxHeight, 80, 1200, 480),
        objectFit: data.objectFit === 'contain' ? 'contain' : 'cover',
      },
    };
  }

  if (type === 'columns') {
    return {
      id: String(raw.id || generateId()),
      type: 'columns',
      data: {
        leftText: String(data.leftText || ''),
        rightText: String(data.rightText || ''),
      },
    };
  }

  if (type === 'image_text') {
    return {
      id: String(raw.id || generateId()),
      type: 'image_text',
      data: {
        imageUrl: sanitizeUrl(data.imageUrl || data.url || ''),
        imageAlt: String(data.imageAlt || data.alt || ''),
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
      id: String(raw.id || generateId()),
      type: 'spacer',
      data: {
        height: normalizePx(data.height, 8, 160, 32),
        lineStyle: data.lineStyle === 'line' ? 'line' : 'space',
      },
    };
  }

  if (type === 'banner') {
    return {
      id: String(raw.id || generateId()),
      type: 'banner',
      data: {
        imageUrl: sanitizeUrl(data.imageUrl || data.url || ''),
        title: String(data.title || ''),
        subtitle: String(data.subtitle || ''),
        ctaText: String(data.ctaText || ''),
        ctaUrl: sanitizeUrl(data.ctaUrl || ''),
        maxHeight: normalizePx(data.maxHeight, 160, 900, 320),
      },
    };
  }

  if (type === 'gallery') {
    const rawItems = Array.isArray(data.galleryImages) ? data.galleryImages : [];
    const galleryImages = rawItems.reduce<Array<{ url: string; alt?: string }>>((acc, item) => {
      if (!isRecord(item)) return acc;
      const url = sanitizeUrl(item.url || '');
      if (!url) return acc;
      const alt = String(item.alt || '').trim();
      acc.push(alt ? { url, alt } : { url });
      return acc;
    }, []);

    return {
      id: String(raw.id || generateId()),
      type: 'gallery',
      data: {
        galleryImages,
        galleryColumns: normalizePx(data.galleryColumns, 2, 4, 3),
        maxHeight: normalizePx(data.maxHeight, 100, 900, 320),
        objectFit: data.objectFit === 'contain' ? 'contain' : 'cover',
      },
    };
  }

  if (type === 'faq') {
    const rawItems = Array.isArray(data.faqItems) ? data.faqItems : [];
    const faqItems = rawItems.reduce<FaqItem[]>((acc, item) => {
      if (!isRecord(item)) return acc;
      const question = String(item.question || '').trim();
      const answer = String(item.answer || '').trim();
      if (!question && !answer) return acc;
      acc.push({
        id: String(item.id || generateId()),
        question,
        answer,
      });
      return acc;
    }, []);

    return {
      id: String(raw.id || generateId()),
      type: 'faq',
      data: {
        faqTitle: String(data.faqTitle || 'Perguntas Frequentes'),
        faqItems,
      },
    };
  }

  if (type === 'stats') {
    const rawItems = Array.isArray(data.statsItems) ? data.statsItems : [];
    const statsItems = rawItems.reduce<StatItem[]>((acc, item) => {
      if (!isRecord(item)) return acc;
      const number = String(item.number || '').trim();
      const label = String(item.label || '').trim();
      if (!number && !label) return acc;
      acc.push({
        id: String(item.id || generateId()),
        number,
        label,
      });
      return acc;
    }, []);

    const rawCols = Number(data.statsColumns ?? 3);
    const statsColumns: 2 | 3 | 4 = rawCols === 2 ? 2 : rawCols === 4 ? 4 : 3;

    return {
      id: String(raw.id || generateId()),
      type: 'stats',
      data: {
        statsColumns,
        statsItems,
      },
    };
  }

  if (type === 'testimonials') {
    const rawItems = Array.isArray(data.testimonialItems) ? data.testimonialItems : [];
    const testimonialItems = rawItems.reduce<TestimonialItem[]>((acc, item) => {
      if (!isRecord(item)) return acc;
      const author = String(item.author || '').trim();
      const content = String(item.content || '').trim();
      if (!author && !content) return acc;

      const rawRating = Number(item.rating ?? 5);
      const rating = Number.isFinite(rawRating) ? Math.max(1, Math.min(5, Math.round(rawRating))) : 5;

      acc.push({
        id: String(item.id || generateId()),
        author,
        role: String(item.role || ''),
        content,
        rating,
        avatarUrl: sanitizeUrl(item.avatarUrl || ''),
      });
      return acc;
    }, []);

    return {
      id: String(raw.id || generateId()),
      type: 'testimonials',
      data: {
        testimonialItems,
      },
    };
  }

  if (type === 'video') {
    const videoUrl = sanitizeUrl(data.videoUrl || '');
    const videoTitle = String(data.videoTitle || '');
    const aspectRatio: '16:9' | '4:3' = data.videoAspectRatio === '4:3' ? '4:3' : '16:9';

    return {
      id: String(raw.id || generateId()),
      type: 'video',
      data: {
        videoUrl,
        videoTitle,
        videoAspectRatio: aspectRatio,
      },
    };
  }

  if (type === 'contact') {
    const useCompanyDefaults = data.useCompanyDefaults !== false;

    return {
      id: String(raw.id || generateId()),
      type: 'contact',
      data: {
        useCompanyDefaults,
        contactPhone: String(data.contactPhone || ''),
        contactWhatsapp: String(data.contactWhatsapp || ''),
        contactEmail: String(data.contactEmail || ''),
        contactInstagram: String(data.contactInstagram || ''),
        contactAddress: String(data.contactAddress || ''),
      },
    };
  }

  if (type === 'products') {
    const sourceOptions = ['featured', 'launches', 'brand', 'category', 'manual'];
    const rawSource = String(data.productsSource || 'featured').trim();
    const productsSource = sourceOptions.includes(rawSource) ? (rawSource as any) : 'featured';

    const rawLimit = Number(data.productsLimit ?? 8);
    const productsLimit = Number.isFinite(rawLimit) ? Math.max(4, Math.min(24, rawLimit)) : 8;

    const rawLayout = data.productsLayout === 'carousel' ? 'carousel' : 'grid';
    const productIds = Array.isArray(data.productIds)
      ? data.productIds.map((id) => String(id || '').trim()).filter(Boolean)
      : [];

    return {
      id: String(raw.id || generateId()),
      type: 'products',
      data: {
        productsTitle: String(data.productsTitle || 'Produtos em Destaque'),
        productsSource,
        productsBrandId: data.productsBrandId ? String(data.productsBrandId) : null,
        productsCategoryId: data.productsCategoryId ? String(data.productsCategoryId) : null,
        productIds,
        productsLimit,
        productsLayout: rawLayout,
      },
    };
  }

  if (type === 'brands') {
    const rawSource = data.brandsSource === 'manual' ? 'manual' : 'company';
    const rawCols = Number(data.brandsColumns ?? 4);
    const brandsColumns: 2 | 3 | 4 | 6 = [2, 3, 4, 6].includes(rawCols) ? (rawCols as any) : 4;
    const brandIds = Array.isArray(data.brandIds)
      ? data.brandIds.map((id) => String(id || '').trim()).filter(Boolean)
      : [];

    return {
      id: String(raw.id || generateId()),
      type: 'brands',
      data: {
        brandsTitle: String(data.brandsTitle || 'Nossas Marcas'),
        brandsSource: rawSource,
        brandIds,
        brandsColumns,
      },
    };
  }

  return {
    id: String(raw.id || generateId()),
    type: 'list',
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
      id: generateId(),
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
    heroTitle: '',
    heroSubtitle: '',
    heroCtaText: '',
    heroCtaUrl: '',
    heroAlign: 'center',
    heroOverlayOpacity: 40,
    heroHeight: 360,
    heroImagePosition: 'center',
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

    const heroAlign = ['left', 'center', 'right'].includes(String(obj.heroAlign || ''))
      ? (obj.heroAlign as 'left' | 'center' | 'right')
      : 'center';

    const heroImagePosition = ['center', 'top', 'bottom'].includes(String(obj.heroImagePosition || ''))
      ? (obj.heroImagePosition as 'center' | 'top' | 'bottom')
      : 'center';

    return {
      isStructured: true,
      content: {
        version: 1 as const,
        title: String(obj.title || fallbackTitle || ''),
        heroImage: sanitizeUrl(obj.heroImage || ''),
        heroTitle: String(obj.heroTitle || ''),
        heroSubtitle: String(obj.heroSubtitle || ''),
        heroCtaText: String(obj.heroCtaText || ''),
        heroCtaUrl: sanitizeUrl(obj.heroCtaUrl || ''),
        heroAlign,
        heroOverlayOpacity: normalizePx(obj.heroOverlayOpacity, 0, 100, 40),
        heroHeight: normalizePx(obj.heroHeight, 180, 900, 360),
        heroImagePosition,
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
        // conteúdo legado em HTML/texto
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
  return JSON.stringify({
    ...content,
    version: 1,
  });
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
    const heroTitle = parsed.content.heroTitle ? `<h1>${escapeHtml(parsed.content.heroTitle)}</h1>` : '';
    const heroSubtitle = parsed.content.heroSubtitle ? `<p>${escapeHtml(parsed.content.heroSubtitle)}</p>` : '';
    const heroCta = parsed.content.heroCtaText && parsed.content.heroCtaUrl
      ? `<a href="${escapeHtml(parsed.content.heroCtaUrl)}">${escapeHtml(parsed.content.heroCtaText)}</a>`
      : '';

    sections.push(
      `<section style="margin-bottom:24px;position:relative"><img src="${escapeHtml(
        parsed.content.heroImage
      )}" alt="capa" style="width:100%;height:${safeHeroHeight}px;border-radius:16px;object-fit:cover"/><div>${heroTitle}${heroSubtitle}${heroCta}</div></section>`
    );
  }

  for (const block of parsed.content.blocks) {
    if (block.type === 'heading') {
      const tag = block.data.level || 'h2';
      sections.push(`<${tag}>${escapeHtml(block.data.text || '')}</${tag}>`);
      continue;
    }

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

    if (block.type === 'faq') {
      const items = block.data.faqItems || [];
      if (!items.length) continue;
      const title = block.data.faqTitle ? `<h3>${escapeHtml(block.data.faqTitle)}</h3>` : '';
      const listHtml = items
        .map((i) => `<details><summary>${escapeHtml(i.question)}</summary><p>${escapeHtml(i.answer)}</p></details>`)
        .join('');
      sections.push(`<section>${title}${listHtml}</section>`);
      continue;
    }

    if (block.type === 'stats') {
      const items = block.data.statsItems || [];
      if (!items.length) continue;
      const cols = block.data.statsColumns || 3;
      const cardsHtml = items
        .map((i) => `<div><strong>${escapeHtml(i.number)}</strong><span>${escapeHtml(i.label)}</span></div>`)
        .join('');
      sections.push(`<section style="display:grid;grid-template-columns:repeat(${cols}, 1fr)">${cardsHtml}</section>`);
      continue;
    }

    if (block.type === 'testimonials') {
      const items = block.data.testimonialItems || [];
      if (!items.length) continue;
      const cardsHtml = items
        .map((i) => `<div><p>"${escapeHtml(i.content)}"</p><strong>${escapeHtml(i.author)}</strong></div>`)
        .join('');
      sections.push(`<section>${cardsHtml}</section>`);
      continue;
    }

    if (block.type === 'video') {
      const embedUrl = resolveVideoEmbedUrl(block.data.videoUrl);
      if (!embedUrl) continue;
      sections.push(`<section><iframe src="${escapeHtml(embedUrl)}" style="width:100%;aspect-ratio:16/9"></iframe></section>`);
      continue;
    }

    if (block.type === 'contact') {
      sections.push(`<section><p>Informações de Contato</p></section>`);
      continue;
    }

    if (block.type === 'products') {
      const title = block.data.productsTitle ? `<h3>${escapeHtml(block.data.productsTitle)}</h3>` : '';
      sections.push(`<section>${title}<p>[Bloco Dinâmico de Produtos]</p></section>`);
      continue;
    }

    if (block.type === 'brands') {
      const title = block.data.brandsTitle ? `<h3>${escapeHtml(block.data.brandsTitle)}</h3>` : '';
      sections.push(`<section>${title}<p>[Bloco Dinâmico de Marcas]</p></section>`);
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
