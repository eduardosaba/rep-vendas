'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
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
  sortOrder:
    | 'name'
    | 'price_asc'
    | 'price_desc'
    | 'ref_asc'
    | 'ref_desc'
    | 'created_desc'
    | 'created_asc';
  setSortOrder: (
    s:
      | 'name'
      | 'price_asc'
      | 'price_desc'
      | 'ref_asc'
      | 'ref_desc'
      | 'created_desc'
      | 'created_asc'
  ) => void;
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
    password: boolean;
    load: boolean;
    save: boolean;
    zoom: boolean;
    cart: boolean;
    checkout: boolean;
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
  pendingImagesCount?: number;
  refreshPendingImages?: () => Promise<void>;
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
    | 'name'
    | 'price_asc'
    | 'price_desc'
    | 'ref_asc'
    | 'ref_desc'
    | 'created_desc'
    | 'created_asc'
  >('ref_desc');
  const [showOnlyNew, setShowOnlyNew] = useState(false);
  const [showOnlyBestsellers, setShowOnlyBestsellers] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [brandsWithLogos, setBrandsWithLogos] = useState<BrandWithLogo[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentBanner, setCurrentBanner] = useState(0);
  const router = useRouter();

  // Inicializa estados de filtros a partir da query string (permitir links compartilháveis)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q');
      if (q) setSearchTerm(q);

      const brand = params.get('brand');
      if (brand) {
        if (brand.includes(','))
          setSelectedBrand(brand.split(',').map((s) => s.trim()));
        else setSelectedBrand(brand);
      }

      const category = params.get('category');
      if (category) setSelectedCategory(category);

      setShowOnlyNew(params.get('new') === '1');
      setShowOnlyBestsellers(params.get('bs') === '1');
      setShowFavorites(params.get('fav') === '1');

      const sort = params.get('sort');
      if (sort) setSortOrder(sort as any);

      const view = params.get('view');
      if (view === 'list' || view === 'grid')
        setViewMode(view as 'grid' | 'list');

      const page = params.get('page');
      if (page) setCurrentPage(Number(page) || 1);
    } catch (e) {
      // ignore if window is not available or parsing fails
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincroniza estado de filtros para a URL (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const params = new URLSearchParams(window.location.search);

        if (searchTerm) params.set('q', searchTerm);
        else params.delete('q');

        if (selectedBrand && selectedBrand !== 'all') {
          if (Array.isArray(selectedBrand))
            params.set('brand', selectedBrand.join(','));
          else params.set('brand', selectedBrand as string);
        } else params.delete('brand');

        if (selectedCategory && selectedCategory !== 'all')
          params.set('category', selectedCategory);
        else params.delete('category');

        if (showOnlyNew) params.set('new', '1');
        else params.delete('new');

        if (showOnlyBestsellers) params.set('bs', '1');
        else params.delete('bs');

        if (showFavorites) params.set('fav', '1');
        else params.delete('fav');

        if (sortOrder) params.set('sort', String(sortOrder));
        else params.delete('sort');

        if (viewMode) params.set('view', viewMode);
        else params.delete('view');

        if (currentPage && currentPage > 1)
          params.set('page', String(currentPage));
        else params.delete('page');

        const base = window.location.pathname;
        const qs = params.toString();
        const url = qs ? `${base}?${qs}` : base;
        router.replace(url);
      } catch (e) {
        // ignore
      }
    }, 250);
    return () => clearTimeout(t);
  }, [
    searchTerm,
    selectedBrand,
    selectedCategory,
    showOnlyNew,
    showOnlyBestsellers,
    showFavorites,
    sortOrder,
    viewMode,
    currentPage,
    router,
  ]);
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

  const [globalControls, setGlobalControls] = useState<{
    allow_trial_unlock?: boolean;
    allow_trial_checkout?: boolean;
    allow_test_bypass?: boolean;
  } | null>(null);
  const [planFeatureMatrix, setPlanFeatureMatrix] = useState<Record<
    string,
    Record<string, boolean>
  > | null>(null);
  const [storePlanName, setStorePlanName] = useState<string | null>(null);
  const [storeSubscriptionStatus, setStoreSubscriptionStatus] = useState<
    string | null
  >(null);

  // Contador global de imagens pendentes (diagnóstico)
  const [pendingImagesCount, setPendingImagesCount] = useState<number>(0);

  const refreshPendingImages = async () => {
    try {
      // Try to include auth token if available (endpoint may be protected)
      // Only call diagnostics if we have a session token (avoid 401 noise on public storefront)
      let session: any = null;
      try {
        session = await supabase.auth.getSession();
      } catch (e) {
        session = null;
      }

      const token = session?.data?.session?.access_token;
      if (!token) {
        // No authenticated session available — skip diagnostics on public storefront
        setPendingImagesCount(0);
        return;
      }

      const headers: any = {
        'content-type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      const res = await fetch('/api/products/image-diagnostics', { headers });
      if (!res.ok) {
        // ignore other errors but don't leave stale counts
        setPendingImagesCount(0);
        return;
      }
      const j = await res.json();
      setPendingImagesCount(Number(j.total_external || 0));
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    refreshPendingImages();
    const t = setInterval(() => refreshPendingImages(), 1000 * 60 * 5);
    return () => clearInterval(t);
  }, [store.user_id]);

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
        .select('name, logo_url, banner_url, description')
        .eq('user_id', store.user_id)
        .in('name', brands);
      if (data) {
        const PUBLIC_BASE =
          typeof window !== 'undefined'
            ? process.env.NEXT_PUBLIC_APP_URL || ''
            : process.env.NEXT_PUBLIC_APP_URL || '';

        const extractUrl = (raw: any): string | null => {
          if (!raw && raw !== '') return null;
          try {
            // If it's already an object with common keys
            if (typeof raw === 'object') {
              if (raw.publicUrl) return String(raw.publicUrl);
              if (raw.secureUrl) return String(raw.secureUrl);
              if (raw.url) return String(raw.url);
            }

            // If it's a JSON string, try to parse
            if (typeof raw === 'string') {
              const s = raw.trim();
              if (s.startsWith('{') || s.startsWith('[') || s.startsWith('"')) {
                try {
                  const parsed = JSON.parse(s);
                  if (!parsed) return null;
                  if (Array.isArray(parsed) && parsed.length > 0)
                    return String(parsed[0]);
                  if (typeof parsed === 'string') return parsed;
                  if (parsed.publicUrl) return String(parsed.publicUrl);
                  if (parsed.secureUrl) return String(parsed.secureUrl);
                  if (parsed.url) return String(parsed.url);
                } catch (e) {
                  // fallthrough to regexp
                }
              }

              // Try regex extraction for embedded publicUrl
              const m = raw.match(/publicUrl"\s*:\s*"(https?:\/\/[^"]+)"/i);
              if (m && m[1]) return m[1];

              // Plain URL
              if (/^https?:\/\//i.test(raw)) return raw;
              // Trim surrounding quotes
              const trimmed = raw.replace(/^"|"$/g, '');
              if (/^https?:\/\//i.test(trimmed)) return trimmed;
            }
          } catch (e) {
            // ignore
          }
          return null;
        };

        const normalize = (d: any) => {
          const logo = extractUrl(d.logo_url);
          const banner = extractUrl(d.banner_url);
          const resolve = (u: string | null) => {
            if (!u) return null;

            // Se é URL do Supabase Storage, roteia pelo proxy
            if (
              u.includes('supabase.co/storage') ||
              u.includes('/storage/v1/object')
            ) {
              // Extrai o path após '/storage/v1/object/public/' ou usa URL completa
              const match = u.match(/\/storage\/v1\/object\/public\/(.+)$/);
              if (match && match[1]) {
                return `/api/storage-image?path=${encodeURIComponent(match[1])}`;
              }
              // Fallback: passa URL completa pro proxy
              return `/api/storage-image?path=${encodeURIComponent(u)}`;
            }

            // URLs externas (HTTP/HTTPS não-storage)
            if (u.startsWith('http') || u.startsWith('//')) return u;

            // Paths relativos
            if (u.startsWith('/')) return `${PUBLIC_BASE}${u}`;

            return u;
          };
          return {
            name: d.name,
            logo_url: resolve(logo),
            banner_url: resolve(banner),
            description: d.description || null,
          } as any;
        };
        setBrandsWithLogos(
          brands.map((b) => {
            const found = data.find((d: any) => d.name === b);
            return found
              ? normalize(found)
              : {
                  name: b,
                  logo_url: null,
                  banner_url: null,
                  description: null,
                };
          })
        );
      }
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

  // Load global control flags (from global_config)
  useEffect(() => {
    let mounted = true;
    fetch('/api/global_config')
      .then((r) => r.json())
      .then((j) => {
        if (!mounted) return;
        setGlobalControls({
          allow_trial_unlock: !!j?.allow_trial_unlock,
          allow_trial_checkout: !!j?.allow_trial_checkout,
          allow_test_bypass: !!j?.allow_test_bypass,
        });
        if (j?.plan_feature_matrix) setPlanFeatureMatrix(j.plan_feature_matrix);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Load store's subscription/plan info to evaluate matrix rules
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('status, plan_name')
          .eq('user_id', store.user_id)
          .maybeSingle();
        if (!mounted) return;
        setStorePlanName(sub?.plan_name || null);
        setStoreSubscriptionStatus(sub?.status || null);
      } catch (e) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, [store.user_id]);

  const isFeatureAllowed = (
    featureKey: 'view_prices' | 'finalize_order' | 'save_cart'
  ) => {
    // 1) plan matrix override: if present, honor explicit true/false
    const plan = storePlanName || (store as any).plan_type || null;
    if (plan && planFeatureMatrix && planFeatureMatrix[plan]) {
      const val = planFeatureMatrix[plan][featureKey];
      if (typeof val === 'boolean') return val;
    }

    // 2) trial-specific global controls: allow if trial and global flags permit
    if (storeSubscriptionStatus === 'trial') {
      if (featureKey === 'view_prices' && globalControls?.allow_trial_unlock)
        return true;
      if (
        (featureKey === 'finalize_order' || featureKey === 'save_cart') &&
        globalControls?.allow_trial_checkout
      )
        return true;
    }

    // 3) default behavior: non-trial users keep existing permissions (allow)
    if (storeSubscriptionStatus !== 'trial') return true;

    // 4) fallback: block
    return false;
  };

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
      // Check plan matrix / global controls to allow finalize for trial accounts
      if (!isFeatureAllowed('finalize_order')) {
        // If not explicitly allowed by matrix or global flags, block
        toast.error('Finalização de pedidos não permitida para esta conta.');
        return false;
      }
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
  const handleSendWhatsApp = async () => {
    if (!orderSuccessData) return;
    const { customer, items, total, display_id, id, pdf_url } =
      orderSuccessData;

    // Attempt to resolve representative phone server-side (settings -> public_catalogs)
    let destPhone: string | null = null;
    try {
      const res = await fetch('/api/catalog/representative-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: (store as any).user_id }),
      });
      if (res.ok) {
        const j = await res.json();
        if (j.ok && j.phone) destPhone = String(j.phone);
      }
    } catch (e) {
      console.error('Failed to fetch representative contact', e);
    }

    // Fallback to store.phone if route didn't return a phone
    if (!destPhone) destPhone = (store.phone || null) as string | null;
    const phone = (destPhone || '').replace(/\D/g, '');

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
      if (!isFeatureAllowed('save_cart')) {
        toast.error('Salvar carrinho não permitido para esta conta.');
        setLoadingStates((s) => ({ ...s, saving: false }));
        return null;
      }
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
        if (sortOrder === 'price_asc') return (a.price || 0) - (b.price || 0);
        if (sortOrder === 'price_desc') return (b.price || 0) - (a.price || 0);
        if (sortOrder === 'ref_asc')
          return String(a.reference_code || '').localeCompare(
            String(b.reference_code || ''),
            undefined,
            { numeric: true, sensitivity: 'base' }
          );
        if (sortOrder === 'ref_desc')
          return String(b.reference_code || '').localeCompare(
            String(a.reference_code || ''),
            undefined,
            { numeric: true, sensitivity: 'base' }
          );
        if (sortOrder === 'created_desc')
          return (
            (Date.parse(b.created_at as string) || 0) -
            (Date.parse(a.created_at as string) || 0)
          );
        if (sortOrder === 'created_asc')
          return (
            (Date.parse(a.created_at as string) || 0) -
            (Date.parse(b.created_at as string) || 0)
          );

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

  // ✅ NORMALIZAÇÃO COMPLETA DA STORE (BANNERS, LOGOS E BARRA DE BENEFÍCIOS)
  const normalizedStore = useMemo(() => {
    // Criamos uma cópia para preservar todas as propriedades originais
    const s: any = { ...store };

    const resolveUrl = (u: string | null | undefined) => {
      if (!u) return '';
      const str = String(u || '');

      // Keep external full URLs that are not Supabase storage
      if (/^https?:\/\//i.test(str) && !str.includes('supabase.co/storage'))
        return str;

      // Normalize Supabase storage paths and remove duplicated 'public/' segments
      let path = str;
      if (str.includes('/storage/v1/object/public/')) {
        path = str.split('/storage/v1/object/public/')[1];
      }
      const cleanPath = path.replace(
        'product-images/public/',
        'product-images/'
      );
      return `/api/storage-image?path=${encodeURIComponent(cleanPath)}`;
    };

    // 1. Normaliza banners desktop
    if (Array.isArray(s.banners)) {
      s.banners = s.banners.map((b: any) => resolveUrl(b));
    }

    // 2. Normaliza banners mobile
    if (Array.isArray((s as any).banners_mobile)) {
      (s as any).banners_mobile = (s as any).banners_mobile.map((b: any) =>
        resolveUrl(b)
      );
    }

    // 3. Normaliza logo da loja
    if (s.logo_url) {
      s.logo_url = resolveUrl(s.logo_url);
    }

    // 4. ✅ FIX: Normaliza imagem da barra de benefícios (se houver)
    if (s.top_benefit_image_url) {
      s.top_benefit_image_url = resolveUrl(s.top_benefit_image_url);
    }

    // Garantir flags booleanas existam
    s.show_top_benefit_bar = s.show_top_benefit_bar ?? false;

    return s;
  }, [store]);

  return (
    <StoreContext.Provider
      value={{
        store: normalizedStore,
        initialProducts,
        pendingImagesCount,
        refreshPendingImages,
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

          // ✅ VALIDAÇÃO CRÍTICA: Senha vazia NÃO desbloqueia
          if (!plain || plain.length === 0) {
            toast.error('Digite uma senha válida');
            return false;
          }

          // Verificar se há senha configurada no catálogo
          const hasPasswordConfigured =
            (store as any).price_password_hash || (store as any).price_password;

          // Primeiro, se existe hash no sistema (compatibilidade), verifique-o
          if ((store as any).price_password_hash) {
            const hash = await sha256(plain);
            if (hash === (store as any).price_password_hash) {
              setShowPrices(true);
              toast.success('Preços desbloqueados!');
              return true;
            }
          }

          // Em seguida, suporte a senha em texto simples (legado/solicitado)
          if (
            (store as any).price_password &&
            plain === (store as any).price_password
          ) {
            setShowPrices(true);
            toast.success('Preços desbloqueados!');
            return true;
          }

          // Fallback server-side: se o cliente não tem o hash/plano disponível
          // (caso de catálogos novos/testes), chamamos uma rota segura que usa
          // a Service Role para validar a senha contra `settings` ou
          // `public_catalogs` no servidor.
          try {
            const res = await fetch('/api/catalog/verify-password', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: (store as any).user_id,
                password: plain,
              }),
            });
            if (res.ok) {
              const j = await res.json();
              if (j.ok) {
                setShowPrices(true);
                toast.success('Preços desbloqueados!');
                return true;
              }
            }
          } catch (e) {
            console.error('verify-password request failed', e);
          }

          // ✅ SE CHEGOU AQUI: Senha foi fornecida mas está INCORRETA
          if (hasPasswordConfigured) {
            toast.error('Senha incorreta');
            return false;
          }

          // ⚠️ FALLBACKS: Apenas quando NÃO há senha configurada
          // If global control allows trial unlock bypass, allow it
          if (globalControls?.allow_trial_unlock) {
            setShowPrices(true);
            return true;
          }

          // Plan matrix override
          if (isFeatureAllowed('view_prices')) {
            setShowPrices(true);
            return true;
          }

          toast.error('Acesso negado');
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
