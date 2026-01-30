'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  Heart,
  ShoppingCart,
  ArrowLeft,
  Loader2,
  Trash2,
  ShoppingBag,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

// --- TIPAGEM ---
interface Product {
  id: string;
  name: string;
  brand?: string;
  reference_code?: string;
  description?: string;
  price: number;
  sale_price?: number; // Adicionado para cálculo de desconto
  image_url?: string;
  external_image_url?: string;
}

interface Settings {
  id?: string;
  name?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  header_background_color?: string; // Ajustado nome conforme settings
}

export default function FavoritesPage() {
  const supabase = createClient();
  const router = useRouter();

  // Estados
  const [favoritesIds, setFavoritesIds] = useState<Set<string>>(new Set());
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(true);

  // 1. Carregar Configurações e IDs do LocalStorage
  useEffect(() => {
    const init = async () => {
      // CRÍTICO: Buscar settings do usuário autenticado (isolamento multi-tenant)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Carregar Settings - com resiliência .maybeSingle()
      const { data: sets } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (sets) setSettings(sets);

      // Carregar Favoritos do LocalStorage
      const savedFavorites = localStorage.getItem('favorites');
      if (savedFavorites) {
        const ids = new Set<string>(JSON.parse(savedFavorites));
        setFavoritesIds(ids);
      }

      setLoading(false);
    };
    init();
  }, [supabase]);

  // 2. Buscar Detalhes dos Produtos quando IDs mudarem
  useEffect(() => {
    const fetchProducts = async () => {
      if (favoritesIds.size === 0) {
        setProducts([]);
        setLoadingData(false);
        return;
      }

      setLoadingData(true);
      const { data } = await supabase
        .from('products')
        .select('*')
        .in('id', Array.from(favoritesIds));

      setProducts(data || []);
      setLoadingData(false);
    };

    if (!loading) {
      fetchProducts();
    }
  }, [favoritesIds, loading, supabase]);

  // --- AÇÕES ---

  const removeFromFavorites = (productId: string) => {
    const newSet = new Set(favoritesIds);
    newSet.delete(productId);
    setFavoritesIds(newSet);
    localStorage.setItem('favorites', JSON.stringify(Array.from(newSet)));
    toast.success('Produto removido dos favoritos.');
  };

  const addToCart = (product: Product) => {
    const savedCart = localStorage.getItem('cart');
    const cart = savedCart ? JSON.parse(savedCart) : {};

    // Incrementa ou cria
    cart[product.id] = (cart[product.id] || 0) + 1;

    localStorage.setItem('cart', JSON.stringify(cart));
    toast.success(`${product.name} adicionado ao pedido!`, {
      icon: <ShoppingCart size={16} />,
    });
  };

  // Helpers de UI
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);

  const getImageUrl = (p: Product) =>
    p.image_url || p.external_image_url || null;

  // Custom Colors (com fallback)
  const primaryColor = settings?.primary_color || '#3b82f6';
  const headerBg = settings?.header_background_color || '#ffffff';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-300">
      {/* HEADER */}
      <header
        className="sticky top-0 z-40 border-b border-gray-200 dark:border-slate-800 transition-colors shadow-sm"
        style={{ backgroundColor: headerBg }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="rounded-full p-2 text-gray-600 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10 transition-colors"
                title="Voltar"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              {settings?.logo_url ? (
                <div className="relative h-10 w-32">
                  <Image
                    src={settings.logo_url}
                    alt={settings.name || 'Logo'}
                    fill
                    className="object-contain object-left"
                  />
                </div>
              ) : (
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {settings?.name || 'Catálogo'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                <span>{favoritesIds.size}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* CONTEÚDO */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
            Meus Favoritos
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Gerencie os produtos que você marcou como favoritos.
          </p>
        </div>

        {loadingData ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : products.length === 0 ? (
          // EMPTY STATE
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-20 text-center shadow-sm">
            <div className="mb-4 rounded-full bg-gray-100 dark:bg-slate-800 p-4">
              <Heart className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Sua lista está vazia
            </h3>
            <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
              Você ainda não adicionou nenhum produto aos favoritos. Explore o
              catálogo para encontrar o que precisa.
            </p>
            <Button
              onClick={() => router.push('/')}
              className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 text-sm"
            >
              <ShoppingBag size={18} />
              Ir para o Catálogo
            </Button>
          </div>
        ) : (
          // GRID DE PRODUTOS
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const imgUrl = getImageUrl(product);
              // Cálculo simples de desconto visual se houver sale_price e for menor que price
              const hasDiscount =
                product.sale_price && product.sale_price < product.price;
              const discountPercent = hasDiscount
                ? Math.round(
                    ((product.price - (product.sale_price as number)) /
                      product.price) *
                      100
                  )
                : 0;

              return (
                <div
                  key={product.id}
                  className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all hover:border-primary hover:shadow-lg dark:hover:border-primary"
                >
                  {/* Imagem */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-white p-4">
                    {imgUrl ? (
                      String(imgUrl).startsWith('http') &&
                      !String(imgUrl).includes('supabase.co/storage') ? (
                        <img
                          src={imgUrl}
                          alt={product.name}
                          className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <Image
                          src={imgUrl}
                          alt={product.name}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-contain transition-transform duration-300 group-hover:scale-105"
                        />
                      )
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gray-50 dark:bg-slate-800">
                        <AlertCircle className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                      </div>
                    )}

                    {/* Badges */}
                    <div className="absolute left-3 top-3 flex flex-col gap-2">
                      {hasDiscount && (
                        <span className="inline-flex items-center rounded bg-green-500 px-2 py-1 text-xs font-bold text-white shadow-sm">
                          {discountPercent}% OFF
                        </span>
                      )}
                      {product.brand && (
                        <span className="inline-flex items-center rounded bg-gray-900/80 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
                          {product.brand}
                        </span>
                      )}
                    </div>

                    {/* Botão Remover (Overlay) */}
                    <button
                      onClick={() => removeFromFavorites(product.id)}
                      className="absolute right-3 top-3 rounded-full bg-white p-2 text-red-500 shadow-md transition-transform hover:scale-110 hover:bg-red-50 focus:outline-none dark:bg-slate-800"
                      title="Remover dos favoritos"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Informações */}
                  <div className="flex flex-1 flex-col p-4">
                    <div className="mb-2">
                      <p className="text-xs font-mono text-gray-400">
                        Ref: {product.reference_code || 'N/A'}
                      </p>
                      <h3
                        className="line-clamp-2 text-sm font-medium text-gray-900 dark:text-white"
                        title={product.name}
                      >
                        {product.name}
                      </h3>
                    </div>

                    <div className="mt-auto">
                      <div className="mb-4 flex items-end gap-2">
                        <div className="flex flex-col">
                          {hasDiscount && (
                            <span className="text-xs text-gray-400 line-through decoration-red-400">
                              {formatCurrency(product.price)}
                            </span>
                          )}
                          <span className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatCurrency(
                              hasDiscount
                                ? (product.sale_price as number)
                                : product.price
                            )}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => addToCart(product)}
                        className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white shadow-sm transition-transform active:scale-95"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <ShoppingCart size={16} />
                        Adicionar ao Pedido
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
