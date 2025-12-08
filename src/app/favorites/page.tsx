'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { SYSTEM_LOGO_URL } from '@/lib/constants';
import { useRouter } from 'next/navigation';
import { Heart, Star, Truck, ArrowLeft } from 'lucide-react';

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
    const savedFavorites = localStorage.getItem('favorites');
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)));
    } else {
      setLoading(false);
    }
  };

  const loadFavoriteProducts = async () => {
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .in('id', Array.from(favorites));

    setFavoriteProducts(products || []);
    setLoading(false);
  };

  const loadSettings = async () => {
    const { data: sets } = await supabase.from('settings').select('*').limit(1);
    if (sets && sets.length > 0) {
      setSettings(sets[0]);
    }
  };

  const removeFromFavorites = (productId: string) => {
    const newFavorites = new Set(favorites);
    newFavorites.delete(productId);
    setFavorites(newFavorites);
    localStorage.setItem('favorites', JSON.stringify([...newFavorites]));
    setFavoriteProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const addToCart = (productId: string) => {
    const savedCart = localStorage.getItem('cart');
    const cart = savedCart ? JSON.parse(savedCart) : {};
    cart[productId] = (cart[productId] || 0) + 1;
    localStorage.setItem('cart', JSON.stringify(cart));
    alert('Produto adicionado ao Pedido!');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Carregando favoritos...</p>
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
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-8">
              <button
                onClick={() => router.back()}
                className="flex items-center text-gray-600 hover:text-gray-900"
                style={{ color: settings?.icon_color || '#4B5563' }}
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Voltar
              </button>
              <img
                src={settings?.logo_url || SYSTEM_LOGO_URL}
                alt={settings?.name || 'Rep-Vendas'}
                className="h-14 w-auto"
              />
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
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Meus Favoritos
          </h1>
          <p className="text-gray-600">
            {favoriteProducts.length === 0
              ? 'Você ainda não favoritou nenhum produto.'
              : `${favoriteProducts.length} produto${favoriteProducts.length > 1 ? 's' : ''} favoritado${favoriteProducts.length > 1 ? 's' : ''}`}
          </p>
        </div>

        {favoriteProducts.length === 0 ? (
          <div className="py-16 text-center">
            <Heart className="mx-auto mb-4 h-24 w-24 text-gray-300" />
            <h3 className="mb-2 text-xl font-medium text-gray-900">
              Nenhum favorito ainda
            </h3>
            <p className="mb-6 text-gray-600">
              Explore nosso catálogo e favorite os produtos que você mais gosta!
            </p>
            <button
              onClick={() => router.push('/')}
              className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
              style={{ backgroundColor: settings?.primary_color || '#3B82F6' }}
            >
              Explorar Produtos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {favoriteProducts.map((product) => (
              <div
                key={product.id}
                className="group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:shadow-lg"
              >
                <div className="relative">
                  {(() => {
                    const img =
                      (product as any).image_url ||
                      (product as any).external_image_url ||
                      null;
                    return img ? (
                      <img
                        src={img}
                        alt={product.name}
                        className="h-48 w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-48 w-full items-center justify-center bg-gray-100">
                        <span className="text-sm text-gray-400">
                          Imagem não disponível
                        </span>
                      </div>
                    );
                  })()}
                  <button
                    onClick={() => removeFromFavorites(product.id)}
                    className="absolute right-3 top-3 rounded-full bg-white p-2 shadow-md transition-all hover:bg-red-50"
                  >
                    <Heart className="h-4 w-4 fill-current text-red-500" />
                  </button>
                  <div className="absolute left-3 top-3 rounded bg-green-500 px-2 py-1 text-xs font-bold text-white">
                    Favorito
                  </div>
                </div>

                <div className="p-4">
                  <div className="mb-2">
                    <span className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600">
                      {product.brand || 'Marca'}
                    </span>
                  </div>

                  <h3 className="mb-2 line-clamp-2 cursor-pointer text-sm font-medium text-gray-900 hover:text-blue-600">
                    {product.name}
                  </h3>

                  <div className="mb-3 flex items-center">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className="h-3 w-3 fill-current text-yellow-400"
                        />
                      ))}
                    </div>
                    <span className="ml-1 text-xs text-gray-600">(127)</span>
                    <span className="ml-2 text-xs text-gray-400">
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
                      <span className="text-xs font-medium text-green-600">
                        17% OFF
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-green-600">
                      12x de R$ {(product.price / 12)?.toFixed(2)} sem juros
                    </div>
                  </div>

                  <div className="mb-3 flex items-center justify-between text-xs text-gray-600">
                    <div className="flex items-center">
                      <Truck className="mr-1 h-3 w-3" />
                      <span>Frete grátis</span>
                    </div>
                    <span>📍 SP</span>
                  </div>

                  <button
                    onClick={() => addToCart(product.id)}
                    className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                    style={{
                      backgroundColor: settings?.primary_color || '#3B82F6',
                    }}
                  >
                    Adicionar ao Pedido
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
