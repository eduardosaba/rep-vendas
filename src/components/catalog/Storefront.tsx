// src/components/catalog/Storefront.tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart,
  Search,
  X,
  Plus,
  Minus,
  Trash2,
  Send,
  Loader2,
  User,
  Save,
  Download,
  Copy,
  Lock,
  Unlock,
  Filter,
  ChevronDown,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Heart,
  Star,
  Zap,
  MapPin,
  Mail,
  Phone,
} from 'lucide-react';
import { createOrder } from '@/app/catalog/actions';
import {
  saveCartAction,
  loadCartAction,
} from '@/app/catalog/saved-carts/actions';
import { useToast } from '@/hooks/useToast';

// --- Componentes Modularizados ---
import { ProductCard } from './ProductCard';
import { PriceDisplay } from './PriceDisplay';

// --- Tipos --- (ATUALIZADOS)
interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  reference_code: string;
  brand: string | null;
  category: string | null;
  description?: string | null;
  images?: string[];
  is_launch?: boolean;
  is_best_seller?: boolean;
  original_price?: number; // NOVO: Para preço cortado
}

interface StoreSettings {
  user_id: string;
  name: string;
  primary_color: string;
  logo_url: string | null;
  phone: string;
  email?: string;
  price_password?: string;
  footer_message?: string;
  banners?: string[];

  // NOVAS CONFIGURAÇÕES DE DISPLAY (Configuráveis pelo usuário)
  show_top_benefit_bar: boolean;
  top_benefit_text?: string;
  show_installments: boolean;
  max_installments: number;
  show_discount_tag: boolean;
  cash_price_discount_percent?: number;
}

interface CartItem extends Product {
  quantity: number;
}

interface StorefrontProps {
  store: StoreSettings;
  initialProducts: Product[];
}

export function Storefront({ store, initialProducts }: StorefrontProps) {
  const { addToast } = useToast();
  const primaryColor = store.primary_color || '#0d1b2c';

  // --- Estados de Dados ---
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isPricesVisible, setIsPricesVisible] = useState(false);

  // --- Estados de Filtro ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<
    'name' | 'price_asc' | 'price_desc'
  >('name');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // --- Estados Visuais (Carrossel Banners) ---
  const [currentBanner, setCurrentBanner] = useState(0);

  // --- Estados de Modais ---
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  // --- Detalhes Produto ---
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  // --- Save/Load ---
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [savedCode, setSavedCode] = useState<string | null>(null);
  const [loadCodeInput, setLoadCodeInput] = useState('');

  // --- Loading/Form ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingCart, setIsLoadingCart] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '' });

  // --- PERSISTÊNCIA ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem(`cart-${store.name}`);
      const savedFavs = localStorage.getItem(`favs-${store.name}`);
      const priceUnlocked = sessionStorage.getItem(`prices-${store.name}`);

      if (savedCart)
        try {
          setCart(JSON.parse(savedCart));
        } catch (e) {}
      if (savedFavs)
        try {
          setFavorites(JSON.parse(savedFavs));
        } catch (e) {}
      if (priceUnlocked === 'true') setIsPricesVisible(true);
    }
  }, [store.name]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`cart-${store.name}`, JSON.stringify(cart));
      localStorage.setItem(`favs-${store.name}`, JSON.stringify(favorites));
    }
  }, [cart, favorites, store.name]);

  // --- LÓGICA DE FILTROS ---
  const brands = useMemo(() => {
    const items = initialProducts
      .map((p) => p.brand)
      .filter(Boolean) as string[];
    return Array.from(new Set(items)).sort();
  }, [initialProducts]);

  const categories = useMemo(() => {
    const items = initialProducts
      .map((p) => p.category)
      .filter(Boolean) as string[];
    return Array.from(new Set(items)).sort();
  }, [initialProducts]);

  const displayProducts = useMemo(() => {
    const result = initialProducts.filter(
      (p) =>
        (p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.reference_code.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (selectedBrand === 'all' || p.brand === selectedBrand) &&
        (selectedCategory === 'all' || p.category === selectedCategory)
    );

    result.sort((a, b) => {
      if (sortOrder === 'price_asc') return a.price - b.price;
      if (sortOrder === 'price_desc') return b.price - a.price;
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [initialProducts, searchTerm, selectedBrand, selectedCategory, sortOrder]);

  // --- EFEITO CARROSSEL BANNERS ---
  useEffect(() => {
    if (store.banners && store.banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentBanner((prev) => (prev + 1) % (store.banners?.length || 1));
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [store.banners]);

  // --- AÇÕES GERAIS ---
  const toggleFavorite = (productId: string) => {
    setFavorites((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const handleUnlockPrices = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = store.price_password || '123456';
    if (passwordInput === correctPassword) {
      setIsPricesVisible(true);
      sessionStorage.setItem(`prices-${store.name}`, 'true');
      setIsPasswordModalOpen(false);
      addToast({ title: 'Preços liberados!', type: 'success' });
    } else {
      addToast({ title: 'Senha incorreta', type: 'error' });
    }
  };

  const addToCart = (product: Product, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing)
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      return [...prev, { ...product, quantity: quantity }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : item;
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    ); // Remove se a quantidade for 0 ou menos
  };

  const removeFromCart = (id: string) =>
    setCart((prev) => prev.filter((item) => item.id !== id));

  const cartTotal = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Helper de Imagens
  const getProductImages = (product: Product) => {
    if (product.images && product.images.length > 0) return product.images;
    if (product.image_url) return [product.image_url];
    return [];
  };

  // Checkout e Save/Load
  const handleFinalizeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerInfo.name.trim() || !customerInfo.phone.trim()) {
      addToast({ title: 'Preencha seus dados', type: 'warning' });
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await createOrder(store.user_id, customerInfo, cart);
      if (result.success) {
        let message = `Olá! Sou *${customerInfo.name}*.\nAcabei de fazer o *Pedido #${result.orderId}*:\n\n`;
        cart.forEach(
          (item) =>
            (message += `▪ ${item.quantity}x ${item.name} (${item.reference_code})\n`)
        );
        if (isPricesVisible)
          message += `\n*Total: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cartTotal)}*`;
        setCart([]);
        localStorage.removeItem(`cart-${store.name}`);
        const url = `https://wa.me/55${store.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
        setIsCheckoutOpen(false);
        setIsCartOpen(false);
        addToast({ title: 'Pedido enviado!', type: 'success' });
      } else {
        addToast({
          title: 'Erro ao processar o pedido: ' + result.message,
          type: 'error',
        });
      }
    } catch {
      addToast({ title: 'Erro ao processar', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCart = async () => {
    setIsSaving(true);
    try {
      const result = await saveCartAction(cart);
      if (result.success && result.shortId) {
        setSavedCode(result.shortId);
        setIsSaveModalOpen(true);
      }
    } catch {
      addToast({ title: 'Erro de conexão', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadCart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loadCodeInput) return;
    setIsLoadingCart(true);
    try {
      const result = await loadCartAction(loadCodeInput);
      if (result.success && result.cartItems) {
        setCart(result.cartItems);
        addToast({ title: 'Carrinho recuperado!', type: 'success' });
        setIsLoadModalOpen(false);
        setIsCartOpen(true);
      } else {
        addToast({ title: 'Não encontrado', type: 'error' });
      }
    } catch {
      addToast({ title: 'Erro ao buscar', type: 'error' });
    } finally {
      setIsLoadingCart(false);
    }
  };

  const copyToClipboard = () => {
    if (savedCode) {
      navigator.clipboard.writeText(savedCode);
      addToast({ title: 'Copiado!', type: 'success' });
    }
  };

  // Objeto de configurações para o ProductCard
  const productCardSettings = useMemo(
    () => ({
      primary_color: primaryColor,
      show_installments: store.show_installments,
      max_installments: store.max_installments,
      show_discount_tag: store.show_discount_tag,
      cash_price_discount_percent: store.cash_price_discount_percent,
    }),
    [primaryColor, store]
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-100">
        <div
          style={{ backgroundColor: primaryColor }}
          className="text-white py-2 px-4 text-xs font-medium text-center md:text-left flex justify-between items-center"
        >
          <span>Bem-vindo à nossa loja digital</span>
          <div className="hidden md:flex gap-4">
            <span className="flex items-center gap-1">
              <Phone size={12} /> {store.phone}
            </span>
            {store.email && (
              <span className="flex items-center gap-1">
                <Mail size={12} /> {store.email}
              </span>
            )}
          </div>
        </div>

        <div className="px-4 py-4 md:py-6 bg-white/95 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 self-start md:self-auto">
              {store.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={store.logo_url}
                  alt={store.name}
                  className="h-12 w-12 object-contain rounded-lg border border-gray-100 shadow-sm"
                />
              ) : (
                <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center font-bold text-xl text-gray-600 border border-gray-200">
                  {store.name.charAt(0)}
                </div>
              )}
              <div>
                <h1 className="font-bold text-xl leading-none text-gray-900">
                  {store.name}
                </h1>
                <p className="text-xs text-gray-500 mt-1">Catálogo Oficial</p>
              </div>
            </div>

            <div className="flex-1 w-full md:max-w-xl relative">
              <input
                type="text"
                placeholder="O que você procura hoje?"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-5 pr-12 py-3 rounded-full border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none shadow-sm"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white rounded-full text-gray-400 hover:text-indigo-600 transition-colors">
                <Search size={20} />
              </button>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              <button
                onClick={() =>
                  isPricesVisible
                    ? setIsPricesVisible(false)
                    : setIsPasswordModalOpen(true)
                }
                className={`p-2.5 rounded-full transition-all ${isPricesVisible ? 'bg-gray-100 text-gray-600' : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'}`}
                title="Preços"
              >
                {isPricesVisible ? <Unlock size={20} /> : <Lock size={20} />}
              </button>
              <div className="h-8 w-px bg-gray-200 mx-1"></div>
              <button
                onClick={() => setIsLoadModalOpen(true)}
                className="p-2.5 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                title="Carregar Pedido"
              >
                <Download size={20} />
              </button>
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2.5 bg-gray-900 text-white hover:bg-gray-800 rounded-full transition-all shadow-md group"
              >
                <ShoppingCart
                  size={20}
                  className="group-hover:scale-110 transition-transform"
                />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* NOVO: BARRA DE BENEFÍCIOS (Ponto Frio Style) */}
      {store.show_top_benefit_bar && store.top_benefit_text && (
        <div className="w-full bg-orange-500 text-white text-center py-2 text-sm font-medium sticky top-24 z-30 shadow-md">
          <div className="max-w-7xl mx-auto px-4">{store.top_benefit_text}</div>
        </div>
      )}

      {/* --- BANNERS --- */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        {store.banners && store.banners.length > 0 ? (
          <div className="w-full h-48 md:h-80 rounded-2xl relative overflow-hidden shadow-md group">
            {store.banners.map((banner, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={index}
                src={banner}
                alt="Banner"
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${index === currentBanner ? 'opacity-100' : 'opacity-0'}`}
              />
            ))}
            {/* Indicadores */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {store.banners.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-all ${idx === currentBanner ? 'bg-white w-6' : 'bg-white/50'}`}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full h-48 md:h-72 bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center relative overflow-hidden shadow-sm">
            <div className="text-center">
              <span className="text-sm uppercase tracking-widest text-gray-500 font-bold mb-2 block">
                Coleção 2025
              </span>
              <h2 className="text-3xl md:text-5xl font-extrabold text-gray-800 mb-4">
                Novas Chegadas
              </h2>
              <button className="px-6 py-2 bg-gray-900 text-white rounded-full font-medium text-sm hover:bg-black transition-colors">
                Ver Produtos
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- CARROSSEL DE CATEGORIAS --- */}
      {categories.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 mt-8">
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`flex-shrink-0 px-6 py-2 rounded-full text-sm font-bold transition-all border ${selectedCategory === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex-shrink-0 px-6 py-2 rounded-full text-sm font-bold transition-all border ${selectedCategory === cat ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* --- MAIN CONTENT --- */}
      <main className="max-w-7xl mx-auto px-4 py-8 flex gap-8 items-start flex-1">
        {/* SIDEBAR FILTROS (MANTIDA) */}
        <aside
          className={`
          fixed inset-y-0 left-0 z-40 w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:shadow-none lg:w-64 lg:block
          ${isFilterOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        >
          <div className="p-5 lg:p-0 space-y-8 sticky top-32">
            <div className="flex items-center justify-between lg:hidden mb-4">
              <h3 className="font-bold text-lg">Filtros</h3>
              <button onClick={() => setIsFilterOpen(false)}>
                <X size={24} />
              </button>
            </div>

            {/* Destaques */}
            <div>
              <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wider">
                Explorar
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => {}}
                  className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                    <Zap size={14} />
                  </div>
                  <span className="font-medium text-sm">Lançamentos</span>
                </button>
                <button
                  onClick={() => {}}
                  className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center">
                    <Star size={14} />
                  </div>
                  <span className="font-medium text-sm">Mais Vendidos</span>
                </button>
                <button
                  onClick={() => {}}
                  className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                    <Heart size={14} />
                  </div>
                  <span className="font-medium text-sm">
                    Favoritos ({favorites.length})
                  </span>
                </button>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Marcas */}
            {brands.length > 0 && (
              <div>
                <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wider">
                  Marcas
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  <label className="flex items-center gap-3 cursor-pointer group p-1">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedBrand === 'all' ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}
                    >
                      {selectedBrand === 'all' && (
                        <Send size={10} className="text-white rotate-45" />
                      )}
                    </div>
                    <input
                      type="radio"
                      name="brand"
                      value="all"
                      checked={selectedBrand === 'all'}
                      onChange={() => setSelectedBrand('all')}
                      className="hidden"
                    />
                    <span className="text-sm text-gray-600 group-hover:text-gray-900">
                      Todas
                    </span>
                  </label>
                  {brands.map((brand) => (
                    <label
                      key={brand}
                      className="flex items-center gap-3 cursor-pointer group p-1"
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedBrand === brand ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}
                      >
                        {selectedBrand === brand && (
                          <Send size={10} className="text-white rotate-45" />
                        )}
                      </div>
                      <input
                        type="radio"
                        name="brand"
                        value={brand}
                        checked={selectedBrand === brand}
                        onChange={() => setSelectedBrand(brand)}
                        className="hidden"
                      />
                      <span className="text-sm text-gray-600 group-hover:text-gray-900">
                        {brand}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* GRID PRODUTOS (REFATORADO) */}
        <div className="flex-1 w-full">
          {isFilterOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-30 lg:hidden"
              onClick={() => setIsFilterOpen(false)}
            />
          )}

          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              Mostrando <strong>{displayProducts.length}</strong> produtos
            </p>

            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 hidden sm:inline">
                Ordenar por:
              </span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="p-2 pr-8 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="name">Nome (A-Z)</option>
                <option value="price_asc">Menor Preço</option>
                <option value="price_desc">Maior Preço</option>
              </select>
              <button
                onClick={() => setIsFilterOpen(true)}
                className="lg:hidden p-2 border rounded-lg"
              >
                <Filter size={18} />
              </button>
            </div>
          </div>

          {displayProducts.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
              <Search size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-bold text-gray-900">
                Nenhum produto encontrado
              </h3>
              <p className="text-gray-500">
                Tente mudar os filtros ou a busca.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {displayProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  storeSettings={productCardSettings as any}
                  isFavorite={favorites.includes(product.id)}
                  isPricesVisible={isPricesVisible}
                  onAddToCart={addToCart}
                  onToggleFavorite={toggleFavorite}
                  onViewDetails={setViewProduct}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* --- FOOTER (MANTIDO) --- */}
      <footer className="bg-white border-t border-gray-200 pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h4 className="font-bold text-lg mb-4">{store.name}</h4>
              <p className="text-gray-500 text-sm mb-4">
                {store.footer_message ||
                  'Encontre os melhores produtos com a qualidade que você confia. Atendimento personalizado e entrega garantida.'}
              </p>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 mb-4">Contato</h4>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <Phone size={16} className="text-indigo-600" /> {store.phone}
                </li>
                {store.email && (
                  <li className="flex items-center gap-2">
                    <Mail size={16} className="text-indigo-600" /> {store.email}
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <MapPin size={16} className="text-indigo-600" /> Atendemos
                  toda a região
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 mb-4">Links Úteis</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <button
                    onClick={() => setIsLoadModalOpen(true)}
                    className="hover:text-indigo-600"
                  >
                    Acompanhar Pedido
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setIsPasswordModalOpen(true)}
                    className="hover:text-indigo-600"
                  >
                    Área do Representante
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-8 text-center text-xs text-gray-400">
            <p>
              &copy; {new Date().getFullYear()} {store.name}. Todos os direitos
              reservados. Powered by RepVendas.
            </p>
          </div>
        </div>
      </footer>

      {/* --- MODAL CARRINHO (MANTIDO) --- */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setIsCartOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b flex items-center justify-between bg-gray-50">
              <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <ShoppingCart size={20} /> Seu Pedido
              </h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 text-gray-500 hover:bg-gray-200 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <ShoppingCart size={48} className="mb-4 opacity-20" />
                  <p>Seu carrinho está vazio.</p>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="mt-4 text-indigo-600 font-medium hover:underline"
                  >
                    Continuar comprando
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="flex gap-3 bg-white border rounded-lg p-3 shadow-sm"
                      >
                        <div className="h-16 w-16 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                          {item.image_url && (
                            <img
                              src={item.image_url}
                              className="w-full h-full object-cover"
                              alt={item.name}
                            />
                          )}
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <h4 className="font-medium text-sm text-gray-900 line-clamp-1">
                              {item.name}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {item.reference_code}
                            </p>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <PriceDisplay
                              value={item.price * item.quantity}
                              isPricesVisible={isPricesVisible}
                              size="normal"
                              className="font-bold text-sm"
                            />
                            <div className="flex items-center gap-3 bg-gray-100 rounded-lg px-2 py-1">
                              <button
                                onClick={() => updateQuantity(item.id, -1)}
                                className="p-0.5 hover:text-red-600"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="text-xs font-bold w-4 text-center">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, 1)}
                                className="p-0.5 hover:text-green-600"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-gray-300 hover:text-red-500 self-start"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* UPSELL AREA */}
                  <div className="mt-8 pt-6 border-t border-dashed border-gray-200">
                    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Star
                        size={14}
                        className="text-yellow-500 fill-yellow-500"
                      />{' '}
                      Aproveite também
                    </h4>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                      {initialProducts
                        .filter(
                          (p) =>
                            p.is_best_seller && !cart.find((c) => c.id === p.id)
                        )
                        .slice(0, 3)
                        .map((p) => (
                          <div
                            key={p.id}
                            className="min-w-[120px] w-[120px] border rounded-lg p-2 flex flex-col bg-gray-50"
                          >
                            <div className="h-20 w-full bg-white rounded mb-2 overflow-hidden">
                              {p.image_url && (
                                <img
                                  src={p.image_url}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <p className="text-xs font-medium truncate mb-1">
                              {p.name}
                            </p>
                            <PriceDisplay
                              value={p.price}
                              isPricesVisible={isPricesVisible}
                              size="normal"
                              className="text-xs font-bold text-indigo-600"
                            />
                            <button
                              onClick={() => addToCart(p)}
                              className="mt-2 w-full py-1 bg-white border border-indigo-200 text-indigo-600 text-xs font-bold rounded hover:bg-indigo-50"
                            >
                              Add +
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 border-t bg-gray-50 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Estimado</span>
                  {isPricesVisible ? (
                    <span className="text-xl font-bold text-gray-900">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(cartTotal)}
                    </span>
                  ) : (
                    <span className="text-xl font-mono text-gray-400 font-bold">
                      R$ ***
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleSaveCart}
                    disabled={isSaving}
                    className="py-3 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <Save size={18} />
                    )}{' '}
                    Salvar
                  </button>
                  <button
                    onClick={() => setIsCheckoutOpen(true)}
                    className="py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 bg-[#25D366] hover:brightness-105"
                  >
                    <Send size={18} /> Finalizar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODAIS DE PRODUTO, SENHA, CHECKOUT, SAVE, LOAD (MANTIDOS) --- */}
      {viewProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setViewProduct(null)}
          />
          <div className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-200 max-h-[90vh] md:max-h-[600px]">
            <button
              onClick={() => setViewProduct(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-white/80 rounded-full hover:bg-white text-gray-500 hover:text-gray-900 shadow-sm"
            >
              <X size={20} />
            </button>
            <div className="w-full md:w-1/2 bg-gray-100 relative flex flex-col">
              <div className="flex-1 relative flex items-center justify-center overflow-hidden group">
                {getProductImages(viewProduct).length > 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getProductImages(viewProduct)[currentImageIndex]}
                    alt={viewProduct.name}
                    className="w-full h-full object-contain cursor-zoom-in"
                    onClick={() => setIsZoomOpen(true)}
                  />
                ) : (
                  <div className="text-gray-400 flex flex-col items-center">
                    <Search size={48} className="mb-2 opacity-50" />
                    <p>Sem imagem</p>
                  </div>
                )}
                {getProductImages(viewProduct).length > 0 && (
                  <button
                    onClick={() => setIsZoomOpen(true)}
                    className="absolute bottom-4 right-4 p-2 bg-white/90 rounded-lg shadow text-gray-600 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Maximize2 size={20} />
                  </button>
                )}
              </div>
              {getProductImages(viewProduct).length > 1 && (
                <div className="p-4 flex gap-2 overflow-x-auto bg-white border-t border-gray-200">
                  {getProductImages(viewProduct).map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-16 h-16 rounded-lg border-2 overflow-hidden flex-shrink-0 ${currentImageIndex === idx ? 'border-indigo-600' : 'border-transparent hover:border-gray-300'}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img}
                        className="w-full h-full object-cover"
                        alt="thumbnail"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col overflow-y-auto">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {viewProduct.reference_code}
                </span>
                {viewProduct.brand && (
                  <span className="text-xs font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-1 rounded">
                    {viewProduct.brand}
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
                {viewProduct.name}
              </h2>
              <div className="mb-6">
                {viewProduct.original_price &&
                  viewProduct.original_price > viewProduct.price &&
                  isPricesVisible && (
                    <span className="text-sm text-gray-400 line-through block">
                      De:{' '}
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(viewProduct.original_price)}
                    </span>
                  )}
                <PriceDisplay
                  value={viewProduct.price}
                  isPricesVisible={isPricesVisible}
                  size="large"
                  className="font-bold text-red-600 block mb-1"
                />
                <span className="text-sm text-gray-500">Preço unitário</span>
              </div>
              <div className="prose prose-sm text-gray-600 mb-8 flex-1">
                <h4 className="text-gray-900 font-semibold mb-2">Detalhes</h4>
                <p>{viewProduct.description || 'Sem descrição.'}</p>
              </div>
              <div className="mt-auto">
                <button
                  onClick={() => {
                    addToCart(viewProduct);
                    setViewProduct(null);
                  }}
                  className="w-full py-4 rounded-xl bg-indigo-600 text-white font-bold text-lg hover:bg-indigo-700 transition-colors shadow-lg flex items-center justify-center gap-2"
                >
                  <Plus size={20} /> Adicionar ao Pedido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isZoomOpen && viewProduct && (
        <div className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center">
          <button
            onClick={() => setIsZoomOpen(false)}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2"
          >
            <X size={32} />
          </button>
          <div className="relative w-full h-full flex items-center justify-center p-4">
            {getProductImages(viewProduct).length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex((prev) =>
                    prev > 0
                      ? prev - 1
                      : getProductImages(viewProduct).length - 1
                  );
                }}
                className="absolute left-4 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full"
              >
                <ChevronLeft size={48} />
              </button>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getProductImages(viewProduct)[currentImageIndex]}
              alt="Zoom"
              className="max-w-full max-h-full object-contain select-none"
            />
            {getProductImages(viewProduct).length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex((prev) =>
                    prev < getProductImages(viewProduct).length - 1
                      ? prev + 1
                      : 0
                  );
                }}
                className="absolute right-4 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full"
              >
                <ChevronRight size={48} />
              </button>
            )}
          </div>
        </div>
      )}

      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsPasswordModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl animate-in zoom-in-95">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Lock size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Área Restrita</h3>
              <p className="text-sm text-gray-500">
                Digite a senha para ver os preços.
              </p>
            </div>
            <form onSubmit={handleUnlockPrices}>
              <input
                type="password"
                autoFocus
                placeholder="Senha"
                className="w-full p-3 text-center text-lg border rounded-xl mb-4 outline-none focus:ring-2 focus:ring-indigo-500"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700"
              >
                Desbloquear
              </button>
            </form>
          </div>
        </div>
      )}

      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsCheckoutOpen(false)}
          />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Identifique-se
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Informe seus dados para finalizar.
            </p>
            <form onSubmit={handleFinalizeOrder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seu Nome
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 text-gray-400 h-5 w-5" />
                  <input
                    required
                    type="text"
                    placeholder="Ex: Maria Silva"
                    value={customerInfo.name}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, name: e.target.value })
                    }
                    className="w-full pl-10 p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seu Telefone
                </label>
                <input
                  required
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={customerInfo.phone}
                  onChange={(e) =>
                    setCustomerInfo({ ...customerInfo, phone: e.target.value })
                  }
                  className="w-full p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl text-white font-bold text-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                style={{ backgroundColor: '#25D366' }}
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    Finalizar Pedido <Send size={18} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {isLoadModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsLoadModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Carregar Pedido
            </h3>
            <form onSubmit={handleLoadCart} className="space-y-4">
              <input
                autoFocus
                type="text"
                placeholder="Ex: K9P-2X4"
                value={loadCodeInput}
                onChange={(e) => setLoadCodeInput(e.target.value.toUpperCase())}
                className="w-full p-4 text-center text-xl font-mono uppercase tracking-widest rounded-xl border-2 border-gray-200 outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={isLoadingCart}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold flex justify-center gap-2"
              >
                {isLoadingCart ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    Carregar <Download size={18} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {isSaveModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsSaveModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Save size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Orçamento Salvo!
            </h3>
            <div className="flex items-center gap-2 bg-gray-100 p-3 rounded-xl mb-6 border border-gray-200">
              <code className="flex-1 text-2xl font-mono font-bold text-gray-800 tracking-wider text-center">
                {savedCode}
              </code>
              <button
                onClick={copyToClipboard}
                className="p-2 text-gray-500 hover:text-indigo-600"
              >
                <Copy size={20} />
              </button>
            </div>
            <button
              onClick={() => setIsSaveModalOpen(false)}
              className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
