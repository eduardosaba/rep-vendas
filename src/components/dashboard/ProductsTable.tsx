'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Edit2,
  Trash2,
  Image as ImageIcon,
  UploadCloud,
  RefreshCcw,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Link as LinkIcon,
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
  ZoomIn,
  Eye,
  EyeOff,
  ListOrdered,
  Rocket,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import ProductBarcode from '@/components/ui/Barcode';
import Image from 'next/image';
import { LazyProductImage } from '@/components/ui/LazyProductImage';
import { getProductImageUrl } from '@/lib/imageUtils';
import { toast } from 'sonner';
import {
  bulkUpdateFields,
  bulkUpdatePrice,
  bulkDelete,
} from '@/app/dashboard/products/actions';
import { createClient } from '@/lib/supabase/client';
import { generateCatalogPDF } from '@/utils/generateCatalogPDF';
import { usePlanLimits } from '@/hooks/usePlanLimits';

// --- INTERFACES ---
export interface Product {
  id: string;
  name: string;
  reference_code: string;
  price: number;
  brand: string | null;
  category: string | null;
  class_core?: string | null;
  image_url: string | null;
  image_path?: string | null;
  external_image_url?: string | null;
  images: any[] | null; // Alterado para any[] para suportar objetos {url, path}
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
}

interface BrandOption {
  name: string;
  logo_url: string | null;
}

// Chaves permitidas para colunas (excluindo objetos complexos para o renderCell genérico)
type DataKey = Exclude<
  keyof Product,
  'images' | 'track_stock' | 'technical_specs'
>;

interface ColumnDefinition {
  key: DataKey;
  title: string;
  isSortable: boolean;
  isNumeric?: boolean;
  align?: 'left' | 'right' | 'center';
}

interface SupabasePrefRow {
  user_id: string;
  app_id: string;
  table_key: string;
  column_order: DataKey[];
  visible_keys: DataKey[];
  column_widths?: Record<string, number> | null;
}

const PREFS_TABLE_KEY = 'product_table';
const PREFS_TABLE_NAME = 'user_preferences';
const APP_ID = 'repvendas_saas';

const ALL_DATA_COLUMNS: Record<DataKey, ColumnDefinition> = {
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
  class_core: {
    key: 'class_core',
    title: 'Classe',
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
  cost: {
    key: 'cost',
    title: 'Custo',
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
  is_active: {
    key: 'is_active',
    title: 'Status',
    isSortable: true,
    align: 'center',
  },
  is_launch: {
    key: 'is_launch',
    title: 'Novo',
    isSortable: true,
    align: 'center',
  },
  is_best_seller: {
    key: 'is_best_seller',
    title: 'Top',
    isSortable: true,
    align: 'center',
  },
  id: { key: 'id', title: 'ID', isSortable: true, align: 'left' },
  created_at: {
    key: 'created_at',
    title: 'Data',
    isSortable: true,
    align: 'left',
  },
  image_url: {
    key: 'image_url',
    title: 'Img',
    isSortable: false,
    align: 'left',
  },
  image_optimized: {
    key: 'image_optimized',
    title: 'Imagem (Opt.)',
    isSortable: false,
    align: 'center',
  },
  image_path: {
    key: 'image_path',
    title: 'Path',
    isSortable: false,
    align: 'left',
  },
  external_image_url: {
    key: 'external_image_url',
    title: 'Ext. URL',
    isSortable: false,
    align: 'left',
  },
  description: {
    key: 'description',
    title: 'Desc.',
    isSortable: false,
    align: 'left',
  },
  slug: { key: 'slug', title: 'Slug', isSortable: false, align: 'left' },
};

const DEFAULT_PREFS = {
  columnOrder: [
    'name',
    'reference_code',
    'price',
    'brand',
    'is_active',
    'image_optimized',
  ] as DataKey[],
  visibleKeys: new Set<DataKey>([
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

export function ProductsTable({ initialProducts }: ProductsTableProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { usage, loading: limitLoading } = usePlanLimits();

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [availableBrands, setAvailableBrands] = useState<BrandOption[]>([]);
  const [availableCategories, setAvailableCategories] = useState<
    { name: string }[]
  >([]);
  const [availableClasses, setAvailableClasses] = useState<{ name: string }[]>(
    []
  );

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
    imageOptimization: 'all',
  });

  const [displayMinPrice, setDisplayMinPrice] = useState('');
  const [displayMaxPrice, setDisplayMaxPrice] = useState('');

  const parseCurrencyToNumericString = (s: string) => {
    const digits = String(s || '').replace(/\D/g, '');
    if (!digits) return '';
    return (Number(digits) / 100).toFixed(2);
  };

  const formatBRL = (v: string) => {
    const n = Number(v);
    if (isNaN(n) || !v) return '';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(n);
  };

  useEffect(() => {
    setDisplayMinPrice(filters.minPrice ? formatBRL(filters.minPrice) : '');
    setDisplayMaxPrice(filters.maxPrice ? formatBRL(filters.maxPrice) : '');
  }, [filters.minPrice, filters.maxPrice]);

  const [serverMode, setServerMode] = useState(false);
  const [serverProducts, setServerProducts] = useState<Product[]>([]);
  const [serverMeta, setServerMeta] = useState<{
    totalCount?: number;
    totalPages?: number;
    page?: number;
  }>({});
  const [serverLoading, setServerLoading] = useState(false);
  const fetchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [sortConfig, setSortConfig] = useState<{
    key: DataKey;
    direction: 'asc' | 'desc';
  } | null>(null);

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    () => {
      const widths: Record<string, number> = {};
      (Object.keys(ALL_DATA_COLUMNS) as DataKey[]).forEach((key) => {
        if (key === 'name') widths[key] = 300;
        else if (key === 'image_url' || key === 'image_optimized')
          widths[key] = 80;
        else widths[key] = 140;
      });
      return widths;
    }
  );

  const resizingRef = useRef<{
    key: DataKey;
    startX: number;
    startWidth: number;
  } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const { key, startX, startWidth } = resizingRef.current;
      const delta = e.clientX - startX;
      setColumnWidths((prev) => ({
        ...prev,
        [key]: Math.max(60, startWidth + delta),
      }));
    };
    const onUp = () => {
      if (resizingRef.current) {
        resizingRef.current = null;
        document.body.style.userSelect = '';
        window.dispatchEvent(new CustomEvent('repvendas:colresizeend'));
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfOptions, setPdfOptions] = useState({
    showPrices: true,
    priceType: 'sale_price' as 'price' | 'sale_price',
    title: 'Catálogo de Produtos',
    imageZoom: 3,
  });
  const [primaryColor, setPrimaryColor] = useState<string | null>(null);

  useEffect(() => {
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue('--primary')
      .trim();
    if (v) setPrimaryColor(v);
  }, []);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState({ progress: 0, message: '' });
  const [textConfig, setTextConfig] = useState<{
    field: 'brand' | 'category' | 'class_core' | '';
    value: string;
    label: string;
  }>({ field: '', value: '', label: '' });
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [priceConfig, setPriceConfig] = useState<{
    mode: 'fixed' | 'percentage';
    value: string;
  }>({ mode: 'fixed', value: '' });
  const [displayPrice, setDisplayPrice] = useState('');
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [viewIndex, setViewIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setDisplayPrice(priceConfig.value ? formatBRL(priceConfig.value) : '');
  }, [priceConfig.value]);

  const getProductHref = (p: Product) =>
    `/dashboard/products/${encodeURIComponent(p.id)}`;

  // --- PERSISTÊNCIA ---
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

  const savePreferences = useCallback(
    async (
      order: DataKey[],
      visible: Set<DataKey>,
      widths?: Record<string, number>
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
      await supabase
        .from(PREFS_TABLE_NAME)
        .upsert([row], { onConflict: 'user_id,app_id,table_key' });
    },
    [userId, supabase]
  );

  useEffect(() => {
    const handler = () =>
      savePreferences(columnOrder, visibleColumnKeys, columnWidths);
    window.addEventListener('repvendas:colresizeend', handler);
    return () => window.removeEventListener('repvendas:colresizeend', handler);
  }, [savePreferences, columnOrder, visibleColumnKeys, columnWidths]);

  // --- FETCH PREFS ---
  useEffect(() => {
    if (!isAuthReady || !userId || userId === 'guest') {
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
            (k) => ALL_DATA_COLUMNS[k]
          );
          const loadedVisible = new Set(
            (data.visible_keys as DataKey[]).filter((k) => ALL_DATA_COLUMNS[k])
          );
          if (data.column_widths)
            setColumnWidths((prev) => ({
              ...prev,
              ...(data.column_widths as any),
            }));
          setColumnOrder([
            ...loadedOrder,
            ...DEFAULT_PREFS.columnOrder.filter(
              (k) => !loadedOrder.includes(k)
            ),
          ]);
          setVisibleColumnKeys(loadedVisible);
        }
        setIsLoadingPrefs(false);
      });
  }, [supabase, isAuthReady, userId]);

  // --- RENDER CELULA (FIX IMAGEM E TS) ---
  const renderCell = (product: Product, key: DataKey) => {
    const val = (product as any)[key];

    // Função utilitária interna para garantir URL de imagem
    const getSafeImgUrl = (img: any): string | null => {
      if (!img) return null;
      if (typeof img === 'string') return img;
      if (typeof img === 'object' && img.url) return img.url;
      return null;
    };

    const hasStorageImage = Boolean(
      product.image_path ||
      product.image_url?.includes('supabase.co/storage') ||
      (Array.isArray(product.images) &&
        product.images.some((i) =>
          getSafeImgUrl(i)?.includes('supabase.co/storage')
        ))
    );

    if (key === 'name')
      return (
        <div className="flex items-center gap-3 min-w-[200px]">
          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-slate-800 relative overflow-hidden flex-shrink-0 border border-gray-200 dark:border-slate-700">
            {(() => {
              const imgData = getProductImageUrl(product as any);
              const src = getSafeImgUrl(
                imgData?.src ||
                  product.image_url ||
                  product.external_image_url ||
                  (product.images && product.images[0])
              );
              if (!src)
                return (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon size={16} className="text-gray-400" />
                  </div>
                );
              if (
                src.startsWith('http') &&
                !src.includes('supabase.co/storage')
              ) {
                // eslint-disable-next-line @next/next/no-img-element
                return (
                  <img
                    src={src}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                );
              }
              return (
                <LazyProductImage
                  src={src}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  fallbackSrc="/images/default-logo.png"
                />
              );
            })()}
          </div>
          <div className="min-w-0">
            <div
              onClick={() => setViewProduct(product)}
              className="font-medium text-gray-900 dark:text-white truncate cursor-pointer hover:text-primary transition-colors"
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
      return /^[0-9]{7,13}$/.test(raw) ? (
        <ProductBarcode value={raw} height={36} showNumber />
      ) : (
        <span className="text-xs text-gray-500 font-mono">{raw || '-'}</span>
      );
    }

    if (['price', 'cost', 'sale_price'].includes(key))
      return (
        <div className="font-medium">{val ? formatBRL(String(val)) : '-'}</div>
      );

    if (key === 'is_active')
      return (
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold ${val === false ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}`}
        >
          {val === false ? 'Inativo' : 'Ativo'}
        </span>
      );

    if (key === 'image_optimized')
      return (
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-bold ${hasStorageImage ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
        >
          {hasStorageImage ? 'Otimiz.' : 'Externa'}
        </span>
      );

    return (
      <span className="text-gray-600 dark:text-slate-400 text-sm truncate block max-w-[150px]">
        {String(val ?? '-')}
      </span>
    );
  };

  // --- FILTRAGEM ---
  const processedProducts = useMemo(() => {
    if (serverMode) return serverProducts;
    let data = [...products];

    if (searchTerm) {
      const term = normalize(searchTerm);
      data = data.filter((p) =>
        normalize(p.name + p.reference_code + (p.brand || '')).includes(term)
      );
    }

    data = data.filter((p) => {
      if (filters.onlyLaunch && !p.is_launch) return false;
      if (filters.onlyBestSeller && !p.is_best_seller) return false;
      if (
        filters.brand.length > 0 &&
        (!p.brand || !filters.brand.includes(p.brand))
      )
        return false;
      if (filters.visibility === 'active' && p.is_active === false)
        return false;
      if (filters.visibility === 'inactive' && p.is_active !== false)
        return false;
      const price = p.price || 0;
      if (filters.minPrice && price < Number(filters.minPrice)) return false;
      if (filters.maxPrice && price > Number(filters.maxPrice)) return false;
      return true;
    });

    if (sortConfig) {
      data.sort((a: any, b: any) => {
        const valA = a[sortConfig.key] ?? '';
        const valB = b[sortConfig.key] ?? '';
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [products, searchTerm, filters, sortConfig, serverMode, serverProducts]);

  const paginatedProducts = processedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(processedProducts.length / itemsPerPage);

  const kpis = {
    total: products.length,
    brands: new Set(products.map((p) => p.brand).filter(Boolean)).size,
    launch: products.filter((p) => p.is_launch).length,
    best: products.filter((p) => p.is_best_seller).length,
  };

  const toggleSelectOne = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  const toggleSelectAll = () =>
    setSelectedIds(
      selectedIds.length === paginatedProducts.length
        ? []
        : paginatedProducts.map((p) => p.id)
    );

  // --- AÇÕES EM MASSA ---
  const handleBulkToggle = async (field: 'is_launch' | 'is_best_seller') => {
    const allTrue = selectedIds.every(
      (id) => products.find((p) => p.id === id)?.[field]
    );
    handleBulkUpdate(field, !allTrue);
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
      toast.success('Atualizado com sucesso!');
      setSelectedIds([]);
    } catch {
      toast.error('Erro na atualização em massa');
    } finally {
      setIsProcessing(false);
    }
  };

  const executeDelete = async () => {
    setIsProcessing(true);
    try {
      const ids = deleteTargetId ? [deleteTargetId] : selectedIds;
      await bulkDelete(ids, { preferSoft: true });
      setProducts((prev) => prev.filter((p) => !ids.includes(p.id)));
      toast.success('Removido com sucesso');
      setShowDeleteModal(false);
      setSelectedIds([]);
    } catch {
      toast.error('Erro ao excluir');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkPriceUpdate = async () => {
    setIsProcessing(true);
    try {
      await bulkUpdatePrice(
        selectedIds,
        priceConfig.mode,
        Number(priceConfig.value)
      );
      toast.success('Preços atualizados!');
      window.location.reload();
    } catch {
      toast.error('Erro ao atualizar preços');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await generateCatalogPDF(
        selectedIds.length > 0
          ? products.filter((p) => selectedIds.includes(p.id))
          : processedProducts,
        {
          showPrices: pdfOptions.showPrices,
          priceType: pdfOptions.priceType,
          title: pdfOptions.title,
          onProgress: (p, m) => setPdfProgress({ progress: p, message: m }),
        }
      );
      toast.success('Catálogo PDF gerado!');
      setShowPdfModal(false);
    } catch {
      toast.error('Erro ao gerar PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const visibleAndOrderedColumns = useMemo(
    () =>
      columnOrder
        .filter((k) => visibleColumnKeys.has(k))
        .map((k) => ALL_DATA_COLUMNS[k]),
    [columnOrder, visibleColumnKeys]
  );

  if (isLoadingPrefs)
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );

  return (
    <div className="space-y-6">
      {/* KPIS (CLICÁVEIS PARA FILTRO) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total',
            val: kpis.total,
            icon: Package,
            color: 'text-gray-900',
            field: '',
          },
          {
            label: 'Marcas',
            val: kpis.brands,
            icon: Briefcase,
            color: 'text-green-600',
            field: '',
          },
          {
            label: 'Lançamentos',
            val: kpis.launch,
            icon: Zap,
            color: 'text-purple-600',
            field: 'onlyLaunch',
          },
          {
            label: 'Best Sellers',
            val: kpis.best,
            icon: Star,
            color: 'text-orange-500',
            field: 'onlyBestSeller',
          },
        ].map((k, i) => (
          <button
            key={i}
            onClick={() =>
              k.field &&
              setFilters((prev) => ({
                ...prev,
                [k.field]: !(prev as any)[k.field],
              }))
            }
            className={`p-5 rounded-[2rem] border shadow-sm flex flex-col justify-between text-left transition-all ${k.field && (filters as any)[k.field] ? 'ring-2 ring-primary border-primary bg-primary/5' : 'bg-white dark:bg-slate-900'}`}
          >
            <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2 mb-2">
              <k.icon size={12} /> {k.label}
            </span>
            <span className={`text-2xl font-black ${k.color}`}>{k.val}</span>
          </button>
        ))}
      </div>

      {/* TOOLBAR COM BUSCA E FILTROS */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por nome, referência ou marca..."
            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-5 py-3 rounded-2xl border text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${showFilters ? 'bg-primary text-white' : 'bg-white dark:bg-slate-800 text-slate-600'}`}
          >
            <Filter size={16} /> Filtros
          </button>
          {/* Column selector dropdown (in-file fallback) */}
          {(() => {
            const ColumnSelectorDropdown = () => {
              const [open, setOpen] = useState(false);
              const toggle = () => setOpen((v) => !v);

              const toggleKey = (k: DataKey) => {
                setVisibleColumnKeys((prev) => {
                  const next = new Set(prev);
                  if (next.has(k)) next.delete(k);
                  else next.add(k);
                  return next;
                });
              };

              return (
                <div className="relative">
                  <button
                    onClick={toggle}
                    className="px-4 py-3 rounded-2xl border bg-white dark:bg-slate-800 text-xs font-black uppercase tracking-widest flex items-center gap-2"
                  >
                    Colunas
                  </button>
                  {open && (
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border rounded-lg shadow-lg p-3 z-50">
                      <div className="text-xs font-bold mb-2">
                        Mostrar colunas
                      </div>
                      <div className="space-y-2 max-h-64 overflow-auto">
                        {columnOrder.map((k) => (
                          <label
                            key={String(k)}
                            className="flex items-center gap-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={visibleColumnKeys.has(k)}
                              onChange={() => toggleKey(k)}
                            />
                            <span className="truncate">
                              {ALL_DATA_COLUMNS[k].title}
                            </span>
                          </label>
                        ))}
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => setOpen(false)}
                          className="text-xs px-3 py-1 rounded bg-slate-50 dark:bg-slate-800"
                        >
                          Fechar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            };

            return <ColumnSelectorDropdown />;
          })()}
          <button
            onClick={() => setShowPdfModal(true)}
            className="px-5 py-3 rounded-2xl border border-slate-200 bg-white dark:bg-slate-800 text-xs font-black uppercase tracking-widest flex items-center gap-2"
          >
            <FileText size={16} /> PDF
          </button>
        </div>
      </div>

      {/* FILTROS EXPANDIDOS */}
      {showFilters && (
        <div className="p-8 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 shadow-2xl grid grid-cols-1 md:grid-cols-4 gap-6 animate-in slide-in-from-top-4">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">
              Faixa de Preço
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Mín"
                value={displayMinPrice}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    minPrice: parseCurrencyToNumericString(e.target.value),
                  }))
                }
                className="w-1/2 p-3 bg-slate-50 rounded-xl text-sm border-none"
              />
              <input
                type="text"
                placeholder="Máx"
                value={displayMaxPrice}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    maxPrice: parseCurrencyToNumericString(e.target.value),
                  }))
                }
                className="w-1/2 p-3 bg-slate-50 rounded-xl text-sm border-none"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">
              Status de Visibilidade
            </label>
            <select
              value={filters.visibility}
              onChange={(e) =>
                setFilters((f) => ({ ...f, visibility: e.target.value }))
              }
              className="w-full p-3 bg-slate-50 rounded-xl text-sm border-none"
            >
              <option value="all">Todos os produtos</option>
              <option value="active">Apenas Ativos</option>
              <option value="inactive">Apenas Inativos</option>
            </select>
          </div>
          <div className="col-span-full flex justify-end">
            <button
              onClick={() =>
                setFilters({
                  minPrice: '',
                  maxPrice: '',
                  onlyLaunch: false,
                  onlyBestSeller: false,
                  stockStatus: 'all',
                  visibility: 'all',
                  category: '',
                  brand: [],
                  color: '',
                  imageOptimization: 'all',
                })
              }
              className="text-[10px] font-black uppercase text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl transition-colors"
            >
              Limpar todos os filtros
            </button>
          </div>
        </div>
      )}

      {/* TABELA DE PRODUTOS */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table
            className="w-full text-left text-sm border-collapse"
            style={{ tableLayout: 'fixed' }}
          >
            <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 w-16">
                  <button onClick={toggleSelectAll}>
                    {selectedIds.length === paginatedProducts.length &&
                    paginatedProducts.length > 0 ? (
                      <CheckSquare size={20} className="text-primary" />
                    ) : (
                      <Square size={20} className="text-slate-300" />
                    )}
                  </button>
                </th>
                {visibleAndOrderedColumns.map((col) => (
                  <th
                    key={col.key}
                    style={{ width: columnWidths[col.key] || 150 }}
                    className="px-4 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest"
                  >
                    <div
                      className="flex items-center gap-1 cursor-pointer group"
                      onClick={() =>
                        setSortConfig({
                          key: col.key,
                          direction:
                            sortConfig?.key === col.key &&
                            sortConfig.direction === 'asc'
                              ? 'desc'
                              : 'asc',
                        })
                      }
                    >
                      {col.title}{' '}
                      <ArrowUpDown
                        size={10}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                  </th>
                ))}
                <th className="px-6 py-4 text-right w-32 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {paginatedProducts.map((product) => (
                <tr
                  key={product.id}
                  className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${selectedIds.includes(product.id) ? 'bg-primary/5' : ''}`}
                >
                  <td className="px-6 py-4">
                    <button onClick={() => toggleSelectOne(product.id)}>
                      {selectedIds.includes(product.id) ? (
                        <CheckSquare size={20} className="text-primary" />
                      ) : (
                        <Square size={20} className="text-slate-200" />
                      )}
                    </button>
                  </td>
                  {visibleAndOrderedColumns.map((col) => (
                    <td key={col.key} className="px-4 py-4 truncate">
                      {renderCell(product, col.key)}
                    </td>
                  ))}
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <Link
                        href={getProductHref(product)}
                        className="p-2 text-slate-300 hover:text-primary transition-colors"
                      >
                        <Edit2 size={16} />
                      </Link>
                      <button
                        onClick={() => setViewProduct(product)}
                        className="p-2 text-slate-300 hover:text-indigo-500 transition-colors"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteTargetId(product.id);
                          setShowDeleteModal(true);
                        }}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* BARRA DE AÇÕES EM MASSA (FLUTUANTE) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-slate-900 border border-slate-200 p-4 rounded-[2.5rem] shadow-2xl flex items-center gap-8 animate-in slide-in-from-bottom-10">
          <div className="flex items-center gap-3 pr-8 border-r border-slate-100">
            <span className="h-10 w-10 bg-primary text-white rounded-full flex items-center justify-center font-black text-xs shadow-lg shadow-primary/20">
              {selectedIds.length}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Selecionados
            </span>
          </div>
          <div className="flex gap-6">
            <button
              onClick={() => handleBulkToggle('is_launch')}
              className="flex flex-col items-center gap-1 group"
            >
              <Rocket
                size={20}
                className="text-purple-500 group-hover:scale-110 transition-transform"
              />
              <span className="text-[9px] font-black uppercase text-slate-400">
                Lançamento
              </span>
            </button>
            <button
              onClick={() => setShowPriceModal(true)}
              className="flex flex-col items-center gap-1 group"
            >
              <DollarSign
                size={20}
                className="text-green-500 group-hover:scale-110 transition-transform"
              />
              <span className="text-[9px] font-black uppercase text-slate-400">
                Alterar Preço
              </span>
            </button>
            <button
              onClick={() => {
                setDeleteTargetId(null);
                setShowDeleteModal(true);
              }}
              className="flex flex-col items-center gap-1 group"
            >
              <Trash2
                size={20}
                className="text-red-500 group-hover:scale-110 transition-transform"
              />
              <span className="text-[9px] font-black uppercase text-slate-400">
                Excluir
              </span>
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="ml-4 p-3 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE EXCLUSÃO */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] max-w-sm w-full text-center shadow-2xl border border-slate-100">
            <div className="h-24 w-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
              <Trash2 size={48} />
            </div>
            <h3 className="text-2xl font-black mb-3">Tem certeza?</h3>
            <p className="text-slate-500 text-sm mb-10 leading-relaxed">
              Os itens selecionados serão removidos permanentemente do seu
              catálogo e do banco de dados.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-4 bg-slate-100 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => executeDelete()}
                disabled={isProcessing}
                className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-100 hover:brightness-110"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAGINAÇÃO INFERIOR */}
      <div className="flex justify-between items-center px-10 py-4 bg-slate-50/50 rounded-3xl">
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
          Mostrando página {currentPage} de {totalPages}
        </p>
        <div className="flex gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="p-3 bg-white border border-slate-100 rounded-2xl disabled:opacity-30 hover:shadow-md transition-all shadow-sm"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="p-3 bg-white border border-slate-100 rounded-2xl disabled:opacity-30 hover:shadow-md transition-all shadow-sm"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Helpers Utilitários
function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export default ProductsTable;
