"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../../lib/supabaseClient";
import { useRouter, useParams } from "next/navigation";
import {
  Heart,
  ShoppingCart,
  LogIn,
  Star,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { useToast } from "../../../../../hooks/useToast";

// Função para formatar preços no formato brasileiro
const formatPrice = (price: number): string => {
  return price.toLocaleString("pt-BR", {
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
  const params = useParams();
  const userId = params.userId as string;
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
  const { addToast } = useToast();

  useEffect(() => {
    if (userId && productId) {
      loadProduct();
      loadUserData();
    }
  }, [userId, productId]);

  const loadProduct = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .eq("user_id", userId)
        .single();

      if (error) throw error;

      setProduct(data);
    } catch (error) {
      console.error("Erro ao carregar produto:", error);
      addToast({
        title: "Erro",
        message: "Produto não encontrado.",
        type: "error",
      });
      router.push(`/catalog/${userId}`);
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    // Carregar favoritos do localStorage
    const savedFavorites = localStorage.getItem("favorites");
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)));
    }

    // Carregar carrinho do localStorage
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }

    // Carregar configurações do usuário
    try {
      const { data: userSettings, error } = await supabase
        .from("settings")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (userSettings && !error) {
        setSettings(userSettings);
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
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
    localStorage.setItem("favorites", JSON.stringify([...newFavorites]));
  };

  const addToCart = (productId: string, quantity: number) => {
    const newCart = { ...cart };
    const existingQuantity = newCart[productId] || 0;
    newCart[productId] = existingQuantity + quantity;
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));

    addToast({
      title: "Produto adicionado!",
      message: `${quantity}x ${product?.name || "Produto"} adicionado ao carrinho`,
      type: "success",
    });
  };

  const nextImage = () => {
    if (product?.images && product.images.length > 0) {
      setCurrentImageIndex((prev) =>
        prev === product.images!.length - 1 ? 0 : prev + 1,
      );
    }
  };

  const prevImage = () => {
    if (product?.images && product.images.length > 0) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? product.images!.length - 1 : prev - 1,
      );
    }
  };

  const openImageModal = (index: number) => {
    setCurrentImageIndex(index);
    setShowImageModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando produto...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            Produto não encontrado
          </h3>
          <button
            onClick={() => router.push(`/catalog/${userId}`)}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
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
        className="bg-white border-b border-gray-200"
        style={{ backgroundColor: settings?.header_color || "#FFFFFF" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Bar */}
          <div
            className="flex items-center justify-between py-2 text-sm"
            style={{ color: settings?.icon_color || "#4B5563" }}
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
              {settings?.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt="Logo"
                  className="h-14 w-auto"
                />
              ) : (
                <h1
                  className="text-2xl font-bold text-gray-900"
                  style={{
                    color: settings?.title_color || "#111827",
                    fontFamily: settings?.font_family || "Inter, sans-serif",
                  }}
                >
                  {settings?.name || "Rep-Vendas"}
                </h1>
              )}
            </div>

            <div className="flex-1 max-w-2xl mx-8">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar produtos..."
                  className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  onClick={() => router.push(`/catalog/${userId}`)}
                />
                <button
                  className="absolute right-2 top-2 p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  style={{
                    backgroundColor: settings?.primary_color || "#3B82F6",
                  }}
                  onClick={() => router.push(`/catalog/${userId}`)}
                >
                  🔍
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <button
                onClick={() => router.push("/favorites")}
                className="flex flex-col items-center text-gray-600 hover:text-gray-900"
                style={{ color: settings?.icon_color || "#4B5563" }}
              >
                <Heart className="h-6 w-6" />
                <span className="text-xs">Favoritos ({favorites.size})</span>
              </button>
              <button
                onClick={() => router.push(`/catalog/${userId}/checkout`)}
                className="flex flex-col items-center text-gray-600 hover:text-gray-900"
                style={{ color: settings?.icon_color || "#4B5563" }}
              >
                <ShoppingCart className="h-6 w-6" />
                <span className="text-xs">
                  Carrinho (
                  {Object.values(cart).reduce((total, qty) => total + qty, 0)})
                </span>
              </button>
              <button
                onClick={() => router.push("/login")}
                className="flex flex-col items-center text-gray-600 hover:text-gray-900"
                style={{ color: settings?.icon_color || "#4B5563" }}
              >
                <LogIn className="h-6 w-6" />
                <span className="text-xs">Entrar</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-2 py-4">
            <button
              onClick={() => router.push(`/catalog/${userId}`)}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar ao catálogo
            </button>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">{product.name}</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative bg-white rounded-lg overflow-hidden shadow-sm">
              {product.images && product.images.length > 0 ? (
                <>
                  <img
                    src={product.images[currentImageIndex]}
                    alt={product.name}
                    className="w-full h-96 object-cover cursor-pointer"
                    onClick={() => openImageModal(currentImageIndex)}
                  />
                  {/* Navigation arrows */}
                  {product.images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-90 rounded-full p-2 hover:bg-opacity-100 transition-all"
                      >
                        <ChevronLeft className="h-5 w-5 text-gray-700" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-90 rounded-full p-2 hover:bg-opacity-100 transition-all"
                      >
                        <ChevronRight className="h-5 w-5 text-gray-700" />
                      </button>
                    </>
                  )}
                  {/* Badge de Bestseller */}
                  {product.bestseller && (
                    <div className="absolute top-4 left-4 bg-yellow-400 text-yellow-900 px-3 py-1 rounded text-sm font-bold flex items-center">
                      <Star className="h-4 w-4 mr-1 fill-current" />
                      Bestseller
                    </div>
                  )}
                  {/* Badge de Lançamento */}
                  {product.is_launch && (
                    <div className="absolute top-4 right-4 bg-green-400 text-green-900 px-3 py-1 rounded text-sm font-bold">
                      Lançamento
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-96 bg-gray-100 flex items-center justify-center">
                  <span className="text-gray-400 text-lg">Sem imagem</span>
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
                    className={`flex-shrink-0 w-20 h-20 rounded border-2 overflow-hidden ${
                      index === currentImageIndex
                        ? "border-blue-500"
                        : "border-gray-300"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
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
              <span className="text-sm text-blue-600 font-medium bg-blue-50 px-3 py-1 rounded">
                {product.brand || "Marca"}
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
              <div className="flex items-baseline space-x-3">
                <span className="text-4xl font-bold text-gray-900">
                  R$ {formatPrice(product.price)}
                </span>
                {settings?.show_old_price && (
                  <span className="text-xl text-gray-500 line-through">
                    R$ {formatPrice(product.price * 1.2)}
                  </span>
                )}
                {settings?.show_discount && (
                  <span className="text-lg text-green-600 font-medium">
                    17% OFF
                  </span>
                )}
              </div>
              {settings?.show_installments && (
                <div className="text-green-600">
                  12x de R$ {formatPrice(product.price / 12)} sem juros
                </div>
              )}
            </div>

            {/* Shipping */}
            {settings?.show_shipping && (
              <div className="flex items-center text-gray-600">
                <svg
                  className="h-5 w-5 mr-2"
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
                <label className="text-gray-700 font-medium">Quantidade:</label>
                <div className="flex items-center border border-gray-300 rounded">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-2 text-gray-600 hover:text-gray-900"
                  >
                    -
                  </button>
                  <span className="px-4 py-2 border-x border-gray-300">
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
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
                  style={{
                    backgroundColor: settings?.primary_color || "#3B82F6",
                  }}
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Adicionar ao Carrinho
                </button>
                <button
                  onClick={() => toggleFavorite(product.id)}
                  className={`p-3 border border-gray-300 rounded-lg hover:bg-gray-50 ${
                    favorites.has(product.id) ? "text-red-500" : "text-gray-400"
                  }`}
                >
                  <Heart
                    className={`h-5 w-5 ${
                      favorites.has(product.id) ? "fill-current" : ""
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Descrição
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}

            {/* Technical Specifications */}
            {product.technical_specs && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Ficha Técnica
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap">
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
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="relative max-w-5xl max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={product.images[currentImageIndex]}
              alt={product.name}
              className="max-w-full max-h-full object-contain"
            />
            {/* Navigation in modal */}
            {product.images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-90 rounded-full p-3 hover:bg-opacity-100 transition-all"
                >
                  <ChevronLeft className="h-6 w-6 text-gray-700" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-90 rounded-full p-3 hover:bg-opacity-100 transition-all"
                >
                  <ChevronRight className="h-6 w-6 text-gray-700" />
                </button>
              </>
            )}
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 bg-white bg-opacity-90 rounded-full p-2 hover:bg-opacity-100 transition-all"
            >
              <X className="h-6 w-6 text-gray-700" />
            </button>
            {/* Image counter */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded">
              {currentImageIndex + 1} / {product.images.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
