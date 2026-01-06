'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  X,
  Star,
  MapPin,
  Clock,
  Lock,
  Trophy,
  Flame,
  Heart,
  Filter,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

// --- CONFIGURAÇÃO DA LOJA (DEMO) ---
const DEMO_STORE = {
  name: 'Loja Exemplo Premium',
  primaryColor: '#0d1b2c',
  secondaryColor: '#b9722e',
  headerColor: '#ffffff',
  show_installments: true,
  max_installments: 12,
  show_discount_tag: true,
  cash_discount: 5,
  banners: [
    'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=800&h=350',
  ],
};

// --- DADOS MOCK COM TAGS E MARCAS ---
const PRODUCTS = [
  {
    id: 1,
    name: 'Tênis Running Pro Performance',
    price: 299.9,
    brand: 'Nike',
    category: 'Calçados',
    image:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=400',
    tags: ['bestseller'], // Mais Vendido
  },
  {
    id: 2,
    name: 'Smartwatch Series 7 Midnight',
    price: 450.0,
    oldPrice: 699.0,
    brand: 'Apple',
    category: 'Eletrônicos',
    image:
      'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&q=80&w=400',
    tags: ['launch', 'favorite'], // Lançamento e Favorito
  },
  {
    id: 3,
    name: 'Camiseta Algodão Egípcio',
    price: 89.9,
    brand: 'Reserva',
    category: 'Moda',
    image:
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=400',
    tags: [],
  },
  {
    id: 4,
    name: 'Fone Noise Cancelling',
    price: 189.9,
    brand: 'JBL',
    category: 'Eletrônicos',
    image:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=400',
    tags: ['bestseller'],
  },
  {
    id: 5,
    name: 'Mochila Impermeável',
    price: 210.0,
    brand: 'Samsonite',
    category: 'Acessórios',
    image:
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=400',
    tags: ['launch'],
  },
  {
    id: 6,
    name: 'Garrafa Térmica Premium',
    price: 129.9,
    brand: 'Stanley',
    category: 'Utilidades',
    image:
      'https://images.unsplash.com/photo-1602143407151-11115cd4e69b?auto=format&fit=crop&q=80&w=400',
    tags: ['favorite'],
  },
];

const CATEGORIES = ['Todos', 'Eletrônicos', 'Moda', 'Calçados', 'Acessórios'];
const BRANDS = [
  'Todas',
  'Nike',
  'Apple',
  'Reserva',
  'JBL',
  'Samsonite',
  'Stanley',
];

export default function CatalogoDemoFull() {
  const [cart, setCart] = useState<{ id: number; qty: number }[]>([]);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [activeBrand, setActiveBrand] = useState('Todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [favorites, setFavorites] = useState<number[]>([]);

  // FEATURE TOGGLE: Simula a opção de "Esconder Preço" (comum em B2B)
  const [hidePrices, setHidePrices] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // --- Actions ---
  const toggleFavorite = (id: number) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id]
    );
    toast.success(
      favorites.includes(id) ? 'Removido dos favoritos' : 'Salvo nos favoritos'
    );
  };

  const addToCart = (id: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === id);
      if (existing)
        return prev.map((item) =>
          item.id === id ? { ...item, qty: item.qty + 1 } : item
        );
      return [...prev, { id, qty: 1 }];
    });
    toast.success('Adicionado ao carrinho');
  };

  const removeFromCart = (id: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === id);
      if (existing && existing.qty > 1)
        return prev.map((item) =>
          item.id === id ? { ...item, qty: item.qty - 1 } : item
        );
      return prev.filter((item) => item.id !== id);
    });
  };

  // --- Filtering ---
  const filteredProducts = PRODUCTS.filter((p) => {
    const matchesCategory =
      activeCategory === 'Todos' || p.category === activeCategory;
    const matchesBrand = activeBrand === 'Todas' || p.brand === activeBrand;
    const matchesSearch = p.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesCategory && matchesBrand && matchesSearch;
  });

  const cartTotal = cart.reduce((acc, item) => {
    const p = PRODUCTS.find((x) => x.id === item.id);
    return acc + (p ? p.price * item.qty : 0);
  }, 0);

  const cartCount = cart.reduce((acc, item) => acc + item.qty, 0);

  return (
    <div
      className="min-h-screen bg-gray-50 pb-32 font-sans"
      style={{
        // @ts-ignore
        '--primary': DEMO_STORE.primaryColor,
        '--secondary': DEMO_STORE.secondaryColor,
        '--header': DEMO_STORE.headerColor,
      }}
    >
      {/* --- CONTROLES DA DEMO (Para o usuário testar recursos) --- */}
      <div className="bg-gray-800 text-white p-3 text-xs flex flex-wrap items-center justify-center gap-4 sticky top-0 z-50">
        <span className="font-bold text-orange-400">
          PAINEL DE DEMONSTRAÇÃO:
        </span>
        <label className="flex items-center gap-2 cursor-pointer bg-gray-700 px-3 py-1 rounded-full hover:bg-gray-600 transition-colors">
          <input
            type="checkbox"
            checked={hidePrices}
            onChange={(e) => setHidePrices(e.target.checked)}
            className="rounded text-orange-500 focus:ring-orange-500"
          />
          {hidePrices
            ? 'Modo: Preço Oculto (B2B)'
            : 'Modo: Preço Visível (Varejo)'}
        </label>
        <Link href="/register" className="underline hover:text-orange-300">
          Crie sua loja igual a esta
        </Link>
      </div>

      {/* --- HEADER --- */}
      <header
        className={`sticky top-[44px] z-40 transition-all duration-300 border-b border-gray-100 bg-white ${
          isScrolled ? 'shadow-md py-2' : 'py-4'
        }`}
      >
        <div className="max-w-md mx-auto px-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-sm bg-[var(--secondary)]">
                LE
              </div>
              <div>
                <h1 className="font-bold text-gray-900 leading-none text-base">
                  {DEMO_STORE.name}
                </h1>
                <div className="flex items-center gap-1 mt-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-[10px] text-gray-500 font-medium">
                    Online
                  </span>
                </div>
              </div>
            </div>

            <div className="relative">
              <ShoppingCart className="text-gray-700" size={24} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full animate-bounce">
                  {cartCount}
                </span>
              )}
            </div>
          </div>

          <div className="relative group">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar produtos..."
              className="w-full bg-gray-100 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[var(--secondary)] outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* --- FILTROS (Categorias e Marcas) --- */}
      <div className="bg-white border-b border-gray-100 pt-2 pb-1 sticky top-[calc(44px+88px)] z-30 shadow-sm">
        {/* Categorias */}
        <div className="max-w-md mx-auto overflow-x-auto scrollbar-hide pl-4 mb-2">
          <div className="flex gap-2 pr-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? 'bg-[var(--primary)] text-white shadow-md'
                    : 'bg-gray-50 text-gray-600 border border-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Marcas (Novo) */}
        <div className="max-w-md mx-auto overflow-x-auto scrollbar-hide pl-4 pb-2">
          <div className="flex gap-3 pr-4 items-center">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">
              Marcas:
            </span>
            {BRANDS.map((brand) => (
              <button
                key={brand}
                onClick={() => setActiveBrand(brand)}
                className={`text-xs font-medium whitespace-nowrap transition-colors ${
                  activeBrand === brand
                    ? 'text-[var(--secondary)] underline decoration-2 underline-offset-4'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {brand}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* --- BANNER --- */}
      {activeCategory === 'Todos' && !searchTerm && (
        <div className="max-w-md mx-auto mt-4 px-4">
          <div className="rounded-xl overflow-hidden shadow-sm aspect-[21/9] relative group">
            <Image
              src={DEMO_STORE.banners[0]}
              alt="Banner"
              fill
              sizes="100vw"
              className="object-cover group-hover:scale-105 transition-transform duration-700"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-5">
              <div>
                <div className="flex gap-2 mb-2">
                  <span className="bg-[var(--secondary)] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                    NOVIDADE
                  </span>
                </div>
                <h3 className="text-white font-bold text-lg leading-tight shadow-black drop-shadow-md">
                  Coleção de Verão 2025
                </h3>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- LISTA DE PRODUTOS --- */}
      <div className="max-w-md mx-auto px-4 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
            {searchTerm ? 'Resultados' : activeCategory}
            <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {filteredProducts.length}
            </span>
          </h2>
          <Filter size={16} className="text-gray-400" />
        </div>

        <div className="grid grid-cols-2 gap-3 pb-4">
          {filteredProducts.map((product) => {
            const inCart = cart.find((i) => i.id === product.id);
            const installmentValue =
              product.price / DEMO_STORE.max_installments;
            const isFav = favorites.includes(product.id);

            return (
              <div
                key={product.id}
                className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden flex flex-col h-full group hover:shadow-lg transition-all duration-300"
              >
                {/* Imagem & Badges */}
                <div className="relative aspect-square bg-gray-100 overflow-hidden">
                  <div className="w-full h-full relative">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  {/* Botão Favorito */}
                  <button
                    onClick={() => toggleFavorite(product.id)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white transition-all z-10"
                  >
                    <Heart
                      size={14}
                      className={
                        isFav ? 'fill-red-500 text-red-500' : 'text-gray-400'
                      }
                    />
                  </button>

                  {/* Badges de Status (Lançamento, Mais Vendido, etc) */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                    {product.oldPrice && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                        -
                        {Math.round(
                          ((product.oldPrice - product.price) /
                            product.oldPrice) *
                            100
                        )}
                        %
                      </span>
                    )}
                    {product.tags.includes('bestseller') && (
                      <span className="bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                        <Trophy size={10} /> Top
                      </span>
                    )}
                    {product.tags.includes('launch') && (
                      <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                        <Flame size={10} /> Novo
                      </span>
                    )}
                    {product.tags.includes('favorite') && (
                      <span className="bg-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                        <Star size={10} /> Destaque
                      </span>
                    )}
                  </div>
                </div>

                {/* Dados do Produto */}
                <div className="p-3 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                      {product.category}
                    </p>
                    <p className="text-[10px] text-[var(--secondary)] font-bold">
                      {product.brand}
                    </p>
                  </div>

                  <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight mb-2 flex-1">
                    {product.name}
                  </h3>

                  <div className="mt-auto space-y-1">
                    {/* Lógica de Exibição de Preço */}
                    {hidePrices ? (
                      <div className="bg-gray-50 border border-gray-200 rounded p-2 text-center my-2">
                        <p className="text-xs text-gray-500 font-medium flex items-center justify-center gap-1">
                          <Lock size={12} /> Preço Oculto
                        </p>
                        <button
                          onClick={() =>
                            toast.info(
                              'No sistema real, isso solicitaria o login do cliente.'
                            )
                          }
                          className="text-[10px] font-bold text-[var(--primary)] underline mt-1"
                        >
                          Entrar para ver
                        </button>
                      </div>
                    ) : (
                      <>
                        {product.oldPrice && (
                          <p className="text-xs text-gray-400 line-through">
                            R$ {product.oldPrice.toFixed(2).replace('.', ',')}
                          </p>
                        )}
                        <div className="flex items-center gap-1">
                          <span className="text-base font-bold text-gray-900">
                            R$ {product.price.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                        {DEMO_STORE.show_installments && (
                          <p className="text-[10px] text-gray-500">
                            {DEMO_STORE.max_installments}x de{' '}
                            <span className="font-bold">
                              R$ {installmentValue.toFixed(2).replace('.', ',')}
                            </span>
                          </p>
                        )}
                        {DEMO_STORE.show_discount_tag && (
                          <p className="text-[10px] text-green-600 font-medium">
                            {DEMO_STORE.cash_discount}% off no Pix
                          </p>
                        )}
                      </>
                    )}

                    {/* Botão de Adicionar (Com lógica de preço oculto) */}
                    <div className="pt-2">
                      {hidePrices ? (
                        <button
                          onClick={() => toast.info('Faça login para comprar.')}
                          className="w-full bg-gray-200 text-gray-500 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1 cursor-not-allowed"
                        >
                          <Lock size={14} /> Indisponível
                        </button>
                      ) : inCart ? (
                        <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-1">
                          <button
                            onClick={() => removeFromCart(product.id)}
                            className="w-7 h-7 flex items-center justify-center bg-white rounded shadow-sm text-red-500 hover:bg-red-50 active:scale-95 transition-transform"
                          >
                            {inCart.qty === 1 ? (
                              <X size={14} />
                            ) : (
                              <Minus size={14} />
                            )}
                          </button>
                          <span className="font-bold text-sm text-gray-900 w-6 text-center">
                            {inCart.qty}
                          </span>
                          <button
                            onClick={() => addToCart(product.id)}
                            className="w-7 h-7 flex items-center justify-center bg-[var(--primary)] text-white rounded shadow-sm hover:opacity-90 active:scale-95 transition-transform"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(product.id)}
                          className="w-full bg-white border border-[var(--primary)] text-[var(--primary)] py-2 rounded-lg text-sm font-bold hover:bg-[var(--primary)] hover:text-white transition-colors active:scale-95 flex items-center justify-center gap-1 group-hover:bg-[var(--primary)] group-hover:text-white"
                        >
                          Adicionar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Search className="text-gray-300 mb-2" size={32} />
            <h3 className="font-bold text-gray-900">Ops! Nada encontrado.</h3>
            <p className="text-gray-500 text-xs mt-1">
              Tente mudar os filtros ou a busca.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setActiveCategory('Todos');
                setActiveBrand('Todas');
              }}
              className="mt-4 text-[var(--secondary)] font-bold text-sm underline"
            >
              Limpar tudo
            </button>
          </div>
        )}
      </div>

      {/* --- FOOTER INFORMATIVO --- */}
      <footer className="bg-white border-t border-gray-100 py-8 mt-4 text-center">
        <div className="max-w-md mx-auto px-4 space-y-4">
          <div className="flex justify-center gap-6 text-gray-400">
            <div className="flex flex-col items-center gap-1">
              <MapPin size={20} />
              <span className="text-[10px]">Brasil</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Star size={20} />
              <span className="text-[10px]">Garantia</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Clock size={20} />
              <span className="text-[10px]">Rápido</span>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            © 2025 {DEMO_STORE.name}.
            <br />
            Plataforma Rep-Vendas.
          </p>
        </div>
      </footer>

      {/* --- CARRINHO FLUTUANTE (WhatsApp Style) --- */}
      {cartCount > 0 && !hidePrices && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-4 pt-2 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent z-50 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <button
              onClick={() =>
                toast.success(
                  'No sistema real, isso enviaria o pedido para o WhatsApp!'
                )
              }
              className="w-full bg-[#25D366] hover:bg-[#1ebc57] text-white rounded-xl shadow-lg shadow-green-900/20 p-4 flex items-center justify-between transition-transform active:scale-[0.98] group"
            >
              <div className="flex flex-col items-start">
                <span className="text-xs font-medium opacity-90">
                  {cartCount} itens
                </span>
                <span className="text-lg font-bold">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(cartTotal)}
                </span>
              </div>
              <div className="flex items-center gap-2 font-bold text-sm bg-black/10 px-4 py-2 rounded-lg backdrop-blur-sm group-hover:bg-black/20 transition-colors">
                Enviar Pedido <ChevronRight size={16} />
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
