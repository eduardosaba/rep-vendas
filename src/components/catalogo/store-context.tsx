'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from 'react';
import { toast } from 'sonner';
import type {
  Product,
  Settings as StoreSettings,
  PublicCatalog,
  CartItem,
  CustomerInfo,
  BrandWithLogo,
} from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { generateOrderPDF } from '@/lib/generateOrderPDF';

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
  setIsPricesVisible: (v: boolean) => void;
  showPrices: boolean;
  toggleShowPrices: () => void;
  displayProducts: Product[];
  totalProducts: number;
  currentPage: number;
  totalPages: number;
  setCurrentPage: (p: number) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (m: 'grid' | 'list') => void;
  brands: string[];
  brandsWithLogos: BrandWithLogo[];
  categories: string[];
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  isLoadingSearch: boolean;
  selectedBrand: string | string[];
  setSelectedBrand: (s: string | string[]) => void;
  selectedCategory: string;
  setSelectedCategory: (s: string) => void;
  sortOrder: string;
  setSortOrder: (s: any) => void;
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
  unlockPrices: (password: string) => Promise<boolean>;
  handleFinalizeOrder: (customer: CustomerInfo) => Promise<boolean>;
  handleSaveCart: () => Promise<string | null>;
  handleLoadCart: (code: string) => Promise<boolean>;
  loadingStates: { submitting: boolean; saving: boolean; loadingCart: boolean };
  orderSuccessData: any;
  setOrderSuccessData: (data: any) => void;
  handleDownloadPDF: () => void;
  handleSendWhatsApp: () => void;
}

async function sha256(message: string) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({
  children,
  store,
  initialProducts,
  startProductId,
}: StoreProviderProps) {
  const supabase = createClient();
  const ITEMS_PER_PAGE = 24;

  // Estados
  const [showPrices, setShowPrices] = useState(!store.show_cost_price);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[] | null>(null);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
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
  const [orderSuccessData, setOrderSuccessData] = useState<any>(null);
  const [loadingStates, setLoadingStates] = useState({
    submitting: false,
    saving: false,
    loadingCart: false,
  });

  const [modals, setModals] = useState({
    cart: false,
    checkout: false,
    password: false,
    load: false,
    save: false,
    zoom: false,
    product: startProductId
      ? initialProducts.find((p) => p.id === startProductId) || null
      : null,
  });

  // Memoização para performance
  const brands = useMemo(
    () =>
      Array.from(
        new Set(
          initialProducts
            .map((p) => p.brand?.trim())
            .filter(Boolean) as string[]
        )
      ),
    [initialProducts]
  );
  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          initialProducts
            .map((p) => p.category?.trim())
            .filter(Boolean) as string[]
        )
      ),
    [initialProducts]
  );

  // Persistência e busca de marcas
  useEffect(() => {
    const fetchLogos = async () => {
      const { data } = await supabase
        .from('brands')
        .select('name, logo_url')
        .eq('user_id', store.user_id)
        .in('name', brands);
      if (data)
        setBrandsWithLogos(
          brands.map(
            (b) => data.find((d) => d.name === b) || { name: b, logo_url: null }
          )
        );
    };
    if (brands.length > 0) fetchLogos();
  }, [brands, store.user_id]);

  useEffect(() => {
    const savedCart = localStorage.getItem(`cart-${store.name}`);
    if (savedCart)
      try {
        setCart(JSON.parse(savedCart));
      } catch {}
  }, [store.name]);

  useEffect(() => {
    localStorage.setItem(`cart-${store.name}`, JSON.stringify(cart));
  }, [cart, store.name]);

  // Lógica de Busca Debounced
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    if (!debouncedSearchTerm) {
      setSearchResults(null);
      return;
    }
    const runSearch = async () => {
      setIsLoadingSearch(true);
      const { data } = await supabase.rpc('search_products', {
        search_term: debouncedSearchTerm,
        catalog_user_id: store.user_id,
      });
      if (data) setSearchResults(data as Product[]);
      setIsLoadingSearch(false);
    };
    runSearch();
  }, [debouncedSearchTerm, store.user_id]);

  // Ações do Carrinho
  const addToCart = (p: Product, qty = 1) => {
    setCart((prev) => {
      const exists = prev.find((i) => i.id === p.id);
      if (exists)
        return prev.map((i) =>
          i.id === p.id ? { ...i, quantity: i.quantity + qty } : i
        );
      return [...prev, { ...p, quantity: qty }];
    });
    toast.success('Adicionado ao carrinho!');
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
      )
    );
  };

  /**
   * FINALIZAÇÃO DE PEDIDO COM UPLOAD DE PDF
   */
  const handleFinalizeOrder = async (customer: CustomerInfo) => {
    setLoadingStates((s) => ({ ...s, submitting: true }));
    try {
      const totalValue = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);

      // 1. Salva Pedido no Banco
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          user_id: store.user_id,
          client_name_guest: customer.name,
          client_phone_guest: customer.phone.replace(/\D/g, ''),
          client_cnpj_guest: customer.cnpj,
          total_value: totalValue,
          status: 'Pendente',
        })
        .select()
        .maybeSingle();

      if (error || !order) throw error;

      // 2. Salva Itens
      await supabase.from('order_items').insert(
        cart.map((it) => ({
          order_id: order.id,
          product_id: it.id,
          quantity: it.quantity,
          unit_price: it.price,
        }))
      );

      // 3. Upload do PDF para o Storage
      let publicUrl = null;
      try {
        const doc = await generateOrderPDF(
          { ...order, customer },
          store,
          cart,
          totalValue,
          true
        ); // true = retorna blob
        if (doc instanceof Blob) {
          const fileName = `pedidos/${order.id}_${Date.now()}.pdf`;
          const { error: uploadError } = await supabase.storage
            .from('order-receipts')
            .upload(fileName, doc);
          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('order-receipts')
              .getPublicUrl(fileName);
            publicUrl = urlData.publicUrl;
          }
        }
      } catch (pdfErr) {
        console.error('Erro ao processar PDF para nuvem', pdfErr);
      }

      setOrderSuccessData({
        ...order,
        customer,
        items: cart,
        total: totalValue,
        pdf_url: publicUrl,
      });
      setCart([]);
      return true;
    } catch (e) {
      toast.error('Erro ao processar pedido.');
      return false;
    } finally {
      setLoadingStates((s) => ({ ...s, submitting: false }));
    }
  };

  /**
   * WHATSAPP COM RESUMO EXECUTIVO E LINK DO PDF
   */
  const handleSendWhatsApp = () => {
    if (!orderSuccessData) return;
    const { customer, items, total, display_id, id, pdf_url } =
      orderSuccessData;
    const phone = (store.phone || '').replace(/\D/g, '');

    let msg = `*📦 NOVO PEDIDO: #${display_id || id}*\n`;
    msg += `--------------------------------\n\n`;
    msg += `*CLIENTE:* ${customer.name}\n`;
    msg += `*WHATSAPP:* ${customer.phone}\n\n`;
    msg += `*ITENS:*\n`;
    items
      .slice(0, 10)
      .forEach((i: any) => (msg += `▪️ ${i.quantity}x ${i.name}\n`));
    if (items.length > 10) msg += `_...e outros ${items.length - 10} itens._\n`;

    msg += `\n*TOTAL: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}*\n`;

    if (pdf_url) {
      msg += `\n*📄 COMPROVANTE PDF:*\n${pdf_url}\n`;
    }

    msg += `\n_Gerado por RepVendas SaaS_`;
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
      '_blank'
    );
  };

  const handleSaveCart = async () => {
    setLoadingStates((s) => ({ ...s, saving: true }));
    const shortId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { error } = await supabase
      .from('saved_carts')
      .insert({ short_id: shortId, items: cart });
    setLoadingStates((s) => ({ ...s, saving: false }));
    return error ? null : shortId;
  };

  const handleLoadCart = async (code: string) => {
    setLoadingStates((s) => ({ ...s, loadingCart: true }));
    const { data } = await supabase
      .from('saved_carts')
      .select('items')
      .eq('short_id', code.toUpperCase())
      .maybeSingle();
    setLoadingStates((s) => ({ ...s, loadingCart: false }));
    if (data?.items) {
      setCart(data.items as CartItem[]);
      return true;
    }
    return false;
  };

  const displayProducts = useMemo(() => {
    const base = searchResults || initialProducts;
    return base
      .filter((p) => {
        if (showFavorites && !favorites.includes(p.id)) return false;
        if (showOnlyNew && !p.is_launch) return false;
        if (showOnlyBestsellers && !p.is_best_seller) return false;
        if (selectedBrand !== 'all' && p.brand !== selectedBrand) return false;
        if (selectedCategory !== 'all' && p.category !== selectedCategory)
          return false;
        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'price_asc') return a.price - b.price;
        if (sortOrder === 'price_desc') return b.price - a.price;
        return a.name.localeCompare(b.name);
      });
  }, [
    searchResults,
    initialProducts,
    favorites,
    showFavorites,
    showOnlyNew,
    showOnlyBestsellers,
    selectedBrand,
    selectedCategory,
    sortOrder,
  ]);

  return (
    <StoreContext.Provider
      value={{
        store,
        initialProducts,
        cart,
        favorites,
        showPrices,
        isPricesVisible: showPrices,
        setIsPricesVisible: setShowPrices,
        toggleShowPrices: () => setShowPrices(!showPrices),
        displayProducts,
        totalProducts: displayProducts.length,
        currentPage,
        totalPages: Math.ceil(displayProducts.length / ITEMS_PER_PAGE),
        setCurrentPage,
        viewMode,
        setViewMode,
        brands,
        brandsWithLogos,
        categories,
        searchTerm,
        setSearchTerm,
        isLoadingSearch,
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
        setModal: (n, v) => setModals((m) => ({ ...m, [n]: v })),
        addToCart,
        removeFromCart: (id) => setCart((c) => c.filter((i) => i.id !== id)),
        updateQuantity,
        toggleFavorite: (id) =>
          setFavorites((f) =>
            f.includes(id) ? f.filter((x) => x !== id) : [...f, id]
          ),
        unlockPrices: async (p) => {
          const hash = await sha256(p.trim());
          if (hash === (store as any).price_password_hash) {
            setShowPrices(true);
            return true;
          }
          return false;
        },
        handleFinalizeOrder,
        handleSaveCart,
        handleLoadCart,
        loadingStates,
        orderSuccessData,
        setOrderSuccessData,
        handleDownloadPDF: () => {},
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
