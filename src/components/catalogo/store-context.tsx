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
  addToCart: (p: Product | string, qty?: number) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  toggleFavorite: (id: string) => void;
  unlockPrices: (password: string) => Promise<boolean>;
  handleFinalizeOrder: (customer: CustomerInfo) => Promise<boolean>;
  handleSaveCart: () => Promise<string | null>;
  handleLoadCart: (code: string) => Promise<boolean>;
  handleSaveOrder: () => Promise<string | null>;
  loadingStates: { submitting: boolean; saving: boolean; loadingCart: boolean };
  orderSuccessData: any;
  setOrderSuccessData: (data: any) => void;
  handleDownloadPDF: () => Promise<void>;
  handleSendWhatsApp: () => void;
  customerSession: CustomerInfo | null;
  clearCustomerSession: () => void;
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
  // Determina o modo de preços: se o catálogo estiver em "preço de custo"
  // (show_cost_price=true e show_sale_price!=true) então os preços começam ocultos.
  const isCostMode =
    (store as any).show_cost_price === true &&
    (store as any).show_sale_price !== true;
  const [showPrices, setShowPrices] = useState(!isCostMode);
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

  // LOGIN INVISÍVEL: estado para armazenar dados do cliente reconhecido
  const [customerSession, setCustomerSession] = useState<CustomerInfo | null>(
    null
  );

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

    // LOGIN INVISÍVEL: carregar dados do cliente salvo para este user/store
    try {
      const savedCustomer = localStorage.getItem(`customer-${store.user_id}`);
      if (savedCustomer) {
        const parsed = JSON.parse(savedCustomer) as CustomerInfo;
        setCustomerSession(parsed);
        console.log('Cliente reconhecido:', parsed?.name);
      }
    } catch {}
  }, [store.name, store.user_id]);

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
  const addToCart = (p: Product | string, qty = 1) => {
    // Suporta receber o objeto Product ou apenas o product id (string).
    let productObj: Product | undefined;
    if (typeof p === 'string') {
      productObj = initialProducts.find((ip) => ip.id === p);
    } else {
      productObj = p;
    }
    if (!productObj) {
      toast.error('Produto não encontrado.');
      return;
    }

    setCart((prev) => {
      const exists = prev.find((i) => i.id === productObj!.id);
      if (exists)
        return prev.map((i) =>
          i.id === productObj!.id ? { ...i, quantity: i.quantity + qty } : i
        );
      return [...prev, { ...productObj!, quantity: qty }];
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

      // Use server-side API to create orders (avoids RLS 403 for public catalogs)
      const payload = {
        storeOwnerId: store.user_id,
        customer: {
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          cnpj: customer.cnpj,
        },
        cartItems: cart.map((it) => ({
          id: it.id,
          name: it.name,
          price: it.price,
          quantity: it.quantity,
          reference_code: it.reference_code || null,
        })),
      };

      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok || !result || result.success === false) {
        console.error('create-order API error', { status: res.status, result });
        throw new Error(
          result?.message || result?.error || 'Erro ao criar pedido'
        );
      }

      // 3. Upload do PDF para o Storage (feito no client para gerar o recibo e link)
      let publicUrl: string | null = null;
      try {
        const serverOrder = {
          id: result.id || null,
          display_id: result.display_id || result.orderId || null,
        } as any;

        const doc = await generateOrderPDF(
          { ...serverOrder, customer },
          store,
          cart,
          totalValue,
          true
        );
        if (doc instanceof Blob) {
          const fileName = `pedidos/${serverOrder.id || serverOrder.display_id || 'unknown'}_${Date.now()}.pdf`;
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
        id: result.id || result.orderId || null,
        display_id: result.display_id || result.orderId || null,
        customer,
        items: cart,
        total: totalValue,
        pdf_url: publicUrl,
      });
      // LOGIN INVISÍVEL: grava dados do cliente para próximas visitas
      try {
        localStorage.setItem(
          `customer-${store.user_id}`,
          JSON.stringify(customer)
        );
        setCustomerSession(customer);
      } catch {}

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
    try {
      const itemsPayload = cart.map((it) => ({
        product_id: it.id,
        name: it.name,
        price: it.price,
        quantity: it.quantity,
        reference_code: it.reference_code || null,
        image_url: it.image_url || null,
      }));

      const res = await fetch('/api/save-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsPayload, userId: store.user_id }),
      });

      const json = await res.json();
      setLoadingStates((s) => ({ ...s, saving: false }));
      if (!res.ok || !json || json.error) {
        console.error('save-cart API error', { status: res.status, json });
        return null;
      }
      return json.code || json.short_id || null;
    } catch (err) {
      console.error('Erro ao salvar carrinho via API:', err);
      setLoadingStates((s) => ({ ...s, saving: false }));
      return null;
    }
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

  const handleSaveOrder = async () => {
    if (!orderSuccessData) return null;
    setLoadingStates((s) => ({ ...s, saving: true }));
    try {
      const shortId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const items = orderSuccessData.items || [];
      const { error } = await supabase.from('saved_carts').insert({
        short_id: shortId,
        items,
        meta: { order_id: orderSuccessData.id },
      });
      setLoadingStates((s) => ({ ...s, saving: false }));
      return error ? null : shortId;
    } catch (err) {
      console.error('Erro ao salvar pedido como código:', err);
      setLoadingStates((s) => ({ ...s, saving: false }));
      return null;
    }
  };

  const displayProducts = useMemo(() => {
    const base = searchResults || initialProducts;
    return base
      .filter((p) => {
        if (showFavorites && !favorites.includes(p.id)) return false;
        if (showOnlyNew && !p.is_launch) return false;
        if (showOnlyBestsellers && !p.is_best_seller) return false;
        if (selectedBrand !== 'all') {
          const normalize = (s: unknown) =>
            String(s || '')
              .trim()
              .toLowerCase();
          const productBrand = normalize(p.brand);
          if (Array.isArray(selectedBrand)) {
            const selectedNormalized = selectedBrand.map(normalize);
            if (!selectedNormalized.includes(productBrand)) return false;
          } else {
            if (productBrand !== normalize(selectedBrand)) return false;
          }
        }
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
          const plain = p.trim();
          // Primeiro, se existe hash no sistema (compatibilidade), verifique-o
          if ((store as any).price_password_hash) {
            const hash = await sha256(plain);
            if (hash === (store as any).price_password_hash) {
              setShowPrices(true);
              return true;
            }
          }
          // Em seguida, suporte a senha em texto simples (legado/solicitado)
          if (
            (store as any).price_password &&
            plain === (store as any).price_password
          ) {
            setShowPrices(true);
            return true;
          }
          return false;
        },
        handleFinalizeOrder,
        handleSaveCart,
        handleLoadCart,
        handleSaveOrder,
        loadingStates,
        orderSuccessData,
        setOrderSuccessData,
        handleDownloadPDF: async () => {
          if (!orderSuccessData) return;
          try {
            if (orderSuccessData.pdf_url) {
              window.open(orderSuccessData.pdf_url, '_blank');
              return;
            }
            const doc = await generateOrderPDF(
              { ...orderSuccessData, customer: orderSuccessData.customer },
              store,
              orderSuccessData.items,
              orderSuccessData.total,
              true
            );
            if (doc instanceof Blob) {
              const url = URL.createObjectURL(doc);
              const a = document.createElement('a');
              a.href = url;
              a.download = `pedido_${orderSuccessData.id || 'receipt'}.pdf`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
            }
          } catch (err) {
            console.error('Erro ao baixar PDF:', err);
            toast.error('Erro ao gerar/baixar PDF.');
          }
        },
        handleSendWhatsApp,
        customerSession,
        clearCustomerSession: () => {
          try {
            localStorage.removeItem(`customer-${store.user_id}`);
          } catch {}
          setCustomerSession(null);
        },
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
