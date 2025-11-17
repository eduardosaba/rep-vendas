"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Heart, Star, Truck, ArrowLeft } from "lucide-react";

interface Product {
  id: string;
  name: string;
  brand?: string;
  reference_code?: string;
  description?: string;
  price: number;
  image_url?: string;
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
}

export default function Favorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadFavorites();
    loadSettings();
  }, []);

  useEffect(() => {
    if (favorites.size > 0) {
      loadFavoriteProducts();
    } else {
      setFavoriteProducts([]);
      setLoading(false);
    }
  }, [favorites]);

  const loadFavorites = () => {
    const savedFavorites = localStorage.getItem("favorites");
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)));
    } else {
      setLoading(false);
    }
  };

  const loadFavoriteProducts = async () => {
    const { data: products } = await supabase
      .from("products")
      .select("*")
      .in("id", Array.from(favorites));

    setFavoriteProducts(products || []);
    setLoading(false);
  };

  const loadSettings = async () => {
    const { data: sets } = await supabase.from("settings").select("*").limit(1);
    if (sets && sets.length > 0) {
      setSettings(sets[0]);
    }
  };

  const removeFromFavorites = (productId: string) => {
    const newFavorites = new Set(favorites);
    newFavorites.delete(productId);
    setFavorites(newFavorites);
    localStorage.setItem("favorites", JSON.stringify([...newFavorites]));
    setFavoriteProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const addToCart = (productId: string) => {
    const savedCart = localStorage.getItem("cart");
    const cart = savedCart ? JSON.parse(savedCart) : {};
    cart[productId] = (cart[productId] || 0) + 1;
    localStorage.setItem("cart", JSON.stringify(cart));
    alert("Produto adicionado ao carrinho!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando favoritos...</p>
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
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-8">
              <button
                onClick={() => router.back()}
                className="flex items-center text-gray-600 hover:text-gray-900"
                style={{ color: settings?.icon_color || "#4B5563" }}
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Voltar
              </button>
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
                  Rep-Vendas
                </h1>
              )}
            </div>

            <div className="flex items-center space-x-6">
              <button className="flex flex-col items-center text-blue-600">
                <Heart className="h-6 w-6" />
                <span className="text-xs">Favoritos</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Meus Favoritos
          </h1>
          <p className="text-gray-600">
            {favoriteProducts.length === 0
              ? "Você ainda não favoritou nenhum produto."
              : `${favoriteProducts.length} produto${favoriteProducts.length > 1 ? "s" : ""} favoritado${favoriteProducts.length > 1 ? "s" : ""}`}
          </p>
        </div>

        {favoriteProducts.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="h-24 w-24 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              Nenhum favorito ainda
            </h3>
            <p className="text-gray-600 mb-6">
              Explore nosso catálogo e favorite os produtos que você mais gosta!
            </p>
            <button
              onClick={() => router.push("/")}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              style={{ backgroundColor: settings?.primary_color || "#3B82F6" }}
            >
              Explorar Produtos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favoriteProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden group"
              >
                <div className="relative">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-400 text-sm">
                        Imagem não disponível
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => removeFromFavorites(product.id)}
                    className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-all"
                  >
                    <Heart className="h-4 w-4 text-red-500 fill-current" />
                  </button>
                  <div className="absolute top-3 left-3 bg-green-500 text-white px-2 py-1 rounded text-xs font-bold">
                    Favorito
                  </div>
                </div>

                <div className="p-4">
                  <div className="mb-2">
                    <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">
                      {product.brand || "Marca"}
                    </span>
                  </div>

                  <h3 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2 hover:text-blue-600 cursor-pointer">
                    {product.name}
                  </h3>

                  <div className="flex items-center mb-3">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className="h-3 w-3 text-yellow-400 fill-current"
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-600 ml-1">(127)</span>
                    <span className="text-xs text-gray-400 ml-2">
                      • 42 vendidos
                    </span>
                  </div>

                  <div className="mb-3">
                    <div className="flex items-baseline space-x-2">
                      <span className="text-xl font-bold text-gray-900">
                        R$ {product.price?.toFixed(2)}
                      </span>
                      <span className="text-sm text-gray-500 line-through">
                        R$ {(product.price * 1.2)?.toFixed(2)}
                      </span>
                      <span className="text-xs text-green-600 font-medium">
                        17% OFF
                      </span>
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      12x de R$ {(product.price / 12)?.toFixed(2)} sem juros
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
                    <div className="flex items-center">
                      <Truck className="h-3 w-3 mr-1" />
                      <span>Frete grátis</span>
                    </div>
                    <span>📍 SP</span>
                  </div>

                  <button
                    onClick={() => addToCart(product.id)}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    style={{
                      backgroundColor: settings?.primary_color || "#3B82F6",
                    }}
                  >
                    Adicionar ao Carrinho
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
