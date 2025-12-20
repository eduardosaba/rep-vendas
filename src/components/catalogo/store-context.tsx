'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useToast } from '@/hooks/useToast';
import type {
  Product as LibProduct,
  Toast,
  Settings as StoreSettings,
} from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { generateOrderPDF } from '@/lib/generateOrderPDF';

export type Product = LibProduct;

export interface CartItem extends LibProduct {
  quantity: number;
}

export interface BrandWithLogo {
  name: string;
  logo_url: string | null;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
  cnpj: string;
}

interface StoreProviderProps {
  children: ReactNode;
  store: StoreSettings;
  initialProducts: Product[];
  startProductId?: string;
}

interface StoreContextType {
  store: StoreSettings;
  initialProducts: Product[];
  cart: CartItem[];
  favorites: string[];

  // Mantendo compatibilidade com ambos os nomes
  isPricesVisible: boolean;
  setIsPricesVisible: (visible: boolean) => void;
  showPrices: boolean;
  toggleShowPrices: () => void;

  displayProducts: Product[];
  totalProducts: number;
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  brands: string[];
  brandsWithLogos: BrandWithLogo[];
  categories: string[];
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  selectedBrand: string | string[];
  setSelectedBrand: (s: string | string[]) => void;
  selectedCategory: string;
  setSelectedCategory: (s: string) => void;
  sortOrder: string;
  setSortOrder: (s: any) => void;

  // NOVOS FILTROS
  showOnlyNew: boolean;
  setShowOnlyNew: (b: boolean) => void;
  showOnlyBestsellers: boolean;
  setShowOnlyBestsellers: (b: boolean) => void;

  showFavorites: boolean;
  setShowFavorites: (b: boolean) => void;
  isFilterOpen: boolean;
  setIsFilterOpen: (b: boolean) => void;
  currentBanner: number;

  modals: {
    cart: boolean;
    checkout: boolean;
    password: boolean;
    load: boolean;
    save: boolean;
    zoom: boolean;
    product: Product | null;
  };
  setModal: (name: string, value: any) => void;

  addToCart: (p: Product, qty?: number) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  toggleFavorite: (id: string) => void;
  unlockPrices: (password: string) => boolean;

  handleFinalizeOrder: (customer: CustomerInfo) => Promise<boolean>;
  handleSaveCart: () => Promise<string | null>;
  handleLoadCart: (code: string) => Promise<boolean>;

  loadingStates: { submitting: boolean; saving: boolean; loadingCart: boolean };
  orderSuccessData: any;
  setOrderSuccessData: (data: any) => void;
  handleDownloadPDF: () => void;
  handleSendWhatsApp: () => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({
  children,
  store,
  initialProducts,
  startProductId,
}: StoreProviderProps) {
  const { addToast } = useToast();
  const ITEMS_PER_PAGE = 24;
  const supabase = createClient();

  // ESTADO CORRIGIDO: Declarando showPrices diretamente aqui no topo
  const [showPrices, setShowPrices] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string | string[]>('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortOrder, setSortOrder] = useState<
    'name' | 'price_asc' | 'price_desc'
  >('name');

  const [showOnlyNew, setShowOnlyNew] = useState(false);
  const [showOnlyBestsellers, setShowOnlyBestsellers] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [brandsWithLogos, setBrandsWithLogos] = useState<BrandWithLogo[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentBanner, setCurrentBanner] = useState(0);

  const initialProduct = startProductId
    ? initialProducts.find((p) => p.id === startProductId) || null
    : null;

  const [modals, setModals] = useState({
    cart: false,
    checkout: false,
    password: false,
    load: false,
    save: false,
    zoom: false,
    product: initialProduct,
  });

  const [loadingStates, setLoadingStates] = useState({
    submitting: false,
    saving: false,
    loadingCart: false,
  });

  const [orderSuccessData, setOrderSuccessData] = useState<any>(null);

  // --- DERIVAR DADOS ---
  const brands = Array.from(
    new Set(
      initialProducts
        .map((p) => (p.brand || '').toString().trim())
        .filter(Boolean)
    )
  ) as string[];

  const categories = Array.from(
    new Set(
      initialProducts
        .map((p) => (p.category || '').toString().trim())
        .filter(Boolean)
    )
  ) as string[];

  // --- EFEITOS ---
  useEffect(() => {
    const fetchBrands = async () => {
      const productBrands = brands;
      if (productBrands.length === 0) {
        setBrandsWithLogos([]);
        return;
      }
      const { data } = await supabase
        .from('brands')
        .select('name, logo_url')
        .eq('user_id', store.user_id)
        .in('name', productBrands);

      if (data) {
        const byName: Record<string, any> = {};
        data.forEach((d: any) => (byName[(d.name || '').toString()] = d));
        const ordered = productBrands.map(
          (b) => byName[b] || { name: b, logo_url: null }
        );
        setBrandsWithLogos(ordered);
      } else {
        setBrandsWithLogos(
          productBrands.map((b) => ({ name: b, logo_url: null }))
        );
      }
    };
    fetchBrands();
  }, [store.user_id, initialProducts, brands]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    selectedBrand,
    selectedCategory,
    sortOrder,
    showFavorites,
    showOnlyNew,
    showOnlyBestsellers,
  ]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem(`cart-${store.name}`);
      const savedFavs = localStorage.getItem(`favs-${store.name}`);
      const priceUnlocked = sessionStorage.getItem(`prices-${store.name}`);
      if (savedCart) {
        try {
          const parsed = JSON.parse(savedCart);
          if (Array.isArray(parsed)) setCart(parsed);
        } catch {}
      }
      if (savedFavs) {
        try {
          setFavorites(JSON.parse(savedFavs));
        } catch {}
      }
      if (priceUnlocked === 'true') setShowPrices(true);
    }
  }, [store.name]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const keyCart = `cart-${store.name}`;
    const keyFavs = `favs-${store.name}`;

    // Debounce writes to avoid frequent synchronous localStorage I/O
    let timer: number | null = null;
    timer = window.setTimeout(() => {
      try {
        localStorage.setItem(keyCart, JSON.stringify(cart));
      } catch (err) {
        // ignore storage errors
      }
      try {
        localStorage.setItem(keyFavs, JSON.stringify(favorites));
      } catch (err) {
        // ignore storage errors
      }
    }, 400);

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [cart, favorites, store.name]);

  useEffect(() => {
    if (store.banners && store.banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentBanner((b) => (b + 1) % (store.banners?.length || 1));
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [store.banners]);

  // Abrir modal automaticamente se houver parâmetro ?product=ID na URL
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('product');

    if (productId && !modals.product) {
      const product = initialProducts.find((p) => p.id === productId);
      if (product) {
        setModal('product', product);
        // Limpar o parâmetro da URL sem recarregar a página
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [initialProducts]);

  // --- ACTIONS ---
  const addToCart = (p: Product, qty = 1) => {
    setCart((c) => {
      const exists = c.find((it) => it.id === p.id);
      if (exists) {
        return c.map((it) =>
          it.id === p.id ? { ...it, quantity: it.quantity + qty } : it
        );
      }
      return [...c, { ...p, quantity: qty } as CartItem];
    });
    if (typeof addToast === 'function') {
      addToast({
        type: 'success',
        message: 'Produto adicionado ao carrinho.',
      } as Toast);
    }
  };

  const removeFromCart = (id: string) =>
    setCart((c) => c.filter((it) => it.id !== id));

  const updateQuantity = (id: string, delta: number) =>
    setCart((c) =>
      c.map((it) =>
        it.id === id
          ? { ...it, quantity: Math.max(1, it.quantity + delta) }
          : it
      )
    );

  const toggleFavorite = (id: string) =>
    setFavorites((f) =>
      f.includes(id) ? f.filter((x) => x !== id) : [...f, id]
    );

  const unlockPrices = (password: string) => {
    const ok = password === (store.price_password || '');
    if (ok) {
      setShowPrices(true);
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(`prices-${store.name}`, 'true');
        } catch {}
      }
    }
    return ok;
  };

  const toggleShowPrices = () => setShowPrices((v) => !v);

  const handleFinalizeOrder = async (customer: CustomerInfo) => {
    try {
      setLoadingStates((s) => ({ ...s, submitting: true }));

      // Normalizar telefone (apenas dígitos)
      const normalizedPhone = (customer?.phone || '').replace(/\D/g, '');

      // Procurar client existente pelo telefone
      let clientId: string | null = null;
      if (normalizedPhone) {
        const { data: existingClient, error: findClientError } = await supabase
          .from('clients')
          .select('id')
          .eq('phone', normalizedPhone)
          .maybeSingle();

        if (findClientError) throw findClientError;
        if (existingClient && existingClient.id) {
          clientId = existingClient.id;
        } else {
          // Criar novo client vinculado ao user_id do store
          const { data: newClient, error: createClientError } = await supabase
            .from('clients')
            .insert({
              name: customer?.name || '',
              phone: normalizedPhone,
              email: customer?.email || null,
              user_id: store.user_id,
            })
            .select()
            .maybeSingle();

          if (createClientError) throw createClientError;
          if (newClient && newClient.id) clientId = newClient.id;
        }
      }

      // Calcular valor total compatível com o esquema (total_value)
      const totalValue = cart.reduce(
        (acc, item) => acc + item.price * item.quantity,
        0
      );

      // Inserir pedido (usar nomes de colunas do esquema), incluindo client_id quando disponível
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: store.user_id,
          client_id: clientId,
          client_name_guest: customer?.name || '',
          client_phone_guest: normalizedPhone || customer?.phone || '',
          total_value: totalValue,
          status: 'Pendente',
        })
        .select()
        .maybeSingle();

      if (orderError || !orderData)
        throw orderError || new Error('Falha ao criar pedido');

      // Inserir items em order_items
      if (cart.length > 0) {
        const itemsPayload = cart.map((it) => ({
          order_id: orderData.id,
          product_id: it.id,
          quantity: it.quantity,
          unit_price: it.price,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(itemsPayload);
        if (itemsError) throw itemsError;
      }

      // Preparar items para o PDF com referências e preços corretos
      const pdfItems = cart.map((it) => ({
        reference_code: it.reference_code || it.sku || '-',
        name: it.name,
        quantity: it.quantity,
        price: it.price,
        sale_price: it.price,
      }));

      setOrderSuccessData({
        id: orderData.id,
        display_id: orderData.display_id,
        customer,
        items: pdfItems,
        total: totalValue,
      });
      setCart([]);
      return true;
    } catch (e: unknown) {
      console.error('Erro finalizar pedido:', e);
      let message = 'Erro ao processar pedido.';
      if (typeof addToast === 'function')
        addToast({ type: 'error', message } as Toast);
      return false;
    } finally {
      setLoadingStates((s) => ({ ...s, submitting: false }));
    }
  };

  const handleSaveCart = async () => {
    if (cart.length === 0) return null;
    try {
      setLoadingStates((s) => ({ ...s, saving: true }));
      const shortId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { error } = await supabase.from('saved_carts').insert({
        short_id: shortId,
        items: cart,
      });
      if (error) throw error;
      return shortId;
    } catch (e) {
      console.error(e);
      return null;
    } finally {
      setLoadingStates((s) => ({ ...s, saving: false }));
    }
  };

  const handleLoadCart = async (code: string) => {
    if (!code) return false;
    try {
      setLoadingStates((s) => ({ ...s, loadingCart: true }));
      const { data, error } = await supabase
        .from('saved_carts')
        .select('items')
        .eq('short_id', code.toUpperCase().trim())
        .maybeSingle();

      if (error || !data) {
        if (typeof addToast === 'function')
          addToast({
            type: 'error',
            message: 'Carrinho não encontrado.',
          } as Toast);
        return false;
      }
      if (data.items && Array.isArray(data.items)) {
        setCart(data.items as CartItem[]);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    } finally {
      setLoadingStates((s) => ({ ...s, loadingCart: false }));
    }
  };

  const handleDownloadPDF = () => {
    const itemsToPrint = cart.length > 0 ? cart : [];
    const orderObj = {
      id: orderSuccessData?.id || 0,
      customer: orderSuccessData?.customer || { name: '', phone: '' },
    };
    generateOrderPDF(
      orderObj as any,
      store,
      itemsToPrint,
      itemsToPrint.reduce((acc, i) => acc + i.price * i.quantity, 0)
    );
  };

  const handleSendWhatsApp = () => {
    if (!orderSuccessData) return;
    const { customer } = orderSuccessData;
    const message = `Olá, meu nome é ${customer.name}. Fiz o pedido #${orderSuccessData.id}.`;
    const num = (store.phone || '').replace(/\D/g, '');
    window.open(
      `https://wa.me/${num}?text=${encodeURIComponent(message)}`,
      '_blank'
    );
  };

  const setModal = (name: string, value: any) =>
    setModals((m) => ({ ...m, [name]: value }));

  const displayProducts = initialProducts
    .filter((p) => {
      if (showFavorites && !favorites.includes(p.id)) return false;
      if (showOnlyNew && !p.is_launch) return false;
      if (showOnlyBestsellers && !p.is_best_seller) return false;

      if (selectedBrand && selectedBrand !== 'all') {
        if (Array.isArray(selectedBrand)) {
          if (
            selectedBrand.length > 0 &&
            !selectedBrand.includes(p.brand || '')
          )
            return false;
        } else {
          if (p.brand !== selectedBrand) return false;
        }
      }
      if (
        selectedCategory &&
        selectedCategory !== 'all' &&
        p.category !== selectedCategory
      )
        return false;
      if (
        searchTerm &&
        !p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !(p.reference_code || '')
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      if (sortOrder === 'price_asc') return a.price - b.price;
      if (sortOrder === 'price_desc') return b.price - a.price;
      return a.name.localeCompare(b.name);
    });

  const totalProducts = displayProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalProducts / ITEMS_PER_PAGE));

  return (
    <StoreContext.Provider
      value={{
        store,
        initialProducts,
        cart,
        favorites,
        // Resolvemos o problema mapeando ambos para o mesmo state
        showPrices,
        isPricesVisible: showPrices,
        setIsPricesVisible: setShowPrices,
        toggleShowPrices,
        displayProducts,
        totalProducts,
        currentPage,
        totalPages,
        setCurrentPage,
        viewMode,
        setViewMode,
        brands,
        brandsWithLogos,
        categories,
        searchTerm,
        setSearchTerm,
        selectedBrand,
        setSelectedBrand,
        selectedCategory,
        setSelectedCategory,
        sortOrder,
        setSortOrder,
        showOnlyNew,
        setShowOnlyNew,
        showOnlyBestsellers,
        setShowOnlyBestsellers,
        showFavorites,
        setShowFavorites,
        isFilterOpen,
        setIsFilterOpen,
        currentBanner,
        modals,
        setModal,
        addToCart,
        removeFromCart,
        updateQuantity,
        toggleFavorite,
        unlockPrices,
        handleFinalizeOrder,
        handleSaveCart,
        handleLoadCart,
        loadingStates,
        orderSuccessData,
        setOrderSuccessData,
        handleDownloadPDF,
        handleSendWhatsApp,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
};
