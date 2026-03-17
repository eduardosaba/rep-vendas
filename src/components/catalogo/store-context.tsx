 'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { generateOrderPDF } from '@/lib/generateOrderPDF';
import type {
  Product,
  Settings as StoreSettings,
  PublicCatalog,
  CartItem,
  BrandWithLogo,
  CustomerInfo,
} from '@/lib/types';

// Constantes de imagem
const IMAGE_PRIORITY_COUNT = 3;
const IMAGE_SIZES = [300, 480, 900, 1200];

// Contexto e Provider
const StoreContext = createContext<any | null>(null);

async function sha256(input: string) {
  try {
    const enc = new TextEncoder();
    const data = enc.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const arr = Array.from(new Uint8Array(hashBuffer));
    return arr.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    return '';
  }
}

interface StoreProviderProps {
  store: StoreSettings | PublicCatalog;
  initialProducts?: Product[];
  startProductId?: string | null;
  children?: React.ReactNode;
}

export function StoreProvider({
  store,
  initialProducts = [],
  startProductId = null,
  children,
}: StoreProviderProps) {
  const supabase = createClient();
  // ✅ PAGINAÇÃO PREMIUM: Estado dinâmico (localStorage persistence)
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    if (typeof window !== 'undefined' && typeof window.localStorage?.getItem === 'function') {
      const saved = window.localStorage.getItem('itemsPerPage');
      if (saved) return parseInt(saved, 10) || 24;
    }
    return 24;
  });

  // Estados
  // Determina o modo de preços: se o catálogo estiver em "preço de custo"
  // (show_cost_price=true e show_sale_price!=true) então os preços começam ocultos.
  const isCostMode =
    (store as any).show_cost_price === true &&
    (store as any).show_sale_price !== true;
  // Por padrão: preços aparecem bloqueados (false). Usuário pode desbloquear via UI.
  const [showPrices, setShowPrices] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[] | null>(null);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string | string[]>('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedGender, setSelectedGender] = useState('all');
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
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table'>('grid');
  const [hideImages, setHideImages] = useState<boolean>(false);
  const [brandsWithLogos, setBrandsWithLogos] = useState<BrandWithLogo[]>([]);
  const [categoriesWithData, setCategoriesWithData] = useState<
    { name: string; image_url: string | null }[]
  >([]);
  const [gendersWithData, setGendersWithData] = useState<
    { name: string; image_url: string | null }[]
  >([]);
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

      const gender = params.get('gender');
      if (gender) setSelectedGender(gender);

      setShowOnlyNew(params.get('new') === '1');
      setShowOnlyBestsellers(params.get('bs') === '1');
      setShowFavorites(params.get('fav') === '1');

      const sort = params.get('sort');
      if (sort) setSortOrder(sort as any);

      const view = params.get('view');
      if (view === 'list' || view === 'grid' || view === 'table')
        setViewMode(view as 'grid' | 'list' | 'table');

      const page = params.get('page');
      if (page) setCurrentPage(Number(page) || 1);
    } catch (e) {
      // ignore if window is not available or parsing fails
    }
     
  }, []);

  // Auto-detect network conditions to choose a conservative initial UX
  useEffect(() => {
    try {
      const connection =
        (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection;
      if (!connection) return;
      const effective = String(connection.effectiveType || '').toLowerCase();
      const saveData = !!connection.saveData;
      if (saveData || ['2g', '3g'].includes(effective)) {
        // Prefer table mode and hide images on slow/limited connections
        setViewMode('table');
        setHideImages(true);
        try {
          toast.info('Conexão detectada como lenta — modo compacto ativado.');
        } catch (e) {}
      }
    } catch (e) {
      // ignore
    }
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

        if (selectedGender && selectedGender !== 'all')
          params.set('gender', selectedGender);
        else params.delete('gender');

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
  // Quando a marca selecionada mudar (após a montagem inicial), resetar
  // categoria/gênero para evitar filtros persistentes entre marcas.
  const _brandMounted = (globalThis as any).__repv_brand_mounted || {
    value: false,
  };
  useEffect(() => {
    // Evitar override durante a inicialização via query string
    if (!_brandMounted.value) {
      _brandMounted.value = true;
      (globalThis as any).__repv_brand_mounted = _brandMounted;
      return;
    }
    try {
      setSelectedCategory('all');
      setSelectedGender('all');
      setCurrentPage(1);
    } catch (e) {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrand]);
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

  // Sincroniza o estado do modal de produto com a query string para deep-linking
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (modals.product) {
        const val = (modals.product.slug || modals.product.id || '').toString();
        if (val) {
          params.set('productId', val);
          params.set('p', val);
        }
      } else {
        params.delete('productId');
        params.delete('p');
      }

      const base = window.location.pathname;
      const qs = params.toString();
      const url = qs ? `${base}?${qs}` : base;
      // atualizar sem scroll/recarregar
      try {
        router.replace(url, { scroll: false });
      } catch {
        // fallback sem options para compatibilidade
        router.replace(url);
      }
    } catch (e) {
      // ignore
    }
  }, [modals.product, router]);

  // Ao montar ou quando `initialProducts` ficar disponível, verificar se a URL
  // contém um parâmetro `p` (deep-link) e abrir o modal do produto correspondente.
  useEffect(() => {
    try {
      if (!initialProducts || initialProducts.length === 0) return;
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get('p') || params.get('productId');
      if (!fromUrl) return;
      // Se já temos modal aberto, não sobrescrever
      if (modals.product) return;
      const found = initialProducts.find(
        (it: any) => it.slug === fromUrl || it.id === fromUrl
      );
      if (found) setModals((m) => ({ ...m, product: found }));
    } catch (e) {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProducts]);

  // Se existir uma liberação de preços persistida no localStorage, aplicar na inicialização
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const access =
        typeof window.localStorage?.getItem === 'function'
          ? window.localStorage.getItem('priceAccessGranted')
          : null;
      const expires =
        typeof window.localStorage?.getItem === 'function'
          ? window.localStorage.getItem('priceAccessExpiresAt')
          : null;
      if (access === 'true') {
        if (expires) {
          const exp = new Date(expires);
          if (exp.getTime() > Date.now()) {
            setShowPrices(true);
          } else {
            // expirado
            try {
              if (typeof window.localStorage?.removeItem === 'function') {
                window.localStorage.removeItem('priceAccessGranted');
                window.localStorage.removeItem('priceAccessExpiresAt');
              }
            } catch {}
          }
        } else {
          setShowPrices(true);
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

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

  const refreshPendingImages = useCallback(async () => {
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

      // `/api/pending-external-images` já fornece a lista de imagens externas pendentes
      const res = await fetch('/api/pending-external-images', { headers });
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
  }, [store.user_id, supabase]);

  useEffect(() => {
    refreshPendingImages();
    const t = setInterval(() => refreshPendingImages(), 1000 * 60 * 5);
    return () => clearInterval(t);
  }, [refreshPendingImages, store.user_id]);

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
  const genders = useMemo(
    () =>
      Array.from(
        new Set(
          initialProducts
            .map((p) => (p as any).gender?.trim())
            .filter(Boolean) as string[]
        )
      ).sort(),
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
            if (typeof u === 'string' && (u.startsWith('http') || u.startsWith('//'))) return u;

            // Paths relativos
            if (typeof u === 'string' && u.startsWith('/')) return `${PUBLIC_BASE}${u}`;

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

  // Fetch categories (with optional image_url) for this store to power
  // image-backed CategoryBar. Falls back to empty list if not available.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('name, image_url')
          .eq('user_id', store.user_id)
          .order('name');
        if (!mounted) return;
        if (error) {
          setCategoriesWithData([]);
          return;
        }

        const normalizeUrl = (raw: any) => {
          if (!raw) return null;
          try {
            const s = String(raw || '').trim();
            if (!s) return null;
            if (s.includes('/storage/v1/object/public/')) {
              const path = s.split('/storage/v1/object/public/')[1];
              return `/api/storage-image?path=${encodeURIComponent(path)}`;
            }
            if (/^https?:\/\//i.test(s)) return s;
            return s;
          } catch (e) {
            return null;
          }
        };

        setCategoriesWithData(
          (data || []).map((d: any) => ({
            name: d.name,
            image_url: normalizeUrl(d.image_url),
          }))
        );
      } catch (e) {
        setCategoriesWithData([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [supabase, store.user_id]);

  // Genders: attempt to fetch a dedicated genders table; otherwise derive
  // from initial products as simple name-only entries (no images).
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Tentativa 1: tabela `genders` (antiga/nova)
        let data: any[] | null = null;
        let error: any = null;
        try {
          const res = await supabase
            .from('genders')
            .select('name, image_url')
            .eq('user_id', store.user_id)
            .order('name');
          // NOTE: result typing may differ across supabase client versions
          data = res.data;
          // NOTE: result typing may differ across supabase client versions
          error = res.error;
        } catch (err) {
          data = null;
          error = err;
        }

        // Se não temos dados válidos, tentar `product_genders` (admin UI usa esse nome)
        if ((!data || data.length === 0) && !error) {
          try {
            const res2 = await supabase
              .from('product_genders')
              .select('name, image_url')
              .eq('user_id', store.user_id)
              .order('name');
            // NOTE: result typing may differ across supabase client versions
            data = res2.data;
            // NOTE: result typing may differ across supabase client versions
            error = res2.error;
          } catch (err2) {
            // manter error/data como está
          }
        }

        if (!mounted) return;

        if (error || !data) {
          // fallback: build from derived `genders` list
          setGendersWithData(
            genders.map((g) => ({ name: g, image_url: null }))
          );
          return;
        }

        const normalizeUrl = (raw: any) => {
          if (!raw) return null;
          try {
            const s = String(raw || '').trim();
            if (!s) return null;
            if (s.includes('/storage/v1/object/public/')) {
              const path = s.split('/storage/v1/object/public/')[1];
              return `/api/storage-image?path=${encodeURIComponent(path)}`;
            }
            if (/^https?:\/\//i.test(s)) return s;
            return s;
          } catch (e) {
            return null;
          }
        };

        setGendersWithData(
          (data || []).map((d: any) => ({
            name: d.name,
            image_url: normalizeUrl(d.image_url),
          }))
        );
      } catch (e) {
        setGendersWithData(genders.map((g) => ({ name: g, image_url: null })));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [supabase, store.user_id, genders]);

  useEffect(() => {
    try {
      const savedCart =
        typeof window !== 'undefined' && typeof window.localStorage?.getItem === 'function'
          ? window.localStorage.getItem(`cart-${store.name}`)
          : null;
      if (savedCart) {
        try {
          setCart(JSON.parse(savedCart));
        } catch {}
      }

      // LOGIN INVISÍVEL: carregar dados do cliente salvo para este user/store
      const savedCustomer =
        typeof window !== 'undefined' && typeof window.localStorage?.getItem === 'function'
          ? window.localStorage.getItem(`customer-${store.user_id}`)
          : null;
      if (savedCustomer) {
        try {
          const parsed = JSON.parse(savedCustomer) as CustomerInfo;
          setCustomerSession(parsed);
        } catch {}
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

  const isFeatureAllowed = useMemo(
    () => (
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
    },
    [storePlanName, planFeatureMatrix, storeSubscriptionStatus, globalControls, store]
  );

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

    const normalizeImageForCart = (raw: any) => {
      // Accept full product objects or raw string values
      try {
        if (!raw && raw !== 0) return null;

        // If caller passed a product-like object, try common fields in order
        if (typeof raw === 'object') {
          const p = raw as any;
          const candidate = p.image_url || p.image || p.image_path || p.external_image_url || null;
          if (!candidate) return null;
          raw = candidate;
        }

        const s = String(raw || '').trim();
        if (!s) return null;

        // If it's already a full URL or an internal API proxy, keep it
        if (s.startsWith('/api/') || /^https?:\/\//i.test(s)) return s;

        // If it's a Supabase public URL, extract the storage path and use proxy
        if (s.includes('/storage/v1/object/public/')) {
          const path = s.split('/storage/v1/object/public/')[1];
          const clean = String(path || '').replace(/^\/+/, '').replace(/^public\//, '');
          return `/api/storage-image?path=${encodeURIComponent(clean)}`;
        }

        // If it looks like a storage path (starts with public/ or similar) normalize and proxy
        if (/^public\//i.test(s) || s.includes('supabase.co/storage') || s.includes('/storage/v1/object')) {
          const clean = s.replace(/^\/+/, '').replace(/^public\//, '');
          return `/api/storage-image?path=${encodeURIComponent(clean)}`;
        }

        // If it's a relative path (no scheme and not starting with /), proxy it too
        if (!s.startsWith('/')) {
          const clean = s.replace(/^\/+/, '').replace(/^public\//, '');
          return `/api/storage-image?path=${encodeURIComponent(clean)}`;
        }

        // Otherwise, return as-is (absolute path on site)
        return s;
      } catch (e) {
        return null;
      }
    };

    setCart((prev) => {
      const existsIdx = prev.findIndex((i) => i.id === productObj!.id);

      // Resolve a imagem correta ANTES de salvar
      const correctImageUrl = normalizeImageForCart(productObj as any) || null;

      if (existsIdx > -1) {
        const next = [...prev];
        next[existsIdx] = {
          ...next[existsIdx],
          quantity: Number(next[existsIdx].quantity || 0) + qty,
          image_url: correctImageUrl || next[existsIdx].image_url,
        };
        return next;
      }

      const newItem = {
        ...productObj!,
        quantity: qty,
        image_url: correctImageUrl,
      } as CartItem;
      return [...prev, newItem];
    });
    toast.success('Adicionado ao carrinho!');
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === id);
      if (!existing) return prev;
      const newQty = Number(existing.quantity || 0) + Number(delta || 0);
      if (newQty <= 0) {
        return prev.filter((i) => i.id !== id);
      }
      return prev.map((i) => (i.id === id ? { ...i, quantity: newQty } : i));
    });
  };

  /**
   * FINALIZAÇÃO DE PEDIDO COM UPLOAD DE PDF
   */
  const handleFinalizeOrder = useCallback(async (customer: CustomerInfo) => {
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
          true,
          showPrices
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
  }, [cart, store, isFeatureAllowed, supabase]);

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

    // Formatação de Moeda
    const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

    let msg = `🔔 *𝗡𝗢𝗩𝗢 𝗣𝗘𝗗𝗜𝗗𝗢 : #${display_id || id}* 🚀\n`;
    msg += `👤 *CLIENTE:* ${customer.name}\n`;
    msg += `📞 *WHATSAPP:* ${customer.phone}\n`;
    msg += `✉️ *EMAIL:* ${customer.email || '—'}\n`;
    msg += `------------------------------------------\n\n`;

    msg += ` 🛒*ITENS DO PEDIDO:📦*\n`;
    items.slice(0, 15).forEach((i: any) => {
      msg += `▪️ ${i.quantity}x ${i.name} (${fmt.format(i.price)})\n`;
    });

    if (items.length > 15) {
      msg += `\n_...e outros ${items.length - 15} itens._\n`;
    }

    msg += `\n------------------------------------------\n`;
    msg += `💰 *TOTAL: ${fmt.format(total)}*\n`;
    msg += `------------------------------------------\n`;

    if (pdf_url) {
      msg += `\n📄 *VER COMPROVANTE (PDF):*\n${pdf_url}\n`;
    }

    msg += `\n_Gerado por R̳e̳p̳V̳e̳n̳d̳a̳s̳ ⭐_`;

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
      try {
        const normalizeImage = (raw: any) => {
          if (!raw) return null;
          try {
            const s = String(raw || '').trim();
            if (!s) return null;
            // If it's a Supabase storage public URL, convert to proxy path
            if (s.includes('/storage/v1/object/public/')) {
              const path = s.split('/storage/v1/object/public/')[1];
              return `/api/storage-image?path=${encodeURIComponent(path)}`;
            }
            // If it's a full Supabase storage url
            if (
              s.includes('supabase.co/storage') ||
              s.includes('/storage/v1/object')
            ) {
              return `/api/storage-image?path=${encodeURIComponent(s)}`;
            }
            // If it's already a proxy path (starts with /api/) or an absolute URL, keep as-is
            if (s.startsWith('/api/') || /^https?:\/\//i.test(s)) return s;
            // Else return as-is (relative path)
            return s;
          } catch (e) {
            return null;
          }
        };

        const normalized = (data.items || []).map((it: any, idx: number) => {
          const id =
            it.id ||
            it.product_id ||
            it.productId ||
            it.reference_code ||
            `loaded-${idx}`;
          const imageFromPath = it.image_path || it.path || null;
          const rawImage =
            it.image_url ||
            it.image ||
            it.image_url_original ||
            imageFromPath ||
            null;
          const resolvedImage = normalizeImage(rawImage);
          // Produce a fresh object for each item to avoid shared references
          return {
            ...(it || {}),
            id: String(id),
            quantity: Number(it.quantity || 1),
            image_url: resolvedImage,
          } as CartItem;
        });
        setCart(normalized);
        return true;
      } catch (e) {
        console.error('Erro ao normalizar itens carregados:', e);
        return false;
      }
    }
    return false;
  };

  const handleSaveOrder = async () => {
    if (!orderSuccessData) return null;
    setLoadingStates((s) => ({ ...s, saving: true }));
    try {
      const shortId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const items = orderSuccessData.items || [];
      const now = new Date();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dias

      const payload = {
        short_id: shortId,
        items,
        meta: { order_id: orderSuccessData.id },
        user_id_owner: store.user_id || null,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      } as any;

      // Use server API to save cart so insertion happens with server privileges
      // Normalize items to API expected shape: { product_id, quantity }
      const apiItems = (items || []).map((it: any) => ({
        product_id: it.id || it.product_id || null,
        quantity: Number(it.quantity || 1),
      }));

      const apiRes = await fetch('/api/save-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: apiItems, userId: store.user_id }),
      });

      const apiJson = await apiRes.json().catch(() => null);
      setLoadingStates((s) => ({ ...s, saving: false }));
      if (!apiRes.ok || !apiJson || apiJson.error) {
        console.error('save-cart API error', { status: apiRes.status, apiJson });
        return null;
      }
      return apiJson.code || apiJson.short_id || shortId;
    } catch (err) {
      console.error('Erro ao salvar pedido como código:', err);
      setLoadingStates((s) => ({ ...s, saving: false }));
      return null;
    }
  };

  const filteredProducts = useMemo(() => {
    const base = searchResults || initialProducts;
    return base
      .filter((p) => {
        // Nunca exibir produtos inativos no catálogo público
        if (p.is_active === false) return false;
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
        if (selectedGender !== 'all') {
          const normalize = (s: unknown) =>
            String(s || '')
              .trim()
              .toLowerCase();
          if (normalize(p.gender) !== normalize(selectedGender)) return false;
        }
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
    selectedGender,
    sortOrder,
  ]);

  const displayProducts = useMemo(() => {
    // Slice the filtered list so we only render the current page's items
    const start = Math.max(0, (currentPage - 1) * itemsPerPage);
    // Se itemsPerPage for 999999 (Todos), retorna tudo sem slice
    if (itemsPerPage >= 999999) return filteredProducts;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  // DEBUG TEMPORÁRIO: loga contagens e estado quando mudam (remover após verificação)
  useEffect(() => {
    try {
      // debug removed
    } catch (e) {}
  }, [
    filteredProducts.length,
    displayProducts.length,
    currentPage,
    itemsPerPage,
    showPrices,
  ]);

  // ✅ NORMALIZAÇÃO COMPLETA DA STORE (BANNERS, LOGOS E BARRA DE BENEFÍCIOS)
  const normalizedStore = useMemo(() => {
    // Criamos uma cópia para preservar todas as propriedades originais
    const s: any = { ...store };

    const resolveUrl = (u: string | null | undefined, isThumbnail = false) => {
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

      // If requesting a thumbnail, ask the proxy to resize for smaller payloads
      const resizeParam = isThumbnail ? '&width=300&quality=70' : '';
      return `/api/storage-image?path=${encodeURIComponent(cleanPath)}${resizeParam}`;
    };

    // 1. Normaliza banners desktop
    if (Array.isArray(s.banners)) {
      s.banners = s.banners.map((b: any) => resolveUrl(b, false));
    }

    // 2. Normaliza banners mobile
    if (Array.isArray((s as any).banners_mobile)) {
      (s as any).banners_mobile = (s as any).banners_mobile.map((b: any) =>
        resolveUrl(b, false)
      );
    }

    // 3. Normaliza logo da loja (thumbnail)
    if (s.logo_url) {
      s.logo_url = resolveUrl(s.logo_url, true);
    }

    // 4. ✅ FIX: Normaliza imagem da barra de benefícios (se houver) - thumbnail
    if (s.top_benefit_image_url) {
      s.top_benefit_image_url = resolveUrl(s.top_benefit_image_url, true);
    }

    // Garantir flags booleanas existam
    s.show_top_benefit_bar = s.show_top_benefit_bar ?? false;

    return s;
  }, [store]);

  // Função para desbloquear preços (estável via useCallback)
  const unlockPrices = useCallback(
    async (p: string) => {
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
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem('priceAccessGranted', 'true');
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              localStorage.setItem(
                'priceAccessExpiresAt',
                tomorrow.toISOString()
              );
            }
          } catch {}
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
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('priceAccessGranted', 'true');
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            localStorage.setItem(
              'priceAccessExpiresAt',
              tomorrow.toISOString()
            );
          }
        } catch {}
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
          // If server validated the password, unlock
          if (j.ok) {
            setShowPrices(true);
            try {
              if (typeof window !== 'undefined') {
                localStorage.setItem('priceAccessGranted', 'true');
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                localStorage.setItem(
                  'priceAccessExpiresAt',
                  tomorrow.toISOString()
                );
              }
            } catch {}
            toast.success('Preços desbloqueados!');
            return true;
          }

          // If server indicates a password is configured remotely, treat
          // this as an incorrect password attempt and do NOT fall back to
          // trial bypasses.
          if (j.configured) {
            toast.error('Senha incorreta');
            return false;
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

      // Plan matrix override
      if (isFeatureAllowed('view_prices')) {
        setShowPrices(true);
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('priceAccessGranted', 'true');
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            localStorage.setItem(
              'priceAccessExpiresAt',
              tomorrow.toISOString()
            );
          }
        } catch {}
        return true;
      }

      toast.error('Acesso negado');
      return false;
    },
    [store, isFeatureAllowed]
  );

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
        totalProducts: filteredProducts.length,
        currentPage,
        totalPages:
          itemsPerPage >= 999999
            ? 1
            : Math.ceil(filteredProducts.length / itemsPerPage),
        setCurrentPage,
        itemsPerPage,
        setItemsPerPage: (items: number) => {
          setItemsPerPage(items);
          setCurrentPage(1); // Reset para primeira página ao mudar tamanho
          if (typeof window !== 'undefined') {
            localStorage.setItem('itemsPerPage', items.toString());
          }
        },
        viewMode,
        setViewMode,
        hideImages,
        setHideImages,
        imagePriorityCount: IMAGE_PRIORITY_COUNT,
        imageSizes: IMAGE_SIZES,
        brands,
        brandsWithLogos,
        categories,
        categoriesWithData,
        genders,
        gendersWithData,
        searchTerm,
        setSearchTerm,
        isLoadingSearch,
        selectedBrand,
        setSelectedBrand,
        selectedCategory,
        setSelectedCategory,
        selectedGender,
        setSelectedGender,
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
        setModal: (n: string, v: any) => {
          // Ao abrir modal de produto, buscar variantes do mesmo `reference_id`/`reference_code`
          if (n === 'product') {
            // fechamento rápido
            if (!v) return setModals((m) => ({ ...m, product: null }));

            // mostrar imediatamente o produto clicado
            setModals((m) => ({ ...m, product: v }));

            // buscar variantes em background (não bloquear UI)
            (async () => {
              try {
                const supabase = createClient();
                const ref = v.reference_id || v.reference_code || null;
                if (!ref) return;

                let query = supabase.from('products').select('*').eq('user_id', v.user_id).eq('is_active', true);
                if (v.reference_id) query = query.eq('reference_id', v.reference_id);
                else query = query.eq('reference_code', v.reference_code);

                const { data } = await query;
                if (data && Array.isArray(data) && data.length > 0) {
                  const variants = data as any[];
                  const active = variants.find((p) => p.id === v.id) || v;
                  setModals((m) => ({ ...m, product: { ...active, variants } }));
                }
              } catch (e) {
                console.error('Erro ao carregar variantes do produto:', e);
              }
            })();

            return;
          }

          setModals((m) => ({ ...m, [n]: v }));
        },
        addToCart,
        removeFromCart: (id: string) => setCart((c: any[]) => c.filter((i: any) => i.id !== id)),
        updateQuantity,
        toggleFavorite: (id: string) =>
          setFavorites((f: string[]) =>
            f.includes(id) ? f.filter((x: string) => x !== id) : [...f, id]
          ),
        unlockPrices,
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
              true,
              showPrices
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
