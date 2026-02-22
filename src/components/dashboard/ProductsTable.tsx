'use client';
// touch: incluir este arquivo no próximo commit (deploy cache-bust)

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Copy,
  CheckSquare,
  Square,
  Zap,
  Star,
  DollarSign,
  Package,
  X,
  Tag,
  Layers,
  Filter,
  Briefcase,
  FileText,
  Download,
  Eye,
  EyeOff,
  ListOrdered,
  Rocket,
} from 'lucide-react';
import { Button } from '../ui/button';
import ProductBarcode from '@/components/ui/Barcode';
import Image from 'next/image';
import { getProductImageUrl, formatImageUrl } from '@/lib/imageUtils';
import { toast } from 'sonner';
// imports removed: SyncSingleButton, getProductImage (not used)
import {
  bulkUpdateFields,
  bulkUpdatePrice,
  bulkDelete,
} from '@/app/dashboard/products/actions';
import { createClient } from '@/lib/supabase/client';
import { generateCatalogPDF } from '@/utils/generateCatalogPDF';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { ExportModal } from '@/components/dashboard/ExportModal';

// --- INTERFACES ---
interface Product {
  id: string;
  name: string;
  reference_code: string;
  price: number;
  brand: string | null;
  category: string | null;
  image_url: string | null;
  image_path?: string | null;
  external_image_url?: string | null;
  images: string[] | null;
  image_variants?: Array<{ size: number; path: string; url?: string }> | null; // Variantes responsivas
  // Indica se a imagem principal está internalizada no Storage
  image_optimized?: boolean | null;
  is_launch: boolean;
  is_best_seller: boolean;
  is_active: boolean;
  stock_quantity?: number;
  track_stock?: boolean;
  created_at: string;
  sku?: string | null;
  barcode?: string | null;
  color?: string | null;
  cost?: number;
  sale_price?: number | null;
  description?: string | null;
  technical_specs?: Record<string, string> | null;
  slug?: string;
}

interface ProductsTableProps {
  initialProducts: Product[];
  serverModeDefault?: boolean;
  initialTotalCount?: number;
}

interface BrandOption {
  name: string;
  logo_url: string | null;
}

type DataKey = Exclude<keyof Product, 'images' | 'track_stock'>;

interface ColumnDefinition {
  key: DataKey;
  title: string;
  isSortable: boolean;
  isNumeric?: boolean;
  align?: 'left' | 'right' | 'center';
}

interface UserPreferences {
  columnOrder: DataKey[];
  visibleKeys: Set<DataKey>;
}

interface SupabasePrefRow {
  user_id: string;
  app_id: string;
  table_key: string;
  column_order: DataKey[];
  visible_keys: DataKey[];
  column_widths?: Record<DataKey, number> | null;
}

const PREFS_TABLE_KEY = 'product_table';
const PREFS_TABLE_NAME = 'user_preferences';
const APP_ID = 'repvendas_saas';

const ALL_DATA_COLUMNS: Partial<Record<DataKey, ColumnDefinition>> = {
  name: { key: 'name', title: 'Produto', isSortable: true, align: 'left' },
  reference_code: {
    key: 'reference_code',
    title: 'Ref.',
    isSortable: true,
    align: 'left',
  },
  sku: { key: 'sku', title: 'SKU', isSortable: true, align: 'left' },
  barcode: { key: 'barcode', title: 'EAN', isSortable: true, align: 'left' },
  brand: { key: 'brand', title: 'Marca', isSortable: true, align: 'left' },
  category: {
    key: 'category',
    title: 'Categoria',
    isSortable: true,
    align: 'left',
  },
  color: { key: 'color', title: 'Cor', isSortable: true, align: 'left' },
  price: {
    key: 'price',
    title: 'Preço Custo',
    isSortable: true,
    isNumeric: true,
    align: 'right',
  },
  sale_price: {
    key: 'sale_price',
    title: 'Preço Sugerido',
    isSortable: true,
    isNumeric: true,
    align: 'right',
  },
  stock_quantity: {
    key: 'stock_quantity',
    title: 'Estoque',
    isSortable: true,
    isNumeric: true,
    align: 'right',
  },
  image_optimized: {
    key: 'image_optimized',
    title: 'Imagem',
    isSortable: true,
    align: 'center',
  },
  is_active: {
    key: 'is_active',
    title: 'Status',
    isSortable: true,
    align: 'center',
  },
  is_launch: {
    key: 'is_launch',
    title: 'Lançamento',
    isSortable: true,
    align: 'center',
  },
  is_best_seller: {
    key: 'is_best_seller',
    title: 'Best Seller',
    isSortable: true,
    align: 'center',
  },
};

const DEFAULT_PREFS: UserPreferences = {
  columnOrder: [
    'name',
    'reference_code',
    'price',
    'sale_price',
    'brand',
    'category',
    'stock_quantity',
    'image_optimized',
    'is_active',
    'is_launch',
  ],
  visibleKeys: new Set([
    'name',
    'reference_code',
    'price',
    'brand',
    'is_active',
    'image_optimized',
  ]),
};

const DEFAULT_SORT_DIRECTION: Partial<Record<DataKey, 'asc' | 'desc'>> = {
  name: 'asc',
  price: 'desc',
  sale_price: 'desc',
  cost: 'desc',
  created_at: 'desc',
  reference_code: 'asc',
  stock_quantity: 'desc',
};

export function ProductsTable({ initialProducts, serverModeDefault, initialTotalCount }: ProductsTableProps) {
  // Component implementation
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { canCreate, usage, loading: limitLoading } = usePlanLimits();

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [availableBrands, setAvailableBrands] = useState<BrandOption[]>([]);
  const [availableCategories, setAvailableCategories] = useState<
    { name: string }[]
  >([]);

  // Configurações da Tabela
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [columnOrder, setColumnOrder] = useState<DataKey[]>(
    DEFAULT_PREFS.columnOrder
  );
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<Set<DataKey>>(
    DEFAULT_PREFS.visibleKeys
  );
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(true);
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    onlyLaunch: false,
    onlyBestSeller: false,
    stockStatus: 'all',
    visibility: 'all',
    category: '',
    brand: [] as string[],
    color: '',
    // 'all' | 'optimized' | 'unoptimized'
    imageOptimization: 'all',
  });

  // Server-side filtering mode
  const [serverMode, setServerMode] = useState<boolean>(Boolean(serverModeDefault) || false);
  const [serverProducts, setServerProducts] = useState<Product[]>([]);
  const [serverMeta, setServerMeta] = useState<{
    totalCount?: number;
    totalPages?: number;
    page?: number;
  }>({ page: 1, totalCount: initialTotalCount });
  const [kpisState, setKpisState] = useState<{
    total: number;
    brands: number;
    launch: number;
    best: number;
  } | null>(null);
  const [serverLoading, setServerLoading] = useState(false);
  const fetchTimerRef = useRef<number | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [sortConfig, setSortConfig] = useState<{
    key: DataKey;
    direction: 'asc' | 'desc';
  } | null>(null);
  // Column widths for resizable columns
  const [columnWidths, setColumnWidths] = useState<Record<DataKey, number>>(
    () => {
      const defaults: Partial<Record<DataKey, number>> = {};
      Object.keys(ALL_DATA_COLUMNS).forEach((k) => {
        const key = k as DataKey;
        if (key === 'name') defaults[key] = 300;
        else if (key === 'image_url' || key === 'image_optimized')
          defaults[key] = 80;
        else if (key === 'price' || key === 'sale_price' || key === 'cost')
          defaults[key] = 120;
        else defaults[key] = 140;
      });
      return defaults as Record<DataKey, number>;
    }
  );
  const resizingRef = useRef<null | {
    key: DataKey;
    startX: number;
    startWidth: number;
  }>(null);

  // global mouse handlers for resizing
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const { key, startX, startWidth } = resizingRef.current;
      const delta = e.clientX - startX;
      const newWidth = Math.max(60, Math.round(startWidth + delta));
      setColumnWidths((prev) => ({ ...prev, [key]: newWidth }));
    };
    const onUp = () => {
      if (resizingRef.current) {
        resizingRef.current = null;
        document.body.style.userSelect = '';
        try {
          window.dispatchEvent(new CustomEvent('repvendas:colresizeend'));
        } catch (e) {
          // ignore
        }
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  // Fetch aggregate KPIs when in serverMode (shows totals across all products)
  useEffect(() => {
    if (!serverMode) {
      setKpisState(null);
      return;
    }
    if (!userId || userId === 'guest') return;

    let mounted = true;
    (async () => {
      try {
        const params = new URLSearchParams();
        params.set('userId', userId);
        params.set('aggregate', 'true');
        const res = await fetch(`/api/products?${params.toString()}`);
        if (!res.ok) return;
        const json = await res.json();
        if (mounted && json.aggregate) setKpisState(json.aggregate);
      } catch (e) {
        // ignore
      }
    })();

    return () => {
      mounted = false;
    };
    // only run when serverMode/userId changes
  }, [serverMode, userId]);

  // Seleção e Modais
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAllMatching, setSelectAllMatching] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfOptions, setPdfOptions] = useState({
    showPrices: true,
    priceType: 'sale_price' as 'price' | 'sale_price', // 'price' = custo, 'sale_price' = sugerido
    title: 'Catálogo de Produtos',
    imageZoom: 3,
    primaryColor: '#994314',
    coverCount: 1,
    selectedCoverIndex: 0,
    coverTemplate: 1,
  });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState({ progress: 0, message: '' });
  const [storeSettings, setStoreSettings] = useState<any>(null);

  const [textConfig, setTextConfig] = useState<{
    field: 'brand' | 'category' | '';
    value: string;
    label: string;
  }>({ field: '', value: '', label: '' });
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [preferSoftDelete, setPreferSoftDelete] = useState(false);
  const [deleteScope, setDeleteScope] = useState<'mine' | 'all'>('mine');
  const [typedConfirm, setTypedConfirm] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [priceConfig, setPriceConfig] = useState<{
    mode: 'fixed' | 'percentage';
    value: string;
  }>({ mode: 'fixed', value: '' });
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [viewIndex, setViewIndex] = useState(0);
  const [viewImageFailed, setViewImageFailed] = useState(false);
  useEffect(() => {
    // Reset image failure and index when changing viewed product or index
    setViewImageFailed(false);
    if (viewProduct) {
      setViewIndex(0);
    }
  }, [viewProduct?.id, viewIndex]);
  const touchStartX = useRef<number | null>(null);
  const touchMoved = useRef<boolean>(false);

  const logError = (...args: unknown[]) => {
    if (typeof console !== 'undefined' && console.error) console.error(...args);
  };

  // Retorna href seguro para editar o produto.
  // Para evitar 404s ocasionais por slugs inválidos, usamos o `id` como fonte
  // de verdade — a rota de edição aceita tanto `slug` quanto `id`.
  const getProductHref = (p: Product) => {
    return `/dashboard/products/${encodeURIComponent(p.id)}`;
  };

  // --- EFEITOS & PERSISTÊNCIA ---
  useEffect(() => {
    const getUserId = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user ? user.id : 'guest');
      setIsAuthReady(true);
    };
    getUserId();
  }, [supabase]);

  // Escuta evento global para abrir o modal de PDF (compatibilidade com triggers antigos)
  useEffect(() => {
    const handler = () => setShowPdfModal(true);
    window.addEventListener(
      'repvendas:openCatalogPdf',
      handler as EventListener
    );
    return () => {
      window.removeEventListener(
        'repvendas:openCatalogPdf',
        handler as EventListener
      );
    };
  }, []);

  // Fetch user role for UI decisions (e.g. allow global delete)
  useEffect(() => {
    const getRole = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        setUserRole(profile?.role || null);
      } catch (e) {
        // ignore
      }
    };
    getRole();
  }, [supabase]);

  // Fetch store settings for ExportModal defaults
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        setStoreSettings(data || null);
      } catch (e) {
        // ignore
      }
    };
    fetchSettings();
  }, [supabase, isAuthReady]);

  const persistRemoteRow = useCallback(
    async (r: SupabasePrefRow) => {
      try {
        const { error } = await supabase
          .from(PREFS_TABLE_NAME)
          .upsert([r], { onConflict: 'user_id,app_id,table_key' });
        if (error) {
          logError('persistRemoteRow error', error);
          return false;
        }
        return true;
      } catch (ex) {
        logError('persistRemoteRow ex', ex);
        return false;
      }
    },
    [supabase]
  );

  const savePreferences = useCallback(
    async (
      order: DataKey[],
      visible: Set<DataKey>,
      widths?: Record<DataKey, number> | null
    ) => {
      if (!userId || userId === 'guest') return;
      const row: SupabasePrefRow = {
        user_id: userId,
        app_id: APP_ID,
        table_key: PREFS_TABLE_KEY,
        column_order: order,
        visible_keys: Array.from(visible),
        column_widths: widths || null,
      };
      await persistRemoteRow(row);
    },
    [persistRemoteRow, userId]
  );

  // Persist column widths when resizing ends
  useEffect(() => {
    const handler = () => {
      // debounce small delay to ensure state updated
      setTimeout(() => {
        savePreferences(columnOrder, visibleColumnKeys, columnWidths);
      }, 50);
    };
    window.addEventListener('repvendas:colresizeend', handler as EventListener);
    return () =>
      window.removeEventListener(
        'repvendas:colresizeend',
        handler as EventListener
      );
  }, [savePreferences, columnOrder, visibleColumnKeys, columnWidths]);

  useEffect(() => {
    if (!supabase || !isAuthReady || !userId || userId === 'guest') {
      setIsLoadingPrefs(false);
      return;
    }
    supabase
      .from(PREFS_TABLE_NAME)
      .select('column_order, visible_keys, column_widths')
      .eq('user_id', userId)
      .eq('table_key', PREFS_TABLE_KEY)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const loadedOrder = (data.column_order as DataKey[]).filter(
            (key) => ALL_DATA_COLUMNS[key]
          );
          const loadedVisible = new Set(
            (data.visible_keys as DataKey[]).filter(
              (key) => ALL_DATA_COLUMNS[key]
            )
          );
          // load widths if present
          if (data.column_widths) {
            try {
              const widths = data.column_widths as Record<string, number>;
              const normalized: Partial<Record<DataKey, number>> = {};
              Object.keys(widths).forEach((k) => {
                if (ALL_DATA_COLUMNS[k as DataKey]) {
                  normalized[k as DataKey] = Number(widths[k]) || 0;
                }
              });
              setColumnWidths(
                (prev) =>
                  ({ ...prev, ...normalized }) as Record<DataKey, number>
              );
            } catch (err) {
              // ignore parse errors
            }
          }
          const missing = DEFAULT_PREFS.columnOrder.filter(
            (key) => !loadedOrder.includes(key)
          );
          setColumnOrder([...loadedOrder, ...missing]);
          setVisibleColumnKeys(loadedVisible);
        } else {
          setColumnOrder(DEFAULT_PREFS.columnOrder);
          setVisibleColumnKeys(DEFAULT_PREFS.visibleKeys);
        }
        setIsLoadingPrefs(false);
      });
  }, [supabase, isAuthReady, userId]);

  // --- FETCH OPÇÕES ---
  useEffect(() => {
    const fetchOptions = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: prods } = await supabase
        .from('products')
        .select('brand, category')
        .eq('user_id', user.id);
      const brands = Array.from(
        new Set(prods?.map((p) => p.brand).filter(Boolean) || [])
      ).sort();
      const cats = Array.from(
        new Set(prods?.map((p) => p.category).filter(Boolean) || [])
      ).sort();

      if (brands.length > 0) {
        const { data: brandData } = await supabase
          .from('brands')
          .select('name, logo_url')
          .in('name', brands);
        const map: any = {};
        brandData?.forEach((b: any) => (map[b.name] = b.logo_url));
        setAvailableBrands(
          brands.map((b: string) => ({ name: b, logo_url: map[b] || null }))
        );
      }
      setAvailableCategories(
        (cats as string[]).map((c) => ({ name: String(c) }))
      );
    };
    fetchOptions();
  }, [supabase]);

  // --- SERVER-SIDE FETCH (quando serverMode=true) ---
  useEffect(() => {
    if (!serverMode) return;
    if (!userId || userId === 'guest') return;

    const doFetch = async (page = currentPage) => {
      setServerLoading(true);
      try {
        const params = new URLSearchParams();
        if (userId) params.set('userId', userId);
        params.set('page', String(page));
        params.set('limit', String(itemsPerPage));
        if (searchTerm) params.set('search', searchTerm);
        if (filters.minPrice) params.set('minPrice', String(filters.minPrice));
        if (filters.maxPrice) params.set('maxPrice', String(filters.maxPrice));
        if (filters.brand && filters.brand.length > 0)
          params.set('brand', String(filters.brand[0]));
        if (filters.imageOptimization && filters.imageOptimization !== 'all')
          params.set('imageOptimization', String(filters.imageOptimization));
        // Ordenação no modo servidor: envia chave e direção
        if (sortConfig) {
          params.set('sortKey', String(sortConfig.key));
          params.set('sortDir', sortConfig.direction);
        }

        const res = await fetch(`/api/products?${params.toString()}`);
        if (!res.ok) {
          let body = null;
          try {
            body = await res.json();
          } catch (_err) {
            try {
              body = await res.text();
            } catch (_e) {
              body = null;
            }
          }
          console.error('[api/products] response error', res.status, body);
          throw new Error('Erro ao buscar produtos');
        }
        const json = await res.json();
        let serverData = json.data || [];
        // se o filtro de otimização de imagem estiver ativo, aplique uma filtragem adicional
        if (filters.imageOptimization && filters.imageOptimization !== 'all') {
          const filtered = (serverData as any[]).filter((p) => {
            const hasStorageImage = Boolean(
              p.image_path ||
              (typeof p.image_url === 'string' &&
                p.image_url.includes('supabase.co/storage')) ||
              (typeof p.external_image_url === 'string' &&
                p.external_image_url.includes('supabase.co/storage')) ||
              (p.images &&
                Array.isArray(p.images) &&
                p.images.some((i: any) =>
                  typeof i === 'string'
                    ? i.includes('supabase.co/storage')
                    : i && typeof i.url === 'string'
                      ? i.url.includes('supabase.co/storage')
                      : false
                ))
            );
            if (filters.imageOptimization === 'optimized')
              return hasStorageImage;
            if (filters.imageOptimization === 'unoptimized')
              return !hasStorageImage;
            return true;
          });
          serverData = filtered;
        }
        setServerProducts(serverData);
        setServerMeta(json.meta || {});
      } catch (e) {
        console.error('server fetch error', e);
      } finally {
        setServerLoading(false);
      }
    };

    // debounce
    if (fetchTimerRef.current) window.clearTimeout(fetchTimerRef.current);
    // @ts-ignore
    fetchTimerRef.current = window.setTimeout(() => doFetch(currentPage), 350);

    return () => {
      if (fetchTimerRef.current) window.clearTimeout(fetchTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    serverMode,
    userId,
    currentPage,
    searchTerm,
    filters.minPrice,
    filters.maxPrice,
    filters.brand,
    filters.imageOptimization,
    sortConfig,
  ]);

  // Manual refresh helper (usado pelo botão 'Tentar novamente' na UI caso a página não carregue)
  const refreshServerPage = async (page = currentPage) => {
    if (!userId || userId === 'guest') return;
    setServerLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('userId', userId);
      params.set('page', String(page));
      params.set('limit', String(itemsPerPage));
      if (searchTerm) params.set('search', searchTerm);
      if (filters.minPrice) params.set('minPrice', String(filters.minPrice));
      if (filters.maxPrice) params.set('maxPrice', String(filters.maxPrice));
      if (filters.brand && filters.brand.length > 0)
        params.set('brand', String(filters.brand[0]));
      if (filters.imageOptimization && filters.imageOptimization !== 'all')
        params.set('imageOptimization', String(filters.imageOptimization));
      if (sortConfig) {
        params.set('sortKey', String(sortConfig.key));
        params.set('sortDir', sortConfig.direction);
      }

      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) {
        let body = null;
        try {
          body = await res.json();
        } catch (_err) {
          try {
            body = await res.text();
          } catch (_e) {
            body = null;
          }
        }
        console.error('[api/products] refresh response error', res.status, body);
        throw new Error('Erro ao buscar produtos');
      }
      const json = await res.json();
      setServerProducts(json.data || []);
      setServerMeta(json.meta || {});
    } catch (e) {
      console.error('refreshServerPage error', e);
    } finally {
      setServerLoading(false);
    }
  };

  // --- MANIPULAÇÃO DE COLUNAS ---
  const toggleColumn = (key: DataKey) => {
    const newVisible = new Set(visibleColumnKeys);
    if (newVisible.has(key)) newVisible.delete(key);
    else newVisible.add(key);
    setVisibleColumnKeys(newVisible);
    savePreferences(columnOrder, newVisible, columnWidths);
  };

  const moveColumn = (key: DataKey, dir: 'up' | 'down') => {
    const idx = columnOrder.indexOf(key);
    if (idx === -1) return;
    let newIdx = idx;
    if (dir === 'up' && idx > 0) newIdx = idx - 1;
    else if (dir === 'down' && idx < columnOrder.length - 1) newIdx = idx + 1;
    else return;
    const newOrder = [...columnOrder];
    [newOrder[idx], newOrder[newIdx]] = [newOrder[newIdx], newOrder[idx]];
    setColumnOrder(newOrder);
    savePreferences(newOrder, visibleColumnKeys, columnWidths);
  };

  // --- COMPONENTE DROPDOWN DE COLUNAS ---
  const ColumnSelectorDropdown = () => {
    const dropdownRef = useRef<any>(null);
    useEffect(() => {
      const handleClickOutside = (e: any) => {
        if (
          isColumnDropdownOpen &&
          dropdownRef.current &&
          !dropdownRef.current.contains(e.target)
        ) {
          setIsColumnDropdownOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }, [isColumnDropdownOpen]);

    return (
      <div className="relative inline-block text-left" ref={dropdownRef}>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          aria-expanded={isColumnDropdownOpen}
          onClick={() => setIsColumnDropdownOpen(!isColumnDropdownOpen)}
          className={`${isColumnDropdownOpen ? 'ring-2 ring-[var(--primary)]' : ''} px-3`}
        >
          <ListOrdered size={16} /> <span className="inline">Colunas</span>
        </Button>
        {isColumnDropdownOpen && (
          <div className="absolute mt-2 left-2 right-2 sm:left-auto sm:right-0 w-auto sm:w-72 mx-auto sm:mx-0 max-w-[calc(100vw-1rem)] sm:max-w-none rounded-lg shadow-xl bg-white dark:bg-slate-900 ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 dark:divide-slate-800 z-50 max-h-96 overflow-y-auto border border-gray-200 dark:border-slate-800">
            <div className="p-2">
              <div className="flex items-center justify-between px-2 mb-2">
                <p className="text-xs text-gray-500 dark:text-slate-400 font-semibold">
                  Mostrar/Ocultar
                </p>
                <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={columnOrder
                      .filter((k) => ALL_DATA_COLUMNS[k])
                      .every((k) => visibleColumnKeys.has(k))}
                    onChange={(e) => {
                      const allKeys = columnOrder.filter(
                        (k) => ALL_DATA_COLUMNS[k]
                      );
                      if (e.target.checked) {
                        const newSet = new Set<DataKey>(allKeys);
                        setVisibleColumnKeys(newSet);
                        savePreferences(columnOrder, newSet, columnWidths);
                      } else {
                        const newSet = new Set<DataKey>();
                        setVisibleColumnKeys(newSet);
                        savePreferences(columnOrder, newSet, columnWidths);
                      }
                    }}
                    className="h-4 w-4 text-primary rounded border-gray-300 dark:border-slate-600 dark:bg-slate-800 focus:ring-primary"
                  />
                  Selecionar todos
                </label>
              </div>
              {columnOrder.map((key, index) => {
                const def = ALL_DATA_COLUMNS[key];
                const isChecked = visibleColumnKeys.has(key);
                const isFirst = index === 0;
                const isLast = index === columnOrder.length - 1;
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                  >
                    <div className="flex items-center min-w-0 flex-1">
                      <input
                        id={`col-${key}`}
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleColumn(key)}
                        className="h-4 w-4 text-primary rounded border-gray-300 dark:border-slate-600 dark:bg-slate-800 focus:ring-primary"
                      />
                      <label
                        htmlFor={`col-${key}`}
                        className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                      >
                        {def ? def.title : key}
                      </label>
                    </div>
                    <div className="flex items-center space-x-1 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveColumn(key, 'up');
                        }}
                        disabled={isFirst || !isChecked}
                        className="p-1 rounded-full text-primary dark:text-primary/70 disabled:opacity-30 hover:bg-primary/10 dark:hover:bg-primary/20"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveColumn(key, 'down');
                        }}
                        disabled={isLast || !isChecked}
                        className="p-1 rounded-full text-primary dark:text-primary/70 disabled:opacity-30 hover:bg-primary/10 dark:hover:bg-primary/20"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const SortSelectorDropdown = () => {
    const ref = useRef<any>(null);
    useEffect(() => {
      const handleClickOutside = (e: any) => {
        if (
          isSortDropdownOpen &&
          ref.current &&
          !ref.current.contains(e.target)
        ) {
          setIsSortDropdownOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }, [isSortDropdownOpen]);

    const sortable = Object.values(ALL_DATA_COLUMNS).filter(
      (c) => c.isSortable
    );

    return (
      <div className="relative inline-block text-left" ref={ref}>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          aria-expanded={isSortDropdownOpen}
          onClick={() => setIsSortDropdownOpen((s) => !s)}
          className={`${isSortDropdownOpen ? 'ring-2 ring-[var(--primary)]' : ''} px-3`}
        >
          <ArrowUpDown size={16} /> <span className="inline">Ordenar</span>
        </Button>

        {isSortDropdownOpen && (
          <div className="absolute mt-2 left-2 right-2 sm:left-auto sm:right-0 w-auto sm:w-56 max-w-[calc(100vw-1rem)] rounded-lg shadow-xl bg-white dark:bg-slate-900 ring-1 ring-black ring-opacity-5 z-50 border border-gray-200 dark:border-slate-800">
            <div className="p-2">
              <div className="flex items-center justify-between px-2 mb-2">
                <p className="text-xs text-gray-500 dark:text-slate-400 font-semibold">
                  Ordenar por
                </p>
                <button
                  onClick={() => setSortConfig(null)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Limpar
                </button>
              </div>
              {sortable.map((col) => (
                <button
                  key={col.key}
                  onClick={() => {
                    // se já estiver ordenando por essa chave, alterna direção
                    if (sortConfig && sortConfig.key === col.key) {
                      setSortConfig({
                        key: col.key,
                        direction:
                          sortConfig.direction === 'asc' ? 'desc' : 'asc',
                      });
                    } else {
                      const dir =
                        (DEFAULT_SORT_DIRECTION as any)[col.key] || 'asc';
                      setSortConfig({ key: col.key, direction: dir });
                    }
                    setIsSortDropdownOpen(false);
                  }}
                  className="w-full text-left p-2 rounded hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center justify-between"
                >
                  <span className="text-sm text-gray-700 dark:text-slate-300">
                    {col.title}
                  </span>
                  <span className="text-xs text-gray-500">
                    {sortConfig && sortConfig.key === col.key ? (
                      sortConfig.direction === 'asc' ? (
                        <ArrowUp size={12} />
                      ) : (
                        <ArrowDown size={12} />
                      )
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- FILTRAGEM ---
  const visibleAndOrderedColumns = useMemo(
    () =>
      columnOrder
        .filter((key) => visibleColumnKeys.has(key))
        .map((key) => ALL_DATA_COLUMNS[key])
        .filter((c): c is ColumnDefinition => !!c),
    [columnOrder, visibleColumnKeys]
  );

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const processedProducts = useMemo(() => {
    if (serverMode) return serverProducts;
    const data = products.filter((p) => {
      const search = (searchTerm || '').trim();

      // Se não houver termo, passa direto
      if (search) {
        const norm = normalize(search);
        const tokens = norm.split(' ').filter(Boolean);

        // Campos onde procuramos por correspondência
        const haystack = [
          p.name || '',
          p.reference_code || '',
          p.sku || '',
          p.barcode || '',
          p.brand || '',
          p.category || '',
          p.description || '',
        ]
          .map((f) => (f ? normalize(String(f)) : ''))
          .join(' ');

        // Verifica se todos os tokens aparecem em algum lugar (AND search)
        const matchesSearch = tokens.every((t) => haystack.includes(t));
        if (!matchesSearch) return false;
      }
      if (filters.onlyLaunch && !p.is_launch) return false;
      if (filters.onlyBestSeller && !p.is_best_seller) return false;
      if (
        filters.category &&
        !p.category?.toLowerCase().includes(filters.category.toLowerCase())
      )
        return false;
      if (
        filters.brand.length > 0 &&
        (!p.brand || !filters.brand.includes(p.brand))
      )
        return false;
      if (filters.visibility === 'active' && p.is_active === false)
        return false;
      if (filters.visibility === 'inactive' && p.is_active !== false)
        return false;
      if (filters.stockStatus === 'out_of_stock' && (p.stock_quantity || 0) > 0)
        return false;
      if (filters.stockStatus === 'in_stock' && (p.stock_quantity || 0) <= 0)
        return false;

      const price = p.cost ?? p.price ?? 0;
      if (filters.minPrice && price < Number(filters.minPrice)) return false;
      if (filters.maxPrice && price > Number(filters.maxPrice)) return false;

      // Imagem otimizadas vs externas
      const hasStorageImage = Boolean(
        p.image_path ||
        (typeof p.image_url === 'string' &&
          p.image_url.includes('supabase.co/storage')) ||
        (typeof p.external_image_url === 'string' &&
          p.external_image_url.includes('supabase.co/storage')) ||
        (p.images &&
          Array.isArray(p.images) &&
          p.images.some((i: any) =>
            typeof i === 'string'
              ? i.includes('supabase.co/storage')
              : i && typeof i.url === 'string'
                ? i.url.includes('supabase.co/storage')
                : false
          ))
      );
      if (filters.imageOptimization === 'optimized' && !hasStorageImage)
        return false;
      if (filters.imageOptimization === 'unoptimized' && hasStorageImage)
        return false;

      return true;
    });

    if (sortConfig) {
      data.sort((a: any, b: any) => {
        if (a[sortConfig.key] < b[sortConfig.key])
          return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key])
          return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [products, searchTerm, filters, sortConfig, serverMode, serverProducts]);

  const totalPages = serverMode
    ? Math.max(1, serverMeta.totalPages || 1)
    : Math.max(1, Math.ceil(processedProducts.length / itemsPerPage));

  // If serverMode is active but the client-side serverProducts fetch returns
  // empty while we still have initial `products` (SSR payload), prefer the
  // initial `products` as a fallback so the UI doesn't show counts but an
  // empty table (common when impersonation is used server-side).
  const paginatedProducts = serverMode
    ? serverProducts && serverProducts.length > 0
      ? serverProducts
      : products
    : processedProducts.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      );

  const kpis = useMemo(() => {
    // If we fetched aggregate KPIs from the server, prefer them (they represent
    // totals across the whole catalog). Otherwise compute from the best available
    // client-side dataset.
    if (serverMode && kpisState) {
      return {
        total: kpisState.total,
        brands: kpisState.brands,
        launch: kpisState.launch,
        best: kpisState.best,
      };
    }

    const sourceForCounts = serverMode
      ? products && products.length > 0
        ? products
        : serverProducts && serverProducts.length > 0
        ? serverProducts
        : []
      : products;

    const active = sourceForCounts.filter((p) => p.is_active !== false);
    const totalCount = serverMode
      ? initialTotalCount ?? serverMeta?.totalCount ?? sourceForCounts.length
      : products.length;

    return {
      total: totalCount,
      brands: new Set(active.map((p) => p.brand).filter(Boolean)).size,
      launch: active.filter((p) => p.is_launch).length,
      best: active.filter((p) => p.is_best_seller).length,
    };
  }, [products, serverMode, serverProducts, serverMeta, initialTotalCount, kpisState]);

  // --- AÇÕES ---
  const toggleSelectOne = (id: string) => {
    setSelectAllMatching(false);
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedProducts.length) {
      setSelectedIds([]);
      setSelectAllMatching(false);
    } else {
      setSelectedIds(paginatedProducts.map((p) => p.id));
      setSelectAllMatching(false);
    }
  };

  const selectAllAcrossPages = () => {
    // Seleciona todos os produtos que batem com os filtros
    if (serverMode) {
      // buscar apenas IDs de todos os resultados no servidor
      const doFetchIds = async () => {
        try {
          const params = new URLSearchParams();
          if (userId) params.set('userId', userId);
          params.set('idsOnly', 'true');
          if (filters.imageOptimization && filters.imageOptimization !== 'all')
            params.set('imageOptimization', String(filters.imageOptimization));
          if (filters.minPrice)
            params.set('minPrice', String(filters.minPrice));
          if (filters.maxPrice)
            params.set('maxPrice', String(filters.maxPrice));
          if (filters.brand && filters.brand.length > 0)
            params.set('brand', String(filters.brand[0]));

          const res = await fetch(`/api/products?${params.toString()}`);
          if (!res.ok) throw new Error('Erro ao buscar produtos');
          const json = await res.json();
          const ids = (json.data || []).map((d: any) => d.id);
          setSelectedIds(ids);
          setSelectAllMatching(true);
        } catch (err) {
          console.error('Erro ao selecionar todos os IDs', err);
        }
      };
      doFetchIds();
    } else {
      setSelectedIds(processedProducts.map((p) => p.id));
      setSelectAllMatching(true);
    }
  };

  // tooltips visuais acionáveis por toque (mobile): chave = `${product.id}-${action}`
  const [visibleTooltips, setVisibleTooltips] = useState<
    Record<string, boolean>
  >({});
  const [duplicatingIds, setDuplicatingIds] = useState<string[]>([]);
  const [duplicateTargetId, setDuplicateTargetId] = useState<string | null>(null);

  const isDuplicating = (id: string) => duplicatingIds.includes(id);

  const handleDuplicate = async (productId: string) => {
    if (isDuplicating(productId)) return;
    setDuplicatingIds((s) => [...s, productId]);
    try {
      const res = await fetch('/api/products/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json?.error || 'Erro ao duplicar produto');
        return;
      }
      toast.success('Produto duplicado');
      // redirect to editor for new product
      router.push(`/dashboard/products/${encodeURIComponent(json.newId)}`);
    } catch (e: any) {
      console.error('duplicate error', e);
      toast.error(e?.message || 'Erro ao duplicar produto');
    } finally {
      setDuplicatingIds((s) => s.filter((i) => i !== productId));
    }
  };
  const showTooltip = (key: string) => {
    setVisibleTooltips((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setVisibleTooltips((prev) => ({ ...prev, [key]: false }));
    }, 2000);
  };

  const handleBulkUpdate = async (field: string, value: any) => {
    setIsProcessing(true);
    try {
      await bulkUpdateFields(selectedIds, { [field]: value });
      setProducts((prev) =>
        prev.map((p) =>
          selectedIds.includes(p.id) ? { ...p, [field]: value } : p
        )
      );
      toast.success('Atualizado!');
      setSelectedIds([]);
    } catch {
      toast.error('Erro ao atualizar');
    }
    setIsProcessing(false);
  };

  const handleBulkTextUpdate = async () => {
    if (!textConfig.field) return;
    setIsProcessing(true);
    try {
      await bulkUpdateFields(selectedIds, {
        [textConfig.field]: textConfig.value,
      });
      setProducts((prev) =>
        prev.map((p) =>
          selectedIds.includes(p.id)
            ? { ...p, [textConfig.field]: textConfig.value }
            : p
        )
      );
      toast.success('Atualizado!');
      setShowTextModal(false);
      setSelectedIds([]);
    } catch {
      toast.error('Erro');
    }
    setIsProcessing(false);
  };

  const handleBulkPriceUpdate = async () => {
    setIsProcessing(true);
    try {
      await bulkUpdatePrice(
        selectedIds,
        priceConfig.mode,
        Number(priceConfig.value)
      );
      toast.success('Preços atualizados! Recarregando...');
      window.location.reload();
    } catch {
      toast.error('Erro');
      setIsProcessing(false);
    }
  };

  // Toggles para ações em massa (usa o primeiro produto selecionado como referência)
  const toggleIsLaunch = () => {
    const ref = products.find((p) => p.id === selectedIds[0]);
    const current = ref ? Boolean(ref.is_launch) : false;
    handleBulkUpdate('is_launch', !current);
  };

  const toggleIsBestSeller = () => {
    const ref = products.find((p) => p.id === selectedIds[0]);
    const current = ref ? Boolean(ref.is_best_seller) : false;
    handleBulkUpdate('is_best_seller', !current);
  };

  const toggleIsActive = () => {
    const ref = products.find((p) => p.id === selectedIds[0]);
    const current = ref ? Boolean(ref.is_active) : true;
    handleBulkUpdate('is_active', !current);
  };

  const executeDelete = async (forceSoft = false) => {
    setIsProcessing(true);
    try {
      const ids = deleteTargetId ? [deleteTargetId] : selectedIds;
      const res: any = await bulkDelete(ids, {
        preferSoft: forceSoft || preferSoftDelete,
        scope: deleteScope,
      });
      setProducts((prev) =>
        prev
          .map((p) =>
            res?.softDeletedIds?.includes(p.id) ? { ...p, is_active: false } : p
          )
          .filter((p) => !res?.deletedIds?.includes(p.id))
      );
      toast.success(
        `${res?.deletedIds?.length || 0} excluídos, ${res?.softDeletedIds?.length || 0} inativados`
      );
      setSelectedIds([]);
      setShowDeleteModal(false);
    } catch (e: any) {
      toast.error(e.message);
    }
    setIsProcessing(false);
    setDeleteTargetId(null);
  };

  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      let productsToPrint = [];
      if (selectedIds.length > 0) {
        // If we don't have all selected product objects locally, fetch them from the server
        const localIds = new Set(products.map((p) => p.id));
        const missingIds = selectedIds.filter((id) => !localIds.has(id));
        if (missingIds.length > 0) {
          try {
            const params = new URLSearchParams();
            params.set('userId', userId || '');
            params.set('ids', selectedIds.join(','));
            const res = await fetch(`/api/products?${params.toString()}`);
            if (!res.ok) throw new Error('Erro ao buscar produtos para PDF');
            const json = await res.json();
            productsToPrint = json.data || [];
          } catch (err) {
            console.error('Falha ao buscar produtos completos:', err);
            // fallback: use whatever we have locally
            productsToPrint = products.filter((p) =>
              selectedIds.includes(p.id)
            );
          }
        } else {
          productsToPrint = products.filter((p) => selectedIds.includes(p.id));
        }
      } else {
        productsToPrint = processedProducts;
      }

      if (productsToPrint.length === 0)
        throw new Error('Nenhum produto para gerar PDF');

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: settings } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      const brandMap: any = {};
      availableBrands.forEach((b) => (brandMap[b.name] = b.logo_url));

      // Obtém cor secundária do sistema
      let secondaryColor = '#0d1b2c'; // Fallback padrão
      if (typeof window !== 'undefined') {
        const root = document.documentElement;
        secondaryColor =
          root.style.getPropertyValue('--secondary').trim() ||
          getComputedStyle(root).getPropertyValue('--secondary').trim() ||
          '#0d1b2c';
      }

      // determine coverImageUrl from pdfOptions.selectedCoverIndex and availableBrands
      const brandCandidates = availableBrands
        .map((b) => b.logo_url)
        .filter(Boolean) as string[];
      const chosenCover =
        brandCandidates[pdfOptions.selectedCoverIndex] || undefined;

      // Determine primary brand name from selected products (most frequent)
      const brandCounts: Record<string, number> = {};
      productsToPrint.forEach((p: any) => {
        if (p.brand) brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
      });
      const primaryBrandName = Object.keys(brandCounts).length
        ? Object.entries(brandCounts).sort((a, b) => b[1] - a[1])[0][0]
        : undefined;

      await generateCatalogPDF(productsToPrint, {
        showPrices: pdfOptions.showPrices,
        priceType: pdfOptions.priceType,
        title: pdfOptions.title,
        storeName: settings?.name || 'Catálogo',
        storeLogo: settings?.logo_url,
        imageZoom: pdfOptions.imageZoom,
        brandMapping: brandMap,
        primaryBrandName,
        coverImageUrl: chosenCover,
        coverTemplate: pdfOptions.coverTemplate,
        secondaryColor: secondaryColor,
        primaryColor: pdfOptions.primaryColor,
        onProgress: (progress: number, message: string) => {
          setPdfProgress({ progress, message });
        },
      });

      toast.success('PDF Gerado com sucesso!');
      setShowPdfModal(false);
      setPdfProgress({ progress: 0, message: '' });
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao gerar PDF', { description: error.message });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // --- RENDERERS ---
  const SortableHeader = ({ label, sortKey, align }: any) => (
    <th
      className={`relative px-4 py-3 font-medium hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`}
      style={
        (columnWidths as any)[sortKey]
          ? { width: (columnWidths as any)[sortKey] }
          : undefined
      }
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          if (!resizingRef.current) {
            setSortConfig({
              key: sortKey,
              direction:
                sortConfig &&
                sortConfig.key === sortKey &&
                sortConfig.direction === 'asc'
                  ? 'desc'
                  : 'asc',
            });
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            setSortConfig({
              key: sortKey,
              direction:
                sortConfig &&
                sortConfig.key === sortKey &&
                sortConfig.direction === 'asc'
                  ? 'desc'
                  : 'asc',
            });
          }
        }}
        className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'} cursor-pointer`}
      >
        {label} <ArrowUpDown size={12} className="opacity-50" />
      </div>
      {/* Resizer handle (larger hit area) */}
      <div
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          const startX = (e as any).clientX;
          resizingRef.current = {
            key: sortKey,
            startX,
            startWidth: (columnWidths as any)[sortKey] || 150,
          };
          document.body.style.userSelect = 'none';
        }}
        onDoubleClick={() => {
          // reset width to default (undefined -> uses initial state/default)
          setColumnWidths((prev) => {
            const next = { ...prev } as any;
            delete next[sortKey];
            return next;
          });
        }}
        className="absolute right-0 top-0 h-full w-6 -mr-3 cursor-col-resize"
      />
    </th>
  );

  const renderCell = (product: Product, key: DataKey) => {
    const val = (product as any)[key];
    // Helper para determinar se o produto possui imagem no Storage (otimizada)
    const hasStorageImage = Boolean(
      product.image_path ||
      (typeof product.image_url === 'string' &&
        product.image_url.includes('supabase.co/storage')) ||
      (typeof product.external_image_url === 'string' &&
        product.external_image_url.includes('supabase.co/storage')) ||
      (product.images &&
        Array.isArray(product.images) &&
        product.images.some((i: any) =>
          typeof i === 'string'
            ? i.includes('supabase.co/storage')
            : i && typeof i.url === 'string'
              ? i.url.includes('supabase.co/storage')
              : false
        ))
    );
    if (key === 'name')
      return (
        <div className="flex items-center gap-3 min-w-[200px]">
          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-slate-800 relative overflow-hidden flex-shrink-0 border border-gray-200 dark:border-slate-700">
            {(() => {
              // Usa `product.thumbnail` se disponível (preparado em server page),
              // senão tenta `image_variants` e por último `getProductImageUrl`.
              let thumbnailSrc: string | undefined = undefined;

              if ((product as any).thumbnail) {
                thumbnailSrc = (product as any).thumbnail;
              } else if (
                product.image_variants &&
                Array.isArray(product.image_variants)
              ) {
                const smallVariant =
                  product.image_variants.find((v: any) => v.size === 480) ||
                  product.image_variants[0];
                const variantPath = smallVariant.path || (smallVariant as any).storage_path || null;
                if (variantPath) thumbnailSrc = formatImageUrl(variantPath);
              } else {
                const { src, isExternal } = getProductImageUrl(product as any);
                thumbnailSrc = src || undefined;

                if (isExternal && src) {
                  return (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  );
                }
              }

              if (thumbnailSrc) {
                return (
                  <Image
                    src={thumbnailSrc}
                    alt=""
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                );
              }

              return (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon size={16} className="text-gray-400" />
                </div>
              );
            })()}
          </div>
          <div className="min-w-0">
            <div
              onClick={() => setViewProduct(product)}
              className="font-medium text-gray-900 dark:text-white truncate cursor-pointer hover:text-[var(--primary)] transition-colors"
            >
              {product.name}
            </div>
            <div className="text-xs text-gray-500 dark:text-slate-400 truncate">
              {product.brand || '-'}
            </div>
          </div>
        </div>
      );
    if (key === 'barcode') {
      const raw = String(val ?? '');
      const isValid = /^[0-9]{7,13}$/.test(raw); // Validação EAN-8/13 (mesma do componente Barcode)
      return (
        <div className="flex items-center">
          {isValid ? (
            <div className="flex-shrink-0">
              <ProductBarcode value={raw} height={36} showNumber={true} />
            </div>
          ) : (
            <span className="text-xs text-gray-500 font-mono">
              {raw || '-'}
            </span>
          )}
        </div>
      );
    }
    if (key === 'reference_code' || key === 'sku')
      return (
        <span className="font-mono text-xs text-gray-600 dark:text-slate-400">
          {String(val ?? '-')}
        </span>
      );
    if (key === 'price' || key === 'cost' || key === 'sale_price')
      return (
        <div className="font-medium text-gray-900 dark:text-slate-200">
          {val
            ? new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(Number(val))
            : '-'}
        </div>
      );
    if (key === 'is_active')
      return (
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold ${val === false ? 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}
        >
          {val === false ? 'Inativo' : 'Ativo'}
        </span>
      );
    if (key === 'is_launch')
      return val ? <Zap size={16} className="text-purple-500 mx-auto" /> : '-';
    if (key === 'is_best_seller')
      return val ? <Star size={16} className="text-orange-500 mx-auto" /> : '-';
    if (key === 'stock_quantity')
      return (
        <div className="text-sm font-medium text-gray-900 dark:text-slate-200 text-right">
          {val !== undefined && val !== null ? val : '-'}
        </div>
      );

    if (key === 'image_optimized') {
      return (
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
              hasStorageImage
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
            title={
              hasStorageImage
                ? 'Imagem internalizada (Storage)'
                : 'Imagem externa (não otimizada)'
            }
          >
            {hasStorageImage ? 'Otimiz.' : 'Externa'}
          </span>
        </div>
      );
    }
    return (
      <span className="text-gray-600 dark:text-slate-400 text-sm truncate block max-w-[150px]">
        {String(val ?? '-')}
      </span>
    );
  };

  if (isLoadingPrefs)
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-[var(--primary)]" />
      </div>
    );

  return (
    <div className="space-y-6">
      {/* KPIS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total',
            val: kpis.total,
            icon: Package,
            color: 'text-gray-900 dark:text-white',
          },
          {
            label: 'Marcas',
            val: kpis.brands,
            icon: Briefcase,
            color: 'text-green-600 dark:text-green-400',
          },
          {
            label: 'Lançamentos',
            val: kpis.launch,
            icon: Zap,
            color: 'text-purple-600 dark:text-purple-400',
          },
          {
            label: 'Best Sellers',
            val: kpis.best,
            icon: Star,
            color: 'text-orange-500 dark:text-orange-400',
          },
        ].map((k, i) => {
          const isLaunch = k.label === 'Lançamentos';
          const isBest = k.label === 'Best Sellers';
          const active =
            (isLaunch && filters.onlyLaunch) ||
            (isBest && filters.onlyBestSeller);
          return (
            <button
              key={i}
              onClick={() => {
                // Toggle corresponding filter when KPI clicked
                if (isLaunch) {
                  setFilters((prev) => ({
                    ...prev,
                    onlyLaunch: !prev.onlyLaunch,
                  }));
                } else if (isBest) {
                  setFilters((prev) => ({
                    ...prev,
                    onlyBestSeller: !prev.onlyBestSeller,
                  }));
                }
                // reset to first page when applying KPI filter
                setCurrentPage(1);
              }}
              className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between text-left ${active ? 'border-[var(--primary)] bg-[var(--primary)]/10 dark:bg-[var(--primary)]/20' : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800'}`}
            >
              <span className="text-xs font-bold uppercase text-gray-500 dark:text-slate-400 flex items-center gap-2 mb-2">
                {(() => {
                  const Icon: any = k.icon;
                  return <Icon size={14} />;
                })()}{' '}
                {k.label}
              </span>
              <span className={`text-2xl font-bold ${k.color}`}>{k.val}</span>
            </button>
          );
        })}
      </div>

      {/* FILTROS E BUSCA */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex-1 flex flex-wrap md:flex-nowrap gap-2 items-center">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none dark:text-white min-w-0"
              />
            </div>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="secondary"
              size="sm"
              className={`${showFilters ? 'ring-2 ring-[var(--primary)]' : ''} px-3 flex items-center gap-2`}
            >
              <Filter size={16} /> Filtros
            </Button>

            {/* BOTÃO COLUNAS RESTAURADO */}
            <ColumnSelectorDropdown />

            {/* BOTÃO ORDENAR */}
            <SortSelectorDropdown />

            {sortConfig && (
              <div className="hidden sm:flex items-center gap-2 ml-2">
                <span className="px-3 py-1 rounded bg-gray-100 dark:bg-slate-800 text-sm text-gray-700 dark:text-slate-300">
                  Ordenado:{' '}
                  {ALL_DATA_COLUMNS[sortConfig.key]?.title || sortConfig.key}
                </span>
                <button
                  onClick={() =>
                    setSortConfig({
                      key: sortConfig.key,
                      direction:
                        sortConfig.direction === 'asc' ? 'desc' : 'asc',
                    })
                  }
                  className="p-2 border rounded bg-white dark:bg-slate-900"
                  title="Alternar direção"
                >
                  {sortConfig.direction === 'asc' ? (
                    <ArrowUp size={14} />
                  ) : (
                    <ArrowDown size={14} />
                  )}
                </button>
                <button
                  onClick={() => setSortConfig(null)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Limpar
                </button>
              </div>
            )}

            {/* BOTÃO PDF FIXO */}
            <Button
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent('repvendas:openCatalogPdf')
                )
              }
              variant="secondary"
              size="sm"
              className={`flex items-center gap-2 px-3`}
            >
              <FileText size={16} />{' '}
              <span className="hidden md:inline">PDF</span>
            </Button>
          </div>
        </div>

        {/* Painel de Filtros Expandido */}
        {showFilters && (
          <div className="pt-4 border-t border-gray-100 dark:border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-top-2">
            <div className="col-span-2 md:col-span-4 flex items-center justify-end gap-3">
              <label
                className="flex items-center gap-2 text-sm text-gray-600"
                title="Executa filtros, ordenação e paginação no servidor (recomendado para catálogos grandes). Pode devolver 0 resultados se RLS/impersonation ou filtros restritivos estiverem ativos."
              >
                <input
                  type="checkbox"
                  checked={serverMode}
                  onChange={(e) => setServerMode(e.target.checked)}
                />
                Buscar no servidor
              </label>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                Marca
              </label>
              <input
                list="brands"
                className="w-full p-2 text-sm border rounded bg-white dark:bg-slate-950 dark:border-slate-700 dark:text-white"
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    brand: e.target.value ? [e.target.value] : [],
                  })
                }
                placeholder="Todas"
              />
              <datalist id="brands">
                {availableBrands.map((b) => (
                  <option key={b.name} value={b.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                Faixa de Preço
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Mín"
                  value={filters.minPrice}
                  onChange={(e) =>
                    setFilters({ ...filters, minPrice: e.target.value })
                  }
                  className="w-1/2 p-2 text-sm border rounded bg-white dark:bg-slate-950 dark:border-slate-700 dark:text-white"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Máx"
                  value={filters.maxPrice}
                  onChange={(e) =>
                    setFilters({ ...filters, maxPrice: e.target.value })
                  }
                  className="w-1/2 p-2 text-sm border rounded bg-white dark:bg-slate-950 dark:border-slate-700 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                Categoria
              </label>
              <input
                list="categories"
                className="w-full p-2 text-sm border rounded bg-white dark:bg-slate-950 dark:border-slate-700 dark:text-white"
                onChange={(e) =>
                  setFilters({ ...filters, category: e.target.value })
                }
                placeholder="Todas"
              />
              <datalist id="categories">
                {availableCategories.map((c) => (
                  <option key={c.name} value={c.name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                Status
              </label>
              <select
                className="w-full p-2 text-sm border rounded bg-white dark:bg-slate-950 dark:border-slate-700 dark:text-white"
                onChange={(e) =>
                  setFilters({ ...filters, visibility: e.target.value })
                }
              >
                <option value="all">Todos</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                Estoque
              </label>
              <select
                className="w-full p-2 text-sm border rounded bg-white dark:bg-slate-950 dark:border-slate-700 dark:text-white"
                onChange={(e) =>
                  setFilters({ ...filters, stockStatus: e.target.value })
                }
              >
                <option value="all">Todos</option>
                <option value="in_stock">Em Estoque</option>
                <option value="out_of_stock">Esgotado</option>
              </select>
            </div>
            <div className="col-span-full flex items-center justify-between mt-2">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={filters.onlyLaunch}
                    onChange={(e) =>
                      setFilters({ ...filters, onlyLaunch: e.target.checked })
                    }
                    className="rounded text-[var(--primary)]"
                  />{' '}
                  Lançamentos
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={filters.onlyBestSeller}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        onlyBestSeller: e.target.checked,
                      })
                    }
                    className="rounded text-[var(--primary)]"
                  />{' '}
                  Best Sellers
                </label>
              </div>
              <div className="flex items-center gap-4">
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Imagem
                </label>
                <select
                  className="p-2 text-sm border rounded bg-white dark:bg-slate-950 dark:border-slate-700 dark:text-white"
                  value={filters.imageOptimization}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      imageOptimization: e.target.value,
                    })
                  }
                >
                  <option value="all">Todas</option>
                  <option value="optimized">Otimizadas (Storage)</option>
                  <option value="unoptimized">Não otimizadas (Externas)</option>
                </select>
              </div>
              <button
                onClick={() =>
                  setFilters({
                    minPrice: '',
                    maxPrice: '',
                    onlyLaunch: false,
                    onlyBestSeller: false,
                    brand: [],
                    category: '',
                    stockStatus: 'all',
                    visibility: 'all',
                    color: '',
                    imageOptimization: 'all',
                  })
                }
                className="text-xs text-red-500 hover:underline"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SELEÇÃO E AÇÕES EM MASSA (FLOATING BAR) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-4 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center gap-4 animate-in slide-in-from-bottom-6 max-w-[90vw] w-auto">
          <div className="flex items-center gap-2 border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-slate-700 pb-2 sm:pb-0 sm:pr-4">
            <span className="bg-[var(--primary)] text-white text-xs font-bold px-2 py-1 rounded-full">
              {selectedIds.length}
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
              Selecionados
            </span>
          </div>

          {/* Botões de Ação com Scroll Horizontal */}
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 no-scrollbar">
            <button
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent('repvendas:openCatalogPdf')
                )
              }
              className="flex flex-col items-center gap-1 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg min-w-[60px]"
            >
              <FileText size={18} className="text-orange-500" />{' '}
              <span className="text-[10px] text-gray-600 dark:text-slate-400">
                PDF
              </span>
            </button>
            <div className="w-px h-8 bg-gray-200 dark:bg-slate-700 mx-1 shrink-0"></div>
            <button
              type="button"
              onClick={() => {
                setTextConfig({ field: 'brand', value: '', label: 'Marca' });
                setShowTextModal(true);
              }}
              className="flex flex-col items-center gap-1 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg min-w-[60px]"
            >
              <Tag size={18} className="text-primary" />{' '}
              <span className="text-[10px] text-gray-600 dark:text-slate-400">
                Marca
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTextConfig({
                  field: 'category',
                  value: '',
                  label: 'Categoria',
                });
                setShowTextModal(true);
              }}
              className="flex flex-col items-center gap-1 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg min-w-[60px]"
            >
              <Layers size={18} className="text-purple-500" />{' '}
              <span className="text-[10px] text-gray-600 dark:text-slate-400">
                Cat.
              </span>
            </button>
            <button
              type="button"
              onClick={toggleIsLaunch}
              className="flex flex-col items-center gap-1 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg min-w-[60px]"
            >
              <Rocket
                size={18}
                className={
                  products.find((p) => p.id === selectedIds[0])?.is_launch
                    ? 'text-purple-600'
                    : 'text-gray-400'
                }
              />
              <span className="text-[10px] text-gray-600 dark:text-slate-400">
                Lanç./Rem.
              </span>
            </button>

            <button
              type="button"
              onClick={toggleIsBestSeller}
              className="flex flex-col items-center gap-1 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg min-w-[60px]"
            >
              <Star
                size={18}
                className={
                  products.find((p) => p.id === selectedIds[0])?.is_best_seller
                    ? 'text-orange-500'
                    : 'text-gray-400'
                }
              />
              <span className="text-[10px] text-gray-600 dark:text-slate-400">
                Top/Rem.
              </span>
            </button>

            <button
              onClick={toggleIsActive}
              className="flex flex-col items-center gap-1 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg min-w-[60px]"
            >
              {products.find((p) => p.id === selectedIds[0])?.is_active ===
              false ? (
                <EyeOff size={18} className="text-gray-400" />
              ) : (
                <Eye size={18} className="text-primary" />
              )}
              <span className="text-[10px] text-gray-600 dark:text-slate-400">
                Ativar/Rem.
              </span>
            </button>
            <button
              onClick={() => setShowPriceModal(true)}
              className="flex flex-col items-center gap-1 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg min-w-[60px]"
            >
              <DollarSign size={18} className="text-green-500" />{' '}
              <span className="text-[10px] text-gray-600 dark:text-slate-400">
                Preço de Custo
              </span>
            </button>
            <button
              onClick={() => {
                setDeleteTargetId(null);
                setShowDeleteModal(true);
              }}
              className="flex flex-col items-center gap-1 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg min-w-[60px]"
            >
              <Trash2 size={18} className="text-red-500" />{' '}
              <span className="text-[10px] text-red-600 dark:text-red-400">
                Excluir
              </span>
            </button>
          </div>
          <Button
            onClick={() => setSelectedIds([])}
            variant="ghost"
            size="sm"
            className="absolute -top-2 -right-2 rounded-full p-1 shadow-md"
          >
            <X size={14} />
          </Button>
        </div>
      )}

      {/* Barra informativa para seleção cross-page */}
      {selectedIds.length > 0 &&
        (() => {
          const totalMatching = serverMode
            ? serverMeta?.totalCount || serverProducts.length
            : processedProducts.length;
          return totalMatching > paginatedProducts.length && !selectAllMatching;
        })() && (
          <div className="bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-900 dark:text-blue-100 shadow-md mb-4 flex items-center justify-between">
            <div className="font-medium">
              Você selecionou{' '}
              <strong className="font-black">{selectedIds.length}</strong> nesta
              página. Deseja selecionar todos os{' '}
              <strong className="font-black">
                {serverMode
                  ? serverMeta?.totalCount || serverProducts.length
                  : processedProducts.length}
              </strong>{' '}
              resultados?
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={selectAllAcrossPages}
                variant="primary"
                size="sm"
                className="font-bold"
              >
                Selecionar todos (
                {serverMode
                  ? serverMeta?.totalCount || serverProducts.length
                  : processedProducts.length}
                )
              </Button>
              <Button
                onClick={() => {
                  setSelectedIds([]);
                  setSelectAllMatching(false);
                }}
                variant="outline"
                size="sm"
                className="font-bold"
              >
                Desmarcar
              </Button>
            </div>
          </div>
        )}

      {selectAllMatching && (
        <div className="bg-green-50 dark:bg-green-950/30 border-2 border-green-200 dark:border-green-800 rounded-lg p-4 text-sm text-green-900 dark:text-green-100 shadow-md mb-4 flex items-center justify-between">
          <div className="font-medium">
            ✓ Todos os{' '}
            <strong className="font-black">
              {serverMode
                ? serverMeta?.totalCount || serverProducts.length
                : processedProducts.length}
            </strong>{' '}
            resultados estão selecionados.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedIds([]);
                setSelectAllMatching(false);
              }}
              className="px-4 py-2 border-2 border-green-600 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/50 rounded-lg text-sm font-bold transition-colors"
            >
              Desmarcar todos
            </button>
          </div>
        </div>
      )}

      {/* PAGINAÇÃO (TOPO) */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 flex items-center justify-between text-sm text-gray-500 dark:text-slate-400">
        <div className="flex items-center gap-4">
          <span>
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              variant="outline"
              size="sm"
              className=""
            >
              Ant.
            </Button>
            <Button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              variant="outline"
              size="sm"
            >
              Prox.
            </Button>
            <Button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              variant="outline"
              size="sm"
            >
              Últ.
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Ir para página</label>
          <input
            type="number"
            min={1}
            max={totalPages}
            defaultValue={currentPage}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const v = Number((e.target as HTMLInputElement).value || 1);
                if (v >= 1 && v <= totalPages) setCurrentPage(v);
              }
            }}
            className="w-20 p-1 text-sm border rounded bg-white dark:bg-slate-800"
          />
          <Button
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              const parent = (e.target as HTMLElement)
                .previousElementSibling as HTMLInputElement | null;
              const v = parent ? Number(parent.value || 1) : 1;
              if (v >= 1 && v <= totalPages) setCurrentPage(v);
            }}
            variant="outline"
            size="sm"
          >
            Ir
          </Button>
        </div>
      </div>

      {/* TABELA RESPONSIVA */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Desktop: tabela tradicional */}
        <div className="hidden md:block w-full overflow-x-auto scrollbar-thin shadow-sm border border-gray-100 dark:border-slate-800 rounded-lg">
          <table
            className="w-full text-left text-sm border-collapse"
            style={{ minWidth: '1000px', tableLayout: 'fixed' as const }}
          >
            {/* colgroup mantém larguras controladas para redimensionamento */}
            <colgroup>
              <col style={{ width: '48px' }} />
              {visibleAndOrderedColumns.map((col) =>
                col ? (
                  <col
                    key={`col-${col.key}`}
                    style={{
                      width: columnWidths[col.key]
                        ? `${columnWidths[col.key]}px`
                        : undefined,
                    }}
                  />
                ) : null
              )}
              <col style={{ width: '100px' }} />
            </colgroup>
            <thead className="bg-gray-50 dark:bg-slate-950/50 border-b border-gray-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 w-10">
                  <button
                    onClick={toggleSelectAll}
                    className="text-gray-400 hover:text-[var(--primary)]"
                  >
                    {selectedIds.length > 0 &&
                    selectedIds.length === paginatedProducts.length ? (
                      <CheckSquare size={18} />
                    ) : (
                      <Square size={18} />
                    )}
                  </button>
                </th>
                {visibleAndOrderedColumns.map((col) =>
                  col ? (
                    <SortableHeader
                      key={col.key}
                      label={col.title}
                      sortKey={col.key}
                      align={col.align}
                    />
                  ) : null
                )}
                {/* COLUNA STICKY DE AÇÕES */}
                <th className="sticky right-0 z-20 bg-gray-50 dark:bg-slate-900 px-4 py-3 text-right font-medium text-gray-500 dark:text-slate-400 shadow-[-5px_0_5px_-5px_rgba(0,0,0,0.1)] w-[100px]">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {paginatedProducts.length === 0 ? (
                serverMode && (serverMeta?.totalCount || 0) > 0 ? (
                  <tr>
                    <td colSpan={100} className="p-12 text-center text-gray-500 dark:text-slate-400">
                      {serverLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="animate-spin" /> Carregando produtos...
                        </div>
                      ) : (
                        <div>
                          <p>Catálogo grande detectado ({serverMeta?.totalCount} itens) — nenhuma página carregada.</p>
                          <div className="mt-3 flex justify-center">
                            <Button size="sm" variant="outline" onClick={() => refreshServerPage(1)}>
                              Tentar novamente
                            </Button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td
                      colSpan={100}
                      className="p-12 text-center text-gray-500 dark:text-slate-400"
                    >
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                )
              ) : (
                paginatedProducts.map((product) => (
                  <tr
                    key={product.id}
                    className={`group hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors ${selectedIds.includes(product.id) ? 'bg-primary/10 dark:bg-primary/10' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleSelectOne(product.id)}
                        className={
                          selectedIds.includes(product.id)
                            ? 'text-[var(--primary)]'
                            : 'text-gray-300 dark:text-slate-600'
                        }
                      >
                        {selectedIds.includes(product.id) ? (
                          <CheckSquare size={18} />
                        ) : (
                          <Square size={18} />
                        )}
                      </button>
                    </td>
                    {visibleAndOrderedColumns.map((col) =>
                      col ? (
                        <td
                          key={col.key}
                          className={`px-4 py-3 text-gray-600 dark:text-slate-400 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                          style={
                            columnWidths[col.key]
                              ? { width: columnWidths[col.key] }
                              : undefined
                          }
                        >
                          {renderCell(product, col.key)}
                        </td>
                      ) : null
                    )}
                    {/* COLUNA STICKY DE AÇÕES (BODY) */}
                    <td className="sticky right-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-gray-50 dark:group-hover:bg-slate-800/50 px-2 py-3 text-right shadow-[-5px_0_5px_-5px_rgba(0,0,0,0.1)]">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={getProductHref(product)}
                          className="p-1.5 text-gray-400 hover:text-[var(--primary)] rounded-md transition-colors"
                        >
                          <Edit2 size={16} />
                        </Link>
                        <button
                          onClick={() => setDuplicateTargetId(product.id)}
                          disabled={isDuplicating(product.id)}
                          className="p-1.5 text-gray-400 hover:text-[var(--primary)] rounded-md transition-colors"
                          title="Duplicar"
                        >
                          {isDuplicating(product.id) ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Copy size={16} />
                          )}
                        </button>
                        <button
                          onClick={() => setViewProduct(product)}
                          className="p-1.5 text-gray-400 hover:text-primary rounded-md transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteTargetId(product.id);
                            setShowDeleteModal(true);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-md transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile: cards */}
        <div className="md:hidden p-4 grid grid-cols-1 gap-4">
          {paginatedProducts.length === 0 ? (
            serverMode && (serverMeta?.totalCount || 0) > 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800">
                {serverLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" /> Carregando produtos...
                  </div>
                ) : (
                  <div>
                    <p>Catálogo grande detectado ({serverMeta?.totalCount} itens) — nenhuma página carregada.</p>
                    <div className="mt-3 flex justify-center">
                      <Button size="sm" variant="outline" onClick={() => refreshServerPage(1)}>
                        Tentar novamente
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800">
                Nenhum produto encontrado.
              </div>
            )
          ) : (
            paginatedProducts.map((product) => (
              <div
                key={product.id}
                className={`p-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm ${selectedIds.includes(product.id) ? 'ring-2 ring-primary/30' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="h-16 w-16 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                    {product.image_path ||
                    product.image_url ||
                    product.external_image_url ? (
                      (() => {
                        const { src, isExternal } = getProductImageUrl(
                          product as any
                        );
                        if (src) {
                          if (isExternal) {
                            return (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={src}
                                alt=""
                                className="object-contain h-full w-full"
                                loading="lazy"
                                decoding="async"
                              />
                            );
                          }
                          return (
                            <img
                              src={src}
                              alt=""
                              className="object-contain h-full w-full"
                              loading="lazy"
                              decoding="async"
                            />
                          );
                        }
                        return (
                          <div className="text-gray-300">
                            <ImageIcon size={28} />
                          </div>
                        );
                      })()
                    ) : (
                      <div className="text-gray-300">
                        <ImageIcon size={28} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">
                          {product.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 truncate">
                          {product.brand ||
                            product.category ||
                            product.reference_code}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900 dark:text-white">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(product.price)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {product.stock_quantity ?? 0} em estoque
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <div
                        className="relative group"
                        onTouchStart={() => showTooltip(`${product.id}-select`)}
                      >
                        <button
                          onClick={() => toggleSelectOne(product.id)}
                          aria-pressed={selectedIds.includes(product.id)}
                          className="p-2 border rounded text-sm flex items-center justify-center"
                        >
                          {selectedIds.includes(product.id) ? (
                            <CheckSquare size={16} />
                          ) : (
                            <Square size={16} />
                          )}
                          <span className="sr-only">
                            {selectedIds.includes(product.id)
                              ? 'Selecionado'
                              : 'Selecionar'}
                          </span>
                        </button>
                        <span
                          className={`pointer-events-none absolute -top-9 left-1/2 transform -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 text-white text-xs px-2 py-1 transition-opacity ${
                            visibleTooltips[`${product.id}-select`]
                              ? 'opacity-100'
                              : 'opacity-0 group-hover:opacity-100 group-focus:opacity-100'
                          }`}
                        >
                          {selectedIds.includes(product.id)
                            ? 'Desmarcar'
                            : 'Selecionar'}
                        </span>
                      </div>

                      <div
                        className="relative group"
                        onTouchStart={() => showTooltip(`${product.id}-open`)}
                      >
                        <Link
                          href={getProductHref(product)}
                          className="p-2 rounded bg-[var(--primary)] text-white flex items-center justify-center"
                          aria-label="Editar"
                        >
                          <Edit2 size={16} />
                          <span className="sr-only">Editar</span>
                        </Link>
                        <span
                          className={`pointer-events-none absolute -top-9 left-1/2 transform -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 text-white text-xs px-2 py-1 transition-opacity ${
                            visibleTooltips[`${product.id}-open`]
                              ? 'opacity-100'
                              : 'opacity-0 group-hover:opacity-100 group-focus:opacity-100'
                          }`}
                        >
                          Editar
                        </span>
                      </div>

                      <div
                        className="relative group"
                        onTouchStart={() => showTooltip(`${product.id}-dup`)}
                      >
                        <button
                          onClick={() => setDuplicateTargetId(product.id)}
                          disabled={isDuplicating(product.id)}
                          className="p-2 border rounded text-sm flex items-center justify-center"
                          aria-label="Duplicar"
                        >
                          {isDuplicating(product.id) ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Copy size={16} />
                          )}
                        </button>
                        <span
                          className={`pointer-events-none absolute -top-9 left-1/2 transform -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 text-white text-xs px-2 py-1 transition-opacity ${
                            visibleTooltips[`${product.id}-dup`]
                              ? 'opacity-100'
                              : 'opacity-0 group-hover:opacity-100 group-focus:opacity-100'
                          }`}
                        >
                          Duplicar
                        </span>
                      </div>

                      <div
                        className="relative group"
                        onTouchStart={() => showTooltip(`${product.id}-view`)}
                      >
                        <button
                          onClick={() => {
                            setViewProduct(product);
                          }}
                          className="p-2 border rounded text-sm flex items-center justify-center"
                          aria-label="Visualizar"
                        >
                          <Eye size={16} />
                          <span className="sr-only">Visualizar</span>
                        </button>
                        <span
                          className={`pointer-events-none absolute -top-9 left-1/2 transform -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 text-white text-xs px-2 py-1 transition-opacity ${
                            visibleTooltips[`${product.id}-view`]
                              ? 'opacity-100'
                              : 'opacity-0 group-hover:opacity-100 group-focus:opacity-100'
                          }`}
                        >
                          Visualizar
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* PAGINAÇÃO */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 flex items-center justify-between text-sm text-gray-500 dark:text-slate-400">
          <div className="flex items-center gap-4">
            <span>
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-3 py-1 border border-gray-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 disabled:opacity-50"
              >
                Ant.
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-3 py-1 border border-gray-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 disabled:opacity-50"
              >
                Prox.
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="px-3 py-1 border border-gray-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 disabled:opacity-50"
              >
                Últ.
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Ir para página</label>
            <input
              type="number"
              min={1}
              max={totalPages}
              defaultValue={currentPage}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const v = Number((e.target as HTMLInputElement).value || 1);
                  if (v >= 1 && v <= totalPages) setCurrentPage(v);
                }
              }}
              className="w-20 p-1 text-sm border rounded bg-white dark:bg-slate-800"
            />
            <button
              onClick={(e) => {
                const parent = (e.target as HTMLElement)
                  .previousElementSibling as HTMLInputElement | null;
                const v = parent ? Number(parent.value || 1) : 1;
                if (v >= 1 && v <= totalPages) setCurrentPage(v);
              }}
              className="px-3 py-1 border border-gray-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800"
            >
              Ir
            </button>
          </div>
        </div>
      </div>

      {/* MODAL VIEW */}
      {viewProduct && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div
              className="relative h-64 bg-gray-100 dark:bg-slate-800 flex items-center justify-center"
              onTouchStart={(e) => {
                touchStartX.current = e.touches?.[0]?.clientX ?? null;
                touchMoved.current = false;
              }}
              onTouchMove={(e) => {
                const start = touchStartX.current;
                const current = e.touches?.[0]?.clientX ?? null;
                if (start !== null && current !== null) {
                  const deltaX = current - start;
                  if (Math.abs(deltaX) > 10) touchMoved.current = true;
                }
              }}
              onTouchEnd={(e) => {
                const start = touchStartX.current;
                const end = e.changedTouches?.[0]?.clientX ?? null;
                if (start !== null && end !== null) {
                  const delta = end - start;
                  const threshold = 50;
                  if (delta > threshold) {
                    setViewIndex((i) => Math.max(0, i - 1));
                  } else if (delta < -threshold) {
                    setViewIndex((i) =>
                      Math.min((viewProduct.images?.length || 1) - 1, i + 1)
                    );
                  }
                }
                touchStartX.current = null;
              }}
            >
              {/* normalize images to an array to avoid runtime errors when some products have a string/null */}
              {(() => {
                const imagesArray = Array.isArray(viewProduct.images)
                  ? viewProduct.images
                  : viewProduct.images
                    ? [viewProduct.images]
                    : [];

                // (viewImageFailed reset handled at component level)

                const makeSafeUrl = (raw: string | undefined | null) => {
                  if (!raw) return null;
                  try {
                    // If it's already an absolute URL, encode URI components safely
                    const u = new URL(raw);
                    return encodeURI(u.toString());
                  } catch (e) {
                    // Not an absolute URL — try encoding path segments
                    return encodeURI(raw);
                  }
                };

                const selectedImage = viewProduct?.image_path
                  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${encodeURIComponent(
                      String(viewProduct.image_path)
                    )}`
                  : imagesArray.length > 0
                    ? makeSafeUrl(
                        imagesArray[viewIndex % imagesArray.length] as string
                      )
                    : makeSafeUrl(viewProduct?.image_url) ||
                      makeSafeUrl(viewProduct?.external_image_url) ||
                      null;

                if (!selectedImage || viewImageFailed) {
                  return <ImageIcon size={48} className="text-gray-300" />;
                }

                return (
                  // key = selectedImage to force reload when URL changes
                  <Image
                    key={selectedImage}
                    src={selectedImage}
                    alt={viewProduct?.name || ''}
                    fill
                    sizes="(max-width: 640px) 100vw, 640px"
                    className="object-contain p-4"
                    onError={() => setViewImageFailed(true)}
                  />
                );
              })()}

              <button
                onClick={() => setViewProduct(null)}
                className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white rounded-full p-2"
              >
                <X size={20} />
              </button>

              {(() => {
                const imagesArray = Array.isArray(viewProduct.images)
                  ? viewProduct.images
                  : viewProduct.images
                    ? [viewProduct.images]
                    : [];

                return imagesArray.length > 1 ? (
                  <>
                    <button
                      onClick={() => setViewIndex((i) => Math.max(0, i - 1))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 hidden md:flex items-center justify-center h-10 w-10 rounded-full bg-white/80"
                      aria-label="Anterior"
                    >
                      ‹
                    </button>
                    <button
                      onClick={() =>
                        setViewIndex((i) =>
                          Math.min((imagesArray.length || 1) - 1, i + 1)
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center justify-center h-10 w-10 rounded-full bg-white/80"
                      aria-label="Próxima"
                    >
                      ›
                    </button>
                  </>
                ) : null;
              })()}

              {(() => {
                const imagesArray = Array.isArray(viewProduct.images)
                  ? viewProduct.images
                  : viewProduct.images
                    ? [viewProduct.images]
                    : [];

                return imagesArray.length > 1 ? (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
                    {imagesArray.map((_, idx) => (
                      <span
                        key={idx}
                        className={`h-1 w-6 rounded ${idx === viewIndex ? 'bg-white' : 'bg-white/40'}`}
                      />
                    ))}
                  </div>
                ) : null;
              })()}
            </div>
            <div className="p-6 overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {viewProduct.name}
              </h2>
              <div className="flex gap-2 mb-4">
                <span className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 px-2 py-1 rounded text-xs">
                  {viewProduct.brand || 'Sem marca'}
                </span>
                <span className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 px-2 py-1 rounded text-xs">
                  {viewProduct.reference_code}
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(viewProduct.price)}
              </div>
              <div className="flex gap-2">
                <Link
                  href={getProductHref(viewProduct)}
                  className="flex-1 bg-[var(--primary)] text-white py-3 rounded-xl font-bold text-center"
                >
                  Editar Produto
                </Link>
                <button
                  onClick={() => setViewProduct(null)}
                  className="flex-1 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 py-3 rounded-xl font-medium"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Use ExportModal component (replaces inline PDF modal) */}
      <ExportModal
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        products={
          selectedIds.length > 0
            ? products.filter((p) => selectedIds.includes(p.id))
            : processedProducts
        }
        storeSettings={storeSettings}
        brandMapping={availableBrands.reduce(
          (acc, b) => {
            acc[b.name] = b.logo_url;
            return acc;
          },
          {} as Record<string, string | null>
        )}
      />

      {/* MODAL TEXTO (MARCA/CAT) */}
      {showTextModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl p-6 border border-gray-200 dark:border-slate-800 shadow-xl">
            <h3 className="text-lg font-bold mb-4 dark:text-white">
              Definir {textConfig.label}
            </h3>
            <input
              list="modal-opts"
              className="w-full p-2 border rounded mb-4 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              value={textConfig.value}
              onChange={(e) =>
                setTextConfig({ ...textConfig, value: e.target.value })
              }
              placeholder="Digite ou selecione..."
            />
            <datalist id="modal-opts">
              {textConfig.field === 'brand'
                ? availableBrands.map((b) => (
                    <option key={b.name} value={b.name} />
                  ))
                : availableCategories.map((c) => (
                    <option key={c.name} value={c.name} />
                  ))}
            </datalist>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowTextModal(false)}
                variant="outline"
                size="md"
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleBulkTextUpdate}
                variant="primary"
                size="md"
                className="flex-1"
              >
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PREÇO */}
      {showPriceModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl max-w-sm w-full border border-gray-200 dark:border-slate-800 shadow-xl">
            <h3 className="text-lg font-bold mb-4 dark:text-white">
              Atualizar Preço
            </h3>
            <input
              type="number"
              placeholder="Novo Valor"
              className="w-full p-2 border rounded mb-4 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              onChange={(e) =>
                setPriceConfig({ ...priceConfig, value: e.target.value })
              }
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowPriceModal(false)}
                className="flex-1 p-2 border border-gray-200 dark:border-slate-700 rounded dark:text-white hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkPriceUpdate}
                className="flex-1 p-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DELETE */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl max-w-md w-full text-left border border-gray-200 dark:border-slate-800 shadow-xl">
            <div className="flex items-center gap-4">
              <Trash2 size={36} className="text-red-500" />
              <div>
                <h3 className="text-lg font-bold dark:text-white">
                  Excluir itens
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Escolha o escopo e confirme a ação.
                </p>
              </div>
            </div>

            <div className="mt-4">
              <label className="text-sm font-medium mb-2 block">
                Escopo da exclusão
              </label>
              <div className="flex flex-col gap-2">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="deleteScope"
                    value="mine"
                    checked={deleteScope === 'mine'}
                    onChange={() => setDeleteScope('mine')}
                  />
                  <span className="text-sm">
                    Excluir apenas produtos do usuário autenticado
                  </span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="deleteScope"
                    value="all"
                    checked={deleteScope === 'all'}
                    onChange={() => setDeleteScope('all')}
                    disabled={userRole !== 'master'}
                  />
                  <span className="text-sm">
                    Excluir de todos os usuários (apenas admin/master)
                  </span>
                </label>
                {userRole !== 'master' && (
                  <div className="text-xs text-gray-500">
                    Você não tem permissão para excluir globalmente.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4">
              <label className="text-sm font-medium">Confirmação</label>
              <p className="text-xs text-gray-500 mb-2">
                Digite <strong>DELETE</strong> para habilitar o botão de
                exclusão.
              </p>
              <input
                value={typedConfirm}
                onChange={(e) => setTypedConfirm(e.target.value)}
                placeholder="Digite DELETE para confirmar"
                className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-between gap-2 mt-6">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setTypedConfirm('');
                }}
                className="px-3 py-2 border rounded bg-gray-50 dark:bg-slate-800"
              >
                Cancelar
              </button>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={preferSoftDelete}
                    onChange={() => setPreferSoftDelete((s) => !s)}
                  />
                  Preferir inativação (soft-delete)
                </label>
                <button
                  onClick={() => executeDelete()}
                  disabled={
                    typedConfirm !== 'DELETE' ||
                    (deleteScope === 'all' && userRole !== 'master') ||
                    isProcessing
                  }
                  className={`px-4 py-2 rounded text-white ${typedConfirm === 'DELETE' && !(deleteScope === 'all' && userRole !== 'master') ? 'bg-red-600 hover:bg-red-700' : 'bg-red-300 cursor-not-allowed'}`}
                >
                  {isProcessing ? 'Processando...' : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DUPLICAR */}
      {duplicateTargetId && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl max-w-md w-full text-center border border-gray-200 dark:border-slate-800 shadow-xl">
            <div className="flex items-center gap-4 justify-center mb-4">
              <Copy size={36} className="text-blue-600" />
            </div>
            <h3 className="text-lg font-bold dark:text-white">Duplicar Produto?</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-2 mb-4">
              Será criada uma cópia deste produto. As imagens da cópia serão marcadas como compartilhadas.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                onClick={() => setDuplicateTargetId(null)}
                className="py-3 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const id = duplicateTargetId;
                  setDuplicateTargetId(null);
                  if (id) await handleDuplicate(id);
                }}
                className="py-3 rounded-lg bg-blue-600 text-white font-bold hover:!bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed border border-blue-600 hover:border-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm dark:bg-blue-600 dark:hover:!bg-blue-700"
                disabled={isDuplicating(duplicateTargetId || '')}
                type="button"
              >
                Duplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Export default para compatibilidade
export default ProductsTable;
