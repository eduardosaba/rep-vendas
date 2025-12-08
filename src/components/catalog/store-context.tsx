'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from 'react';
import { useToast } from '@/hooks/useToast';
import type { Product as LibProduct, Toast } from '@/lib/types';
import { createOrder } from '@/app/catalog/actions';
import {
  saveCartAction,
  loadCartAction,
} from '@/app/catalog/saved-carts/actions';
import { generateOrderPDF } from '@/utils/generateOrderPDF';
import { supabase as sharedSupabase } from '@/lib/supabaseClient'; // Necessário para buscar as marcas

// ... (Interfaces Product, StoreSettings, CartItem mantidas iguais) ...
export type Product = LibProduct;
export interface StoreSettings {
  user_id: string;
  name: string;
  primary_color: string;
  logo_url: string | null;
  phone: string;
  email?: string;
  price_password?: string;
  footer_message?: string;
  banners?: string[];
  header_background_color?: string;
  secondary_color?: string;
  show_top_benefit_bar?: boolean;
  top_benefit_text?: string;
  show_installments?: boolean;
  max_installments?: number;
  show_discount_tag?: boolean;
  cash_price_discount_percent?: number;
  enable_stock_management?: boolean;
  global_allow_backorder?: boolean;
}
export interface CartItem extends LibProduct {
  quantity: number;
}

// Nova interface para marca com logo
export interface BrandWithLogo {
  name: string;
  logo_url: string | null;
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
  isPricesVisible: boolean;
  setIsPricesVisible: (visible: boolean) => void;
  displayProducts: Product[];
  totalProducts: number;
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  brands: string[];
  brandsWithLogos: BrandWithLogo[]; // NOVO
  categories: string[];
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  selectedBrand: string | string[];
  setSelectedBrand: (s: string | string[]) => void;
  selectedCategory: string;
  setSelectedCategory: (s: string) => void;
  sortOrder: string;
  setSortOrder: (s: any) => void;
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
  handleFinalizeOrder: (customer: any) => Promise<boolean>;
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
  const ITEMS_PER_PAGE = 12;

  // Cliente Supabase para buscar as marcas
  const supabase = sharedSupabase;

  // Estados Principais
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isPricesVisible, setIsPricesVisible] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string | string[]>('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortOrder, setSortOrder] = useState<
    'name' | 'price_asc' | 'price_desc'
  >('name');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFavorites, setShowFavorites] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Dados Auxiliares
  const [brandsWithLogos, setBrandsWithLogos] = useState<BrandWithLogo[]>([]);

  // UI
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

  // Efeito para buscar Logos das Marcas
  useEffect(() => {
    const fetchBrands = async () => {
      // Somente buscar logos para as marcas que realmente aparecem nos produtos
      const productBrands = Array.from(
        new Set(
          initialProducts.map((p) => (p.brand || '').toString()).filter(Boolean)
        )
      );

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
        // Preserve a stable ordering based on productBrands
        const byName: Record<string, any> = {};
        data.forEach((d: any) => (byName[(d.name || '').toString()] = d));
        const ordered = productBrands.map(
          (b) => byName[b] || { name: b, logo_url: null }
        );
        setBrandsWithLogos(ordered);
      } else {
        // Fallback: map names from products
        setBrandsWithLogos(
          productBrands.map((b) => ({ name: b, logo_url: null }))
        );
      }
    };
    fetchBrands();
  }, [store.user_id, supabase, initialProducts]);

  // ... (Resto dos useEffects de persistência e carrossel mantidos iguais) ...
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedBrand, selectedCategory, sortOrder, showFavorites]);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem(`cart-${store.name}`);
      const savedFavs = localStorage.getItem(`favs-${store.name}`);
      const priceUnlocked = sessionStorage.getItem(`prices-${store.name}`);
      if (savedCart)
        try {
          setCart(JSON.parse(savedCart));
        } catch {}
      if (savedFavs)
        try {
          setFavorites(JSON.parse(savedFavs));
        } catch {}
      if (priceUnlocked === 'true') setIsPricesVisible(true);
    }
  }, [store.name]);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`cart-${store.name}`, JSON.stringify(cart));
      localStorage.setItem(`favs-${store.name}`, JSON.stringify(favorites));
    }
  }, [cart, favorites, store.name]);
  useEffect(() => {
    if (store.banners && store.banners.length > 1) {
      const interval = setInterval(
        () =>
          setCurrentBanner((prev) => (prev + 1) % (store.banners?.length || 1)),
        5000
      );
      return () => clearInterval(interval);
    }
  }, [store.banners]);

  // Lógica de Filtros
  const brands = useMemo(
    () =>
      Array.from(
        new Set(initialProducts.map((p) => p.brand).filter(Boolean) as string[])
      ).sort(),
    [initialProducts]
  );
  const categories = useMemo(() => {
    // Retorna apenas categorias que tenham pelo menos um produto (ativo ou inativo?)
    // Requisito: mostrar apenas categorias com produtos ativos — portanto filtramos por is_active !== false
    const activeCats = Array.from(
      new Set(
        initialProducts
          .filter((p) => (p as any).is_active !== false)
          .map((p) => p.category)
          .filter(Boolean) as string[]
      )
    ).sort();
    return activeCats;
  }, [initialProducts]);

  // ... (Lógica de filteredAllProducts, displayProducts, totalPages e actions mantidas iguais) ...
  const filteredAllProducts = useMemo(() => {
    let result = initialProducts.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.reference_code ?? '')
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      let matchesBrand = true;
      if (selectedBrand !== 'all') {
        const pBrand = (p.brand || '').toString().trim().toLowerCase();
        if (Array.isArray(selectedBrand)) {
          const sel = selectedBrand.map((s) =>
            (s || '').toString().trim().toLowerCase()
          );
          matchesBrand = sel.includes(pBrand);
        } else {
          matchesBrand =
            pBrand === (selectedBrand || '').toString().trim().toLowerCase();
        }
      }
      const matchesCategory =
        selectedCategory === 'all' || p.category === selectedCategory;
      const matchesFavorites = showFavorites ? favorites.includes(p.id) : true;
      return (
        matchesSearch && matchesBrand && matchesCategory && matchesFavorites
      );
    });
    result.sort((a, b) => {
      if (sortOrder === 'price_asc') return a.price - b.price;
      if (sortOrder === 'price_desc') return b.price - a.price;
      return a.name.localeCompare(b.name);
    });
    return result;
  }, [
    initialProducts,
    searchTerm,
    selectedBrand,
    selectedCategory,
    sortOrder,
    showFavorites,
    favorites,
  ]);

  const displayProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAllProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAllProducts, currentPage]);

  const totalPages = Math.ceil(filteredAllProducts.length / ITEMS_PER_PAGE);

  // Efeito: buscar logos das marcas apenas para marcas que aparecem nos produtos filtrados
  useEffect(() => {
    // Use initialProducts so the carousel always shows the full brand set
    const fetchBrandsFromInitialProducts = async () => {
      const productBrands = Array.from(
        new Set(
          initialProducts.map((p) => (p.brand || '').toString()).filter(Boolean)
        )
      );

      if (productBrands.length === 0) {
        setBrandsWithLogos([]);
        return;
      }

      try {
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
      } catch (e) {
        setBrandsWithLogos(
          productBrands.map((b) => ({ name: b, logo_url: null }))
        );
      }
    };

    fetchBrandsFromInitialProducts();
  }, [store.user_id, supabase, filteredAllProducts]);
  // Note: dependency changed to initialProducts below

  const setModal = (name: string, value: any) =>
    setModals((prev) => ({ ...prev, [name]: value }));
  const addToCart = (product: Product, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing)
        return prev.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      return [...prev, { ...product, quantity }];
    });
    setModal('cart', true);
  };
  const removeFromCart = (id: string) =>
    setCart((prev) => prev.filter((i) => i.id !== id));
  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
      )
    );
  };
  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((fav) => fav !== id) : [...prev, id]
    );
  };
  const unlockPrices = (password: string) => {
    const correct = store.price_password || '123456';
    if (password === correct) {
      setIsPricesVisible(true);
      sessionStorage.setItem(`prices-${store.name}`, 'true');
      return true;
    }
    return false;
  };

  const handleFinalizeOrder = async (customer: any) => {
    setLoadingStates((prev) => ({ ...prev, submitting: true }));
    try {
      const result = await createOrder(store.user_id, customer, cart);
      if (result.success) {
        const cartTotal = cart.reduce(
          (acc, item) => acc + item.price * item.quantity,
          0
        );
        setOrderSuccessData({
          id: result.orderId,
          customer: {
            ...customer,
            email: (result as any).clientEmail || customer.email,
            cnpj: (result as any).clientDocument || customer.cnpj,
          },
          items: [...cart],
          total: cartTotal,
        });
        setCart([]);
        localStorage.removeItem(`cart-${store.name}`);
        setModal('checkout', false);
        setModal('cart', false);
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    } finally {
      setLoadingStates((prev) => ({ ...prev, submitting: false }));
    }
  };

  const handleSaveCart = async () => {
    setLoadingStates((prev) => ({ ...prev, saving: true }));
    try {
      const result = (await saveCartAction(cart)) as {
        success: boolean;
        shortId?: string;
        error?: string;
      };
      return result.success ? (result.shortId ?? null) : null;
    } catch {
      return null;
    } finally {
      setLoadingStates((prev) => ({ ...prev, saving: false }));
    }
  };

  const handleLoadCart = async (code: string) => {
    setLoadingStates((prev) => ({ ...prev, loadingCart: true }));
    try {
      const result = await loadCartAction(code);
      if (result.success && result.cartItems) {
        setCart(result.cartItems);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setLoadingStates((prev) => ({ ...prev, loadingCart: false }));
    }
  };

  const handleDownloadPDF = () => {
    if (!orderSuccessData) return;
    generateOrderPDF(
      {
        id: orderSuccessData.id,
        customerName: orderSuccessData.customer.name,
        customerPhone: orderSuccessData.customer.phone,
        customerEmail: orderSuccessData.customer.email,
        customerDocument: orderSuccessData.customer.cnpj,
        items: orderSuccessData.items,
        total: orderSuccessData.total,
        date: new Date().toLocaleDateString('pt-BR'),
      },
      {
        name: store.name,
        phone: store.phone,
        email: store.email,
        logo_url: store.logo_url,
        primary_color: store.primary_color,
      }
    );
  };

  const handleSendWhatsApp = () => {
    if (!orderSuccessData) return;
    let message = `Olá! Sou *${orderSuccessData.customer.name}*.\nAcabei de fazer o *Pedido #${orderSuccessData.id}*:\n\n`;
    orderSuccessData.items.forEach(
      (item: any) => (message += `▪ ${item.quantity}x ${item.name}\n`)
    );
    if (isPricesVisible)
      message += `\n*Total: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orderSuccessData.total)}*`;
    window.open(
      `https://wa.me/55${store.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`,
      '_blank'
    );
  };

  return (
    <StoreContext.Provider
      value={{
        store,
        initialProducts,
        cart,
        favorites,
        isPricesVisible,
        setIsPricesVisible,
        displayProducts,
        totalProducts: filteredAllProducts.length,
        currentPage,
        totalPages,
        setCurrentPage,
        viewMode,
        setViewMode,
        brands,
        categories,
        brandsWithLogos, // EXPORTANDO
        searchTerm,
        setSearchTerm,
        selectedBrand,
        setSelectedBrand,
        selectedCategory,
        setSelectedCategory,
        sortOrder,
        setSortOrder,
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
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};
