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
} from 'lucide-react';
import ProductBarcode from '@/components/ui/Barcode';
import Image from 'next/image';
import { toast } from 'sonner';
import { SyncSingleButton } from '@/components/products/SyncSingleButton';
import {
  bulkUpdateFields,
  bulkUpdatePrice,
  bulkDelete,
} from '@/app/dashboard/products/actions';
import { createClient } from '@/lib/supabase/client';
import { generateCatalogPDF } from '@/utils/generateCatalogPDF';
import { usePlanLimits } from '@/hooks/usePlanLimits';

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
  technical_specs: {
    key: 'technical_specs',
    title: 'Specs',
    isSortable: false,
    align: 'left',
  },
  slug: { key: 'slug', title: 'Slug', isSortable: false, align: 'left' },
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
    'is_active',
    'is_launch',
  ],
  visibleKeys: new Set([
    'name',
    'reference_code',
    'price',
    'brand',
    'is_active',
  ]),
};

export function ProductsTable({ initialProducts }: ProductsTableProps) {
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
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortConfig, setSortConfig] = useState<{
    key: DataKey;
    direction: 'asc' | 'desc';
  } | null>(null);

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
  });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState({ progress: 0, message: '' });

  const [textConfig, setTextConfig] = useState<{
    field: 'brand' | 'category' | '';
    value: string;
    label: string;
  }>({ field: '', value: '', label: '' });
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [preferSoftDelete, setPreferSoftDelete] = useState(false);
  const [priceConfig, setPriceConfig] = useState<{
    mode: 'fixed' | 'percentage';
    value: string;
  }>({ mode: 'fixed', value: '' });
  const [viewProduct, setViewProduct] = useState<Product | null>(null);

  const logError = (...args: unknown[]) => {
    if (typeof console !== 'undefined' && console.error) console.error(...args);
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
    async (order: DataKey[], visible: Set<DataKey>) => {
      if (!userId || userId === 'guest') return;
      const row: SupabasePrefRow = {
        user_id: userId,
        app_id: APP_ID,
        table_key: PREFS_TABLE_KEY,
        column_order: order,
        visible_keys: Array.from(visible),
      };
      await persistRemoteRow(row);
    },
    [persistRemoteRow, userId]
  );

  useEffect(() => {
    if (!supabase || !isAuthReady || !userId || userId === 'guest') {
      setIsLoadingPrefs(false);
      return;
    }
    supabase
      .from(PREFS_TABLE_NAME)
      .select('column_order, visible_keys')
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
      setAvailableCategories(cats.map((c: string) => ({ name: c })));
    };
    fetchOptions();
  }, [supabase]);

  // --- MANIPULAÇÃO DE COLUNAS ---
  const toggleColumn = (key: DataKey) => {
    const newVisible = new Set(visibleColumnKeys);
    if (newVisible.has(key)) newVisible.delete(key);
    else newVisible.add(key);
    setVisibleColumnKeys(newVisible);
    savePreferences(columnOrder, newVisible);
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
    savePreferences(newOrder, visibleColumnKeys);
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
        <button
          onClick={() => setIsColumnDropdownOpen(!isColumnDropdownOpen)}
          className={`px-4 py-2 rounded-lg border flex items-center gap-2 font-medium transition-colors text-sm ${isColumnDropdownOpen ? 'bg-primary/5 dark:bg-primary/20 border-primary/30 dark:border-primary/20 text-primary dark:text-primary/70' : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
        >
          <ListOrdered size={16} />{' '}
          <span className="hidden sm:inline">Colunas</span>
        </button>
        {isColumnDropdownOpen && (
          <div className="absolute right-0 mt-2 w-72 rounded-lg shadow-xl bg-white dark:bg-slate-900 ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 dark:divide-slate-800 z-50 max-h-96 overflow-y-auto border border-gray-200 dark:border-slate-800">
            <div className="p-2">
              <p className="text-xs text-gray-500 dark:text-slate-400 font-semibold mb-2 px-2">
                Mostrar/Ocultar
              </p>
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
                        className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300 truncate cursor-pointer"
                      >
                        {def.title}
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

  // --- FILTRAGEM ---
  const visibleAndOrderedColumns = useMemo(
    () =>
      columnOrder
        .filter((key) => visibleColumnKeys.has(key))
        .map((key) => ALL_DATA_COLUMNS[key]),
    [columnOrder, visibleColumnKeys]
  );

  const processedProducts = useMemo(() => {
    const data = products.filter((p) => {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        p.name.toLowerCase().includes(search) ||
        p.reference_code?.toLowerCase().includes(search) ||
        p.sku?.toLowerCase().includes(search) ||
        p.barcode?.includes(search);

      if (!matchesSearch) return false;
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
  }, [products, searchTerm, filters, sortConfig]);

  const totalPages = Math.max(
    1,
    Math.ceil(processedProducts.length / itemsPerPage)
  );
  const paginatedProducts = processedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const kpis = useMemo(() => {
    const active = products.filter((p) => p.is_active !== false);
    return {
      total: products.length,
      brands: new Set(active.map((p) => p.brand).filter(Boolean)).size,
      launch: active.filter((p) => p.is_launch).length,
      best: active.filter((p) => p.is_best_seller).length,
    };
  }, [products]);

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

  const executeDelete = async (forceSoft = false) => {
    setIsProcessing(true);
    try {
      const ids = deleteTargetId ? [deleteTargetId] : selectedIds;
      const res: any = await bulkDelete(ids, {
        preferSoft: forceSoft || preferSoftDelete,
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
        productsToPrint = products.filter((p) => selectedIds.includes(p.id));
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

      await generateCatalogPDF(productsToPrint, {
        showPrices: pdfOptions.showPrices,
        priceType: pdfOptions.priceType,
        title: pdfOptions.title,
        storeName: settings?.name || 'Catálogo',
        storeLogo: settings?.logo_url,
        imageZoom: pdfOptions.imageZoom,
        brandMapping: brandMap,
        secondaryColor: secondaryColor,
        onProgress: (progress, message) => {
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
      className={`px-4 py-3 font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`}
      onClick={() =>
        setSortConfig({
          key: sortKey,
          direction:
            sortConfig &&
            sortConfig.key === sortKey &&
            sortConfig.direction === 'asc'
              ? 'desc'
              : 'asc',
        })
      }
    >
      <div
        className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}
      >
        {label} <ArrowUpDown size={12} className="opacity-50" />
      </div>
    </th>
  );

  const renderCell = (product: Product, key: DataKey) => {
    const val = (product as any)[key];
    if (key === 'name')
      return (
        <div className="flex items-center gap-3 min-w-[200px]">
          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-slate-800 relative overflow-hidden flex-shrink-0 border border-gray-200 dark:border-slate-700">
            {(() => {
              const src = product.image_path
                ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/${product.image_path}`
                : product.image_url ||
                  product.external_image_url ||
                  product.images?.[0];
              return src ? (
                <Image src={src} alt="" fill className="object-cover" />
              ) : (
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
        ].map((k, i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
          >
            <span className="text-xs font-bold uppercase text-gray-500 dark:text-slate-400 flex items-center gap-2 mb-2">
              <k.icon size={14} /> {k.label}
            </span>
            <span className={`text-2xl font-bold ${k.color}`}>{k.val}</span>
          </div>
        ))}
      </div>

      {/* FILTROS E BUSCA */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none dark:text-white"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium flex items-center gap-2 transition-colors ${showFilters ? 'bg-primary/5 dark:bg-primary/20 border-primary/30 dark:border-primary/20 text-primary dark:text-primary/70' : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
            >
              <Filter size={16} /> Filtros
            </button>

            {/* BOTÃO COLUNAS RESTAURADO */}
            <ColumnSelectorDropdown />

            {/* BOTÃO PDF FIXO */}
            <button
              onClick={() => setShowPdfModal(true)}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 hidden sm:flex items-center gap-2"
            >
              <FileText size={16} />{' '}
              <span className="hidden md:inline">PDF</span>
            </button>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => window.location.reload()}
              className="p-2 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              <RefreshCcw size={18} />
            </button>
          </div>
        </div>

        {/* Painel de Filtros Expandido */}
        {showFilters && (
          <div className="pt-4 border-t border-gray-100 dark:border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-top-2">
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
              onClick={() => setShowPdfModal(true)}
              className="flex flex-col items-center gap-1 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg min-w-[60px]"
            >
              <FileText size={18} className="text-orange-500" />{' '}
              <span className="text-[10px] text-gray-600 dark:text-slate-400">
                PDF
              </span>
            </button>
            <div className="w-px h-8 bg-gray-200 dark:bg-slate-700 mx-1 shrink-0"></div>
            <button
              onClick={() => {
                // TODO: Implementar modal de texto para marca
                console.log('Abrir modal de marca');
              }}
              className="flex flex-col items-center gap-1 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg min-w-[60px]"
            >
              <Tag size={18} className="text-primary" />{' '}
              <span className="text-[10px] text-gray-600 dark:text-slate-400">
                Marca
              </span>
            </button>
            <button
              onClick={() => {
                // TODO: Implementar modal de texto para categoria
                console.log('Abrir modal de categoria');
              }}
              className="flex flex-col items-center gap-1 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg min-w-[60px]"
            >
              <Layers size={18} className="text-purple-500" />{' '}
              <span className="text-[10px] text-gray-600 dark:text-slate-400">
                Cat.
              </span>
            </button>
            <button
              onClick={() => handleBulkUpdate('is_active', true)}
              className="flex flex-col items-center gap-1 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg min-w-[60px]"
            >
              <Eye size={18} className="text-primary" />{' '}
              <span className="text-[10px] text-gray-600 dark:text-slate-400">
                Ativar
              </span>
            </button>
            <button
              onClick={() => handleBulkUpdate('is_active', false)}
              className="flex flex-col items-center gap-1 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg min-w-[60px]"
            >
              <EyeOff size={18} className="text-gray-400" />{' '}
              <span className="text-[10px] text-gray-600 dark:text-slate-400">
                Inativar
              </span>
            </button>
            <button
              onClick={() => setShowPriceModal(true)}
              className="flex flex-col items-center gap-1 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg min-w-[60px]"
            >
              <DollarSign size={18} className="text-green-500" />{' '}
              <span className="text-[10px] text-gray-600 dark:text-slate-400">
                Preço
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
          <button
            onClick={() => setSelectedIds([])}
            className="absolute -top-2 -right-2 bg-gray-200 dark:bg-slate-700 rounded-full p-1 shadow-md hover:bg-gray-300"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* TABELA RESPONSIVA */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto shadow-sm border border-gray-100 rounded-lg">
          <table className="w-full text-left text-sm border-collapse min-w-full">
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
                {visibleAndOrderedColumns.map((col) => (
                  <SortableHeader
                    key={col.key}
                    label={col.title}
                    sortKey={col.key}
                    align={col.align}
                  />
                ))}
                {/* COLUNA STICKY DE AÇÕES */}
                <th className="sticky right-0 z-20 bg-gray-50 dark:bg-slate-900 px-4 py-3 text-right font-medium text-gray-500 dark:text-slate-400 shadow-[-5px_0_5px_-5px_rgba(0,0,0,0.1)] w-[100px]">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={100}
                    className="p-12 text-center text-gray-500 dark:text-slate-400"
                  >
                    Nenhum produto encontrado.
                  </td>
                </tr>
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
                    {visibleAndOrderedColumns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 text-gray-600 dark:text-slate-400 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                      >
                        {renderCell(product, col.key)}
                      </td>
                    ))}
                    {/* COLUNA STICKY DE AÇÕES (BODY) */}
                    <td className="sticky right-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-gray-50 dark:group-hover:bg-slate-800/50 px-2 py-3 text-right shadow-[-5px_0_5px_-5px_rgba(0,0,0,0.1)]">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/dashboard/products/${product.slug || product.id}`}
                          className="p-1.5 text-gray-400 hover:text-[var(--primary)] rounded-md transition-colors"
                        >
                          <Edit2 size={16} />
                        </Link>
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

        {/* PAGINAÇÃO */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 flex items-center justify-between text-sm text-gray-500 dark:text-slate-400">
          <span>
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex gap-2">
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
          </div>
        </div>
      </div>

      {/* MODAL VIEW */}
      {viewProduct && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="relative h-64 bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
              {(() => {
                const src = viewProduct.image_path
                  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/${viewProduct.image_path}`
                  : viewProduct.image_url ||
                    viewProduct.external_image_url ||
                    viewProduct.images?.[0];
                return src ? (
                  <Image src={src} alt="" fill className="object-contain p-4" />
                ) : (
                  <ImageIcon size={48} className="text-gray-300" />
                );
              })()}
              <button
                onClick={() => setViewProduct(null)}
                className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white rounded-full p-2"
              >
                <X size={20} />
              </button>
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
                  href={`/dashboard/products/${viewProduct.slug || viewProduct.id}`}
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

      {/* MODAL PDF (CORRIGIDO: FLEXBOX + FIXED COLORS) */}
      {showPdfModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            {/* Header Fixo */}
            <div className="p-6 border-b border-gray-100 dark:border-slate-800">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="text-primary" /> Gerar Catálogo PDF
              </h3>
            </div>

            {/* Corpo com Scroll */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Título do Catálogo
                </label>
                <input
                  type="text"
                  value={pdfOptions.title}
                  onChange={(e) =>
                    setPdfOptions({ ...pdfOptions, title: e.target.value })
                  }
                  className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-slate-950 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border border-gray-100 dark:border-slate-800 rounded-lg">
                  <label
                    className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer flex-1"
                    htmlFor="check-price"
                  >
                    Mostrar Preços
                  </label>
                  <input
                    id="check-price"
                    type="checkbox"
                    checked={pdfOptions.showPrices}
                    onChange={(e) =>
                      setPdfOptions({
                        ...pdfOptions,
                        showPrices: e.target.checked,
                      })
                    }
                    className="w-5 h-5 rounded text-primary focus:ring-primary cursor-pointer"
                  />
                </div>

                {pdfOptions.showPrices && (
                  <div className="p-3 border border-gray-100 dark:border-slate-800 rounded-lg bg-gray-50 dark:bg-slate-800/50">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tipo de Preço
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setPdfOptions({ ...pdfOptions, priceType: 'price' })
                        }
                        className={`flex-1 py-2 px-3 rounded-lg border font-medium transition-all text-sm ${
                          pdfOptions.priceType === 'price'
                            ? 'bg-primary text-white border-primary shadow-md'
                            : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        Preço Custo
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPdfOptions({
                            ...pdfOptions,
                            priceType: 'sale_price',
                          })
                        }
                        className={`flex-1 py-2 px-3 rounded-lg border font-medium transition-all text-sm ${
                          pdfOptions.priceType === 'sale_price'
                            ? 'bg-primary text-white border-primary shadow-md'
                            : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        Preço Sugerido
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tamanho das Imagens (Zoom)
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((z) => (
                    <button
                      key={z}
                      type="button"
                      onClick={() =>
                        setPdfOptions({ ...pdfOptions, imageZoom: z })
                      }
                      className={`
                                        flex-1 py-2.5 rounded-lg border font-medium transition-all
                                        ${
                                          pdfOptions.imageZoom === z
                                            ? 'bg-primary text-white border-primary shadow-md ring-2 ring-primary/30 dark:ring-primary/20'
                                            : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                                        }
                                    `}
                    >
                      {z}x
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {pdfOptions.imageZoom === 1 &&
                    'Lista compacta (Muitos itens)'}
                  {pdfOptions.imageZoom === 3 && 'Equilibrado (Recomendado)'}
                  {pdfOptions.imageZoom === 5 && 'Imagens Grandes (Detalhes)'}
                </p>
              </div>
            </div>

            {/* Footer Fixo */}
            <div className="p-6 pt-4 border-t border-gray-100 dark:border-slate-800 flex gap-3 bg-gray-50/50 dark:bg-slate-900/50 rounded-b-2xl">
              <button
                onClick={() => setShowPdfModal(false)}
                className="flex-1 py-3 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-600 dark:text-gray-300 font-medium hover:bg-white dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleGeneratePdf}
                disabled={isGeneratingPdf}
                className="flex-1 py-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-70 shadow-lg shadow-primary/30"
              >
                {isGeneratingPdf ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <Download size={20} />
                )}
                Gerar PDF
              </button>
            </div>

            {/* Barra de Progresso */}
            {isGeneratingPdf && (
              <div className="px-6 pb-6 pt-0">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span>{pdfProgress.message || 'Gerando PDF...'}</span>
                    <span>{pdfProgress.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
                      style={{ width: pdfProgress.progress + '%' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
              <button
                onClick={() => setShowTextModal(false)}
                className="flex-1 p-2 border border-gray-200 dark:border-slate-700 rounded dark:text-white hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkTextUpdate}
                className="flex-1 p-2 bg-primary text-white rounded hover:bg-primary/90"
              >
                Salvar
              </button>
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
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl max-w-sm w-full text-center border border-gray-200 dark:border-slate-800 shadow-xl">
            <Trash2 size={40} className="mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-bold mb-2 dark:text-white">
              Tem certeza?
            </h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
              Isso excluirá os itens selecionados.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 p-2 border border-gray-200 dark:border-slate-700 rounded dark:text-white hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={() => executeDelete()}
                className="flex-1 p-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Excluir
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
