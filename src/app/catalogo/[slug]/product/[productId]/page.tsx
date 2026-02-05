'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SYSTEM_LOGO_URL } from '@/lib/constants';
import { useRouter, useParams } from 'next/navigation';
import {
  Heart,
  ShoppingCart,
  LogIn,
  Star,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ZoomIn,
} from 'lucide-react';
import ImageWithRetry from '@/components/ui/ImageWithRetry';
import { ProductGallery } from '@/components/catalog/ProductGallery'; // Novo Import
import { toast } from 'sonner';
import { buildSupabaseImageUrl } from '@/lib/imageUtils';
import { getProductImage } from '@/lib/utils/image-logic';

// Função para formatar preços no formato brasileiro
const formatPrice = (price: number): string => {
  return price.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

interface Product {
  id: string;
  name: string;
  brand?: string;
  reference_code?: string;
  description?: string;
  price: number;
  images?: string[];
  gallery_images?: { url: string; path: string }[]; // ✨ NOVO v1.3: Galeria dedicada
  product_images?: {
    id: string;
    url: string;
    sync_status: string;
    position: number;
  }[]; // Novo Campo
  bestseller?: boolean;
  is_launch?: boolean;
  technical_specs?: string;
}

interface Settings {
  id?: string;
  user_id?: string;
  name?: string;
  email?: string;
  phone?: string;
  logo_url?: string;
  banner_url?: string;
  primary_color?: string;
  secondary_color?: string;
  header_color?: string;
  font_family?: string;
  title_color?: string;
  icon_color?: string;
  show_shipping?: boolean;
  show_installments?: boolean;
  show_delivery_address?: boolean;
  show_installments_checkout?: boolean;
  show_discount?: boolean;
  show_old_price?: boolean;
  show_filter_price?: boolean;
  show_filter_category?: boolean;
  show_filter_bestseller?: boolean;
  show_filter_new?: boolean;
}

export default function ProductDetailPage() {
  const supabase = createClient();
  const params = useParams();
  const slug = params.slug as string;
  const productId = params.productId as string;
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [parsedSpecs, setParsedSpecs] = useState<
    { key: string; value: string }[] | null
  >(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalView, setModalView] = useState<'image' | 'specs'>('image');
  const [loading, setLoading] = useState(true);
  // usar sonner programático

  // Helpers para escolher cor de contraste quando necessário
  const normalizeHex = (s?: string) => {
    if (!s) return null;
    const hex = s.trim();
    if (hex.startsWith('#')) return hex.toLowerCase();
    return hex.toLowerCase();
  };

  const getContrastColor = (hex?: string) => {
    if (!hex) return '#111827';
    try {
      const h = normalizeHex(hex)!.replace('#', '');
      const r = parseInt(h.substring(0, 2), 16);
      const g = parseInt(h.substring(2, 4), 16);
      const b = parseInt(h.substring(4, 6), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.6 ? '#111827' : '#ffffff';
    } catch (e) {
      return '#111827';
    }
  };

  const choosePriceColor = (s?: Settings | null) => {
    if (!s) return undefined;
    const title = s.title_color;
    const header = s.header_color;
    if (title && header && normalizeHex(title) === normalizeHex(header)) {
      return getContrastColor(header || title);
    }
    return title || undefined;
  };

  useEffect(() => {
    if (slug && productId) {
      // Carrega configurações da loja (por catalog_slug) e então o produto
      loadStoreAndProduct();
    }
  }, [slug, productId]);

  const loadStoreAndProduct = async () => {
    try {
      // Buscar configurações da loja usando catalog_slug
      const { data: store, error: storeError } = await supabase
        .from('settings')
        .select('*')
        .eq('catalog_slug', slug)
        .maybeSingle();

      if (storeError || !store) throw new Error('Loja não encontrada');

      setSettings(store as Settings);

      // Agora buscar produto escopado pelo user_id da loja
      const { data, error } = await supabase
        .from('products')
        .select('*, product_images(*), gallery_images')
        .eq('id', productId)
        .eq('user_id', store.user_id)
        .order('position', { foreignTable: 'product_images', ascending: true }) // Ordena fotos
        .maybeSingle();

      if (error) throw error;

      setProduct(data as Product);
      // Parse technical_specs into table if possible (support objects, arrays, JSON strings and simple "key: value" text)
      try {
        const raw = (data as any)?.technical_specs;
        const toRowsFromObject = (obj: Record<string, any>) =>
          Object.entries(obj).map(([k, v]) => ({ key: k, value: String(v) }));

        const toRowsFromArray = (arr: any[]) => {
          const rows: { key: string; value: string }[] = [];
          for (const item of arr) {
            if (!item) continue;
            if (typeof item === 'object' && !Array.isArray(item)) {
              if ('key' in item && 'value' in item) {
                rows.push({
                  key: String((item as any).key),
                  value: String((item as any).value),
                });
              } else {
                for (const [k, v] of Object.entries(item)) {
                  rows.push({ key: k, value: String(v) });
                }
              }
            } else if (Array.isArray(item) && item.length >= 2) {
              rows.push({ key: String(item[0]), value: String(item[1]) });
            }
          }
          return rows.length ? rows : null;
        };

        const tryParseLines = (txt: string) => {
          const lines = txt
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean);
          const rows: { key: string; value: string }[] = [];
          for (const line of lines) {
            let sep: string | null = null;
            if (line.includes(':')) sep = ':';
            else if (line.includes('=')) sep = '=';
            else if (line.includes(' - ')) sep = ' - ';
            if (!sep) continue;
            const parts = line.split(sep);
            const key = parts.shift()?.trim() || '';
            const value = parts.join(sep).trim();
            if (key) rows.push({ key, value });
          }
          return rows.length ? rows : null;
        };

        if (raw) {
          // Raw is already an object/array
          if (typeof raw === 'object') {
            if (Array.isArray(raw)) {
              const rows = toRowsFromArray(raw as any[]);
              setParsedSpecs(rows);
            } else {
              setParsedSpecs(toRowsFromObject(raw as Record<string, any>));
            }
          } else if (typeof raw === 'string') {
            // Try JSON parse
            try {
              const parsed = JSON.parse(raw);
              if (parsed && typeof parsed === 'object') {
                if (Array.isArray(parsed)) {
                  const rows = toRowsFromArray(parsed as any[]);
                  setParsedSpecs(rows);
                } else {
                  setParsedSpecs(
                    toRowsFromObject(parsed as Record<string, any>)
                  );
                }
              } else {
                // fallback to simple lines like "key: value"
                setParsedSpecs(tryParseLines(raw));
              }
            } catch (e) {
              // not JSON: try simple lines
              setParsedSpecs(tryParseLines(raw));
            }
          } else {
            setParsedSpecs(null);
          }
        } else {
          setParsedSpecs(null);
        }
      } catch (e) {
        setParsedSpecs(null);
      }
    } catch (error) {
      console.error('Erro ao carregar produto/loja:', error);
      toast.error('Produto não encontrado.');
      router.push(`/catalogo/${slug}`);
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    // Carregar favoritos do localStorage
    const savedFavorites = localStorage.getItem('favorites');
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)));
    }

    // Carregar Pedido do localStorage
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  };

  // Preparar dados para o componente ProductGallery
  const galleryData = (() => {
    if (!product) return [];
    // Helper para criar item (respeita storage path quando existir)
    const makeItem = (
      url: string | null,
      storagePath: string | null,
      sync_status = 'synced',
      id?: string
    ) => {
      const optimizedUrl = url || null;
      const smallUrl = storagePath
        ? getProductImage(optimizedUrl, 'small')
        : optimizedUrl;
      const mediumUrl = storagePath
        ? getProductImage(optimizedUrl, 'medium')
        : optimizedUrl;
      const largeUrl = storagePath
        ? getProductImage(optimizedUrl, 'large')
        : optimizedUrl;
      const fallback = '/images/product-placeholder.svg';
      return {
        id: id || `img-${Math.random().toString(36).slice(2, 9)}`,
        url: mediumUrl || optimizedUrl || fallback,
        thumbnailUrl: smallUrl || optimizedUrl || fallback,
        zoomUrl: largeUrl || optimizedUrl || fallback,
        sync_status: sync_status,
      };
    };

    // 1. Prioridade: `gallery_images` (nova coluna) — NÃO inclui capa por design
    const galleryImagesField = (product as any).gallery_images;
    const coverUrl = (product as any).image_url || null;
    if (
      galleryImagesField &&
      Array.isArray(galleryImagesField) &&
      galleryImagesField.length > 0
    ) {
      // montar lista: capa primeiro (se existir), depois galeria (removendo duplicados)
      const seen = new Set<string>();
      const result: any[] = [];
      if (coverUrl) {
        const coverPath = (product as any).image_path || null;
        const cov = makeItem(coverUrl, coverPath, 'synced', 'cover');
        seen.add(
          (cov.zoomUrl || cov.url || '').split('?')[0].replace(/#.*$/, '')
        );
        result.push(cov);
      }

      for (let i = 0; i < galleryImagesField.length; i++) {
        const img = galleryImagesField[i];
        const url = img?.url || null;
        const path = img?.path || null;
        const key = (url || '').split('?')[0].replace(/#.*$/, '');
        if (!url) continue;
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(makeItem(url, path, 'synced', `gallery-${i}`));
      }
      return result;
    }

    // 2. Fallback: Tabela product_images (Arquitetura Antiga)
    if (product.product_images && product.product_images.length > 0) {
      // Map to gallery items then dedupe by resolved url to avoid duplicates
      const items = product.product_images.map((img: any) => {
        const isPending = img.sync_status === 'pending';
        const isSynced = img.sync_status === 'synced';
        const optimizedUrl = isSynced ? img.optimized_url || null : null;
        const storagePath = isSynced ? img.storage_path || null : null;
        const baseUrl = optimizedUrl || img.url || null;
        return makeItem(
          baseUrl,
          storagePath,
          img.sync_status || 'pending',
          img.id
        );
      });

      // ensure cover is first (prefer is_primary or match with product.image_url)
      const coverKey = (coverUrl || '').split('?')[0].replace(/#.*$/, '');
      const ordered: any[] = [];
      const seen2 = new Set<string>();

      // 1) try to find is_primary
      const primary = product.product_images.find((pi: any) => pi.is_primary);
      if (primary) {
        const pkey = ((primary as any).optimized_url || primary.url || '')
          .split('?')[0]
          .replace(/#.*$/, '');
        if (pkey) {
          const pItem = items.find((it) => it.id === primary.id);
          if (pItem) {
            ordered.push(pItem);
            seen2.add(
              (pItem.zoomUrl || pItem.url || '')
                .split('?')[0]
                .replace(/#.*$/, '')
            );
          }
        }
      }

      // 2) if no primary found, try to use product.image_url
      if (ordered.length === 0 && coverKey) {
        const match = items.find(
          (it) =>
            (it.zoomUrl || it.url || '').split('?')[0].replace(/#.*$/, '') ===
            coverKey
        );
        if (match) {
          ordered.push(match);
          seen2.add(coverKey);
        }
      }

      // 3) append remaining items excluding seen and excluding duplicates of cover
      for (const it of items) {
        const key = (it.zoomUrl || it.url || it.thumbnailUrl || '')
          .split('?')[0]
          .replace(/#.*$/, '');
        if (!key) continue;
        if (seen2.has(key)) continue;
        seen2.add(key);
        ordered.push(it);
      }

      return ordered;
    }

    // 3. Fallback Final: Colunas Antigas convertidas para formato da galeria
    const legacyImages: {
      id: string;
      url: string;
      thumbnailUrl: string;
      zoomUrl: string;
      sync_status: string;
    }[] = [];

    // Antiga image_url com filtro "pending" se for externa
    const mainUrl = (product as any).image_url;
    const externalUrl = (product as any).external_image_url;

    if (mainUrl) {
      // Se temos URLs separadas por vírgula na coluna antiga
      const urls = mainUrl.split(',').map((u: string) => u.trim());
      urls.forEach((u: string, idx: number) => {
        const isExternal = u.includes('http') && !u.includes('supabase');
        const displayUrl = isExternal && externalUrl ? externalUrl : u;

        legacyImages.push({
          id: `legacy-${idx}`,
          url: displayUrl,
          thumbnailUrl: displayUrl,
          zoomUrl: displayUrl,
          sync_status: isExternal ? 'pending' : 'synced',
        });
      });
    } else if (externalUrl) {
      // Caso só tenha external_image_url
      legacyImages.push({
        id: 'legacy-0',
        url: externalUrl,
        thumbnailUrl: externalUrl,
        zoomUrl: externalUrl,
        sync_status: 'pending',
      });
    }

    // Se não houver nenhuma imagem, retorna array vazio (ProductGallery mostra placeholder)
    return legacyImages.length > 0 ? legacyImages : [];
  })();

  const toggleFavorite = (productId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(productId)) {
      newFavorites.delete(productId);
    } else {
      newFavorites.add(productId);
    }
    setFavorites(newFavorites);
    localStorage.setItem('favorites', JSON.stringify([...newFavorites]));
  };

  const addToCart = (productId: string, quantity: number) => {
    const newCart = { ...cart };
    const existingQuantity = newCart[productId] || 0;
    newCart[productId] = existingQuantity + quantity;
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));

    toast.success(
      `${quantity}x ${product?.name || 'Produto'} adicionado ao Pedido`
    );
  };

  const nextImage = () => {
    if (galleryData && galleryData.length > 0) {
      setCurrentImageIndex((prev) =>
        prev === galleryData.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (galleryData && galleryData.length > 0) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? galleryData.length - 1 : prev - 1
      );
    }
  };

  const openImageModal = (index: number) => {
    setCurrentImageIndex(index);
    setModalView('image');
    setShowImageModal(true);
  };

  useEffect(() => {
    if (!showImageModal) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        prevImage();
      } else if (e.key === 'ArrowRight') {
        nextImage();
      } else if (e.key === 'Escape') {
        setShowImageModal(false);
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [showImageModal, product]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Carregando produto...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="mb-4 text-6xl">🔍</div>
          <h3 className="mb-2 text-xl font-medium text-gray-900">
            Produto não encontrado
          </h3>
          <button
            onClick={() => router.push(`/catalogo/${slug}`)}
            className="mt-4 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            Voltar ao catálogo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header
        className="border-b border-gray-200 bg-white"
        style={{ backgroundColor: settings?.header_color || '#FFFFFF' }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Top Bar */}
          <div
            className="flex items-center justify-between py-2 text-sm"
            style={{ color: settings?.icon_color || '#4B5563' }}
          >
            <div className="flex items-center space-x-4">
              {settings?.phone && (
                <>
                  <span>📞 {settings.phone}</span>
                  {settings?.email && <span>|</span>}
                </>
              )}
              {settings?.email && <span>✉️ {settings.email}</span>}
            </div>
          </div>

          {/* Main Header */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-8">
              <img
                src={settings?.logo_url || SYSTEM_LOGO_URL}
                alt={settings?.name || 'Rep-Vendas'}
                className="h-14 w-auto"
              />
            </div>

            <div className="mx-8 max-w-2xl flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar produtos..."
                  className="w-full rounded-lg border border-gray-300 py-3 pl-4 pr-12 text-lg focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  onClick={() => router.push(`/catalogo/${slug}`)}
                />
                <button
                  className="absolute right-2 top-2 rounded bg-blue-600 p-2 text-white hover:bg-blue-700"
                  style={{
                    backgroundColor: settings?.primary_color || '#4f46e5', // Fallback: Indigo-600
                  }}
                  onClick={() => router.push(`/catalogo/${slug}`)}
                >
                  🔍
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <button
                onClick={() => router.push('/favorites')}
                className="flex flex-col items-center text-gray-600 hover:text-gray-900"
                style={{ color: settings?.icon_color || '#4B5563' }}
              >
                <Heart className="h-6 w-6" />
                <span className="text-xs">Favoritos ({favorites.size})</span>
              </button>
              <button
                onClick={() => router.push(`/catalogo/${slug}/checkout`)}
                className="flex flex-col items-center text-gray-600 hover:text-gray-900"
                style={{ color: settings?.icon_color || '#4B5563' }}
              >
                <ShoppingCart className="h-6 w-6" />
                <span className="text-xs">
                  Pedido (
                  {Object.values(cart).reduce((total, qty) => total + qty, 0)})
                </span>
              </button>
              <button
                onClick={() => router.push('/login')}
                className="flex flex-col items-center text-gray-600 hover:text-gray-900"
                style={{ color: settings?.icon_color || '#4B5563' }}
              >
                <LogIn className="h-6 w-6" />
                <span className="text-xs">Entrar</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-2 py-4">
            <button
              onClick={() => router.push(`/catalogo/${slug}`)}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Voltar ao catálogo
            </button>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">{product.name}</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Product Images - Galeria Otimizada */}
          <div className="space-y-4">
            <ProductGallery
              imageUrls={galleryData}
              productName={product.name}
            />

            {/* Badge de Bestseller (Overlay fora do componente, se desejar) */}
            {product.bestseller && (
              <div className="mt-2 flex items-center rounded bg-yellow-400 px-3 py-1 text-sm font-bold text-yellow-900 w-fit">
                <Star className="mr-1 h-4 w-4 fill-current" />
                Bestseller
              </div>
            )}
            {/* Badge de Lançamento */}
            {product.is_launch && (
              <div className="mt-1 rounded bg-green-400 px-3 py-1 text-sm font-bold text-green-900 w-fit">
                Lançamento
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Brand */}
            <div>
              <span className="rounded bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600">
                {product.brand || 'Marca'}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>

            {/* Reference Code */}
            {product.reference_code && (
              <p className="text-sm text-gray-600">
                Código de referência: {product.reference_code}
              </p>
            )}

            {/* Barcode */}
            {(product as any).barcode && (
              <p className="text-sm text-gray-600">
                Código de Barras: {(product as any).barcode}
              </p>
            )}

            {/* Price */}
            <div className="space-y-2">
              {(() => {
                const salePrice = (product as any).sale_price ?? null;
                const originalPrice = (product as any).original_price ?? null;
                const currentPrice = salePrice ?? product.price ?? 0;

                return (
                  <>
                    <div className="flex items-baseline space-x-3">
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">
                        R$ {formatPrice(currentPrice)}
                      </span>
                      {settings?.show_old_price && originalPrice && (
                        <span className="text-xl text-gray-500 line-through">
                          R$ {formatPrice(originalPrice)}
                        </span>
                      )}
                      {settings?.show_discount && (
                        <span className="text-lg font-medium text-green-600">
                          17% OFF
                        </span>
                      )}
                    </div>
                    {settings?.show_installments && currentPrice > 0 && (
                      <div className="text-green-600">
                        12x de R$ {formatPrice(currentPrice / 12)} sem juros
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Shipping */}
            {settings?.show_shipping && (
              <div className="flex items-center text-gray-600">
                <svg
                  className="mr-2 h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                <span>Frete grátis para todo o Brasil</span>
              </div>
            )}

            {/* Quantity and Add to Cart */}
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <label className="font-medium text-gray-700">Quantidade:</label>
                <div className="flex items-center rounded border border-gray-300">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-2 text-gray-600 hover:text-gray-900"
                  >
                    -
                  </button>
                  <span className="border-x border-gray-300 px-4 py-2">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-3 py-2 text-gray-600 hover:text-gray-900"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => addToCart(product.id, quantity)}
                  className="flex flex-1 items-center justify-center rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
                  style={{
                    backgroundColor: settings?.primary_color || '#4f46e5', // Fallback: Indigo-600
                  }}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Adicionar ao Pedido
                </button>
                <button
                  onClick={() => toggleFavorite(product.id)}
                  className={`rounded-lg border border-gray-300 p-3 hover:bg-gray-50 ${
                    favorites.has(product.id) ? 'text-red-500' : 'text-gray-400'
                  }`}
                >
                  <Heart
                    className={`h-5 w-5 ${
                      favorites.has(product.id) ? 'fill-current' : ''
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  Descrição
                </h3>
                <p className="leading-relaxed text-gray-700">
                  {product.description}
                </p>
              </div>
            )}

            {/* Technical Specifications */}
            {parsedSpecs && parsedSpecs.length > 0 ? (
              <div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  Ficha Técnica
                </h3>
                <div className="rounded-lg bg-gray-50 p-4">
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-700">
                    {parsedSpecs.map((row) => (
                      <div key={row.key} className="flex items-start gap-3">
                        <dt className="font-medium text-gray-800 w-36">
                          {row.key}
                        </dt>
                        <dd className="flex-1 text-gray-700">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            ) : product.technical_specs ? (
              <div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  Ficha Técnica
                </h3>
                <div className="rounded-lg bg-gray-50 p-4">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700">
                    {product.technical_specs}
                  </pre>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && galleryData.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="relative max-h-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center">
              {modalView === 'image' ? (
                <ImageWithRetry
                  src={
                    galleryData[currentImageIndex]?.zoomUrl ||
                    galleryData[currentImageIndex]?.url ||
                    SYSTEM_LOGO_URL
                  }
                  alt={product.name}
                  className="max-h-full max-w-full object-contain"
                  fallback={SYSTEM_LOGO_URL}
                />
              ) : (
                <div className="max-h-[80vh] w-[min(900px,90vw)] overflow-auto rounded bg-white p-6">
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">
                    Ficha Técnica
                  </h3>
                  {parsedSpecs && parsedSpecs.length > 0 ? (
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-700">
                      {parsedSpecs.map((row) => (
                        <div key={row.key} className="flex items-start gap-3">
                          <dt className="font-medium text-gray-800 w-36">
                            {row.key}
                          </dt>
                          <dd className="flex-1 text-gray-700">{row.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm text-gray-700">
                      {product.technical_specs}
                    </pre>
                  )}
                </div>
              )}
            </div>
            {/* Navigation in modal */}
            {modalView === 'image' && galleryData.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 transform rounded-full bg-white bg-opacity-90 p-3 transition-all hover:bg-opacity-100"
                >
                  <ChevronLeft className="h-6 w-6 text-gray-700" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 transform rounded-full bg-white bg-opacity-90 p-3 transition-all hover:bg-opacity-100"
                >
                  <ChevronRight className="h-6 w-6 text-gray-700" />
                </button>
              </>
            )}
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute right-4 top-4 rounded-full bg-white bg-opacity-90 p-2 transition-all hover:bg-opacity-100"
            >
              <X className="h-6 w-6 text-gray-700" />
            </button>
            {product.technical_specs && (
              <div className="absolute left-4 top-4 flex items-center space-x-2">
                <button
                  onClick={() =>
                    setModalView((v) => (v === 'image' ? 'specs' : 'image'))
                  }
                  className="rounded bg-white bg-opacity-90 px-3 py-1 text-sm font-medium text-gray-800 hover:bg-opacity-100"
                >
                  {modalView === 'image' ? 'Ficha Técnica' : 'Ver Imagem'}
                </button>
              </div>
            )}
            {/* Image counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 transform rounded bg-black bg-opacity-50 px-3 py-1 text-white">
              {currentImageIndex + 1} / {galleryData.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
