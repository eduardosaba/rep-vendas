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
} from 'lucide-react';
import { toast } from 'sonner';

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
  const [settings, setSettings] = useState<Settings | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [loading, setLoading] = useState(true);
  // usar sonner programático

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
        .select('*')
        .eq('id', productId)
        .eq('user_id', store.user_id)
        .maybeSingle();

      if (error) throw error;

      setProduct(data as Product);
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
    if (product?.images && product.images.length > 0) {
      setCurrentImageIndex((prev) =>
        prev === product.images!.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (product?.images && product.images.length > 0) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? product.images!.length - 1 : prev - 1
      );
    }
  };

  const openImageModal = (index: number) => {
    setCurrentImageIndex(index);
    setShowImageModal(true);
  };

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
          {/* Product Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative overflow-hidden rounded-lg bg-white shadow-sm">
              {product.images && product.images.length > 0 ? (
                <>
                  <img
                    src={product.images[currentImageIndex]}
                    alt={product.name}
                    className="h-96 w-full cursor-pointer object-cover"
                    onClick={() => openImageModal(currentImageIndex)}
                  />
                  {/* Navigation arrows */}
                  {product.images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 transform rounded-full bg-white bg-opacity-90 p-2 transition-all hover:bg-opacity-100"
                      >
                        <ChevronLeft className="h-5 w-5 text-gray-700" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 transform rounded-full bg-white bg-opacity-90 p-2 transition-all hover:bg-opacity-100"
                      >
                        <ChevronRight className="h-5 w-5 text-gray-700" />
                      </button>
                    </>
                  )}
                  {/* Badge de Bestseller */}
                  {product.bestseller && (
                    <div className="absolute left-4 top-4 flex items-center rounded bg-yellow-400 px-3 py-1 text-sm font-bold text-yellow-900">
                      <Star className="mr-1 h-4 w-4 fill-current" />
                      Bestseller
                    </div>
                  )}
                  {/* Badge de Lançamento */}
                  {product.is_launch && (
                    <div className="absolute right-4 top-4 rounded bg-green-400 px-3 py-1 text-sm font-bold text-green-900">
                      Lançamento
                    </div>
                  )}
                </>
              ) : (
                <div className="flex h-96 w-full items-center justify-center bg-gray-100">
                  <span className="text-lg text-gray-400">Sem imagem</span>
                </div>
              )}
            </div>

            {/* Thumbnail Images */}
            {product.images && product.images.length > 1 && (
              <div className="flex space-x-2 overflow-x-auto">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`h-20 w-20 flex-shrink-0 overflow-hidden rounded border-2 ${
                      index === currentImageIndex
                        ? 'border-blue-500'
                        : 'border-gray-300'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
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

            {/* Price */}
            <div className="space-y-2">
              {(() => {
                const salePrice = (product as any).sale_price ?? null;
                const originalPrice = (product as any).original_price ?? null;
                const currentPrice = salePrice ?? product.price ?? 0;

                return (
                  <>
                    <div className="flex items-baseline space-x-3">
                      <span className="text-4xl font-bold text-gray-900">
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
            {product.technical_specs && (
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
            )}
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && product.images && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="relative max-h-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={product.images[currentImageIndex]}
              alt={product.name}
              className="max-h-full max-w-full object-contain"
            />
            {/* Navigation in modal */}
            {product.images.length > 1 && (
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
            {/* Image counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 transform rounded bg-black bg-opacity-50 px-3 py-1 text-white">
              {currentImageIndex + 1} / {product.images.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
