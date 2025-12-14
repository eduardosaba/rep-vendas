'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
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
  FileSpreadsheet,
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

// --- INTERFACES E TIPOS ---

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

// --- DEFINIÇÕES ESTÁTICAS DE COLUNAS ---

const ALL_DATA_COLUMNS: Record<DataKey, ColumnDefinition> = {
  name: { key: 'name', title: 'Produto', isSortable: true, align: 'left' },
  reference_code: {
    key: 'reference_code',
    title: 'Referência',
    isSortable: true,
    align: 'left',
  },
  sku: { key: 'sku', title: 'SKU', isSortable: true, align: 'left' },
  barcode: {
    key: 'barcode',
    title: 'Barcode',
    isSortable: true,
    align: 'left',
  },
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
    title: 'Preço (R$)',
    isSortable: true,
    isNumeric: true,
    align: 'right',
  },
  sale_price: {
    key: 'sale_price',
    title: 'Preço Venda',
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
    title: 'Ativo',
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
  id: { key: 'id', title: 'ID', isSortable: true, align: 'left' },
  created_at: {
    key: 'created_at',
    title: 'Criado em',
    isSortable: true,
    align: 'left',
  },
  image_url: {
    key: 'image_url',
    title: 'Imagem',
    isSortable: false,
    align: 'left',
  },
  image_path: {
    key: 'image_path',
    title: 'Imagem (Storage)',
    isSortable: false,
    align: 'left',
  },
  external_image_url: {
    key: 'external_image_url',
    title: 'Imagem (Externa)',
    isSortable: false,
    align: 'left',
  },
  description: {
    key: 'description',
    title: 'Descrição',
    isSortable: false,
    align: 'left',
  },
  technical_specs: {
    key: 'technical_specs',
    title: 'Ficha Técnica',
    isSortable: false,
    align: 'left',
  },
};

const DEFAULT_PREFS: UserPreferences = {
  columnOrder: [
    'name',
    'reference_code',
    'sku',
    'price',
    'brand',
    'category',
    'stock_quantity',
    'is_active',
    'is_launch',
    'is_best_seller',
    'id',
    'created_at',
    'barcode',
    'color',
  ],
  visibleKeys: new Set([
    'name',
    'reference_code',
    'sku',
    'price',
    'brand',
    'is_active',
  ]),
};

// --- COMPONENTE PRINCIPAL ---

export function ProductsTable({ initialProducts }: ProductsTableProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Hook de limites do plano
  const { canCreate, usage, loading: limitLoading } = usePlanLimits();

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [availableBrands, setAvailableBrands] = useState<BrandOption[]>([]);
  const [availableCategories, setAvailableCategories] = useState<
    { name: string }[]
  >([]);

  // Estado de Colunas Persistidas
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

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAllMatching, setSelectAllMatching] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);

  // PDF
  const [showPdfModal, setShowPdfModal] = useState(false);

  // Logger que evita acessar `console` em ambientes sem DOM
  const logError = (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    if (typeof console !== 'undefined' && console.error) console.error(...args);
  };
  const [pdfOptions, setPdfOptions] = useState({
    showPrices: true,
    title: 'Catálogo de Produtos',
    imageZoom: 3,
  });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // --- PERSISTÊNCIA E AUTENTICAÇÃO ---

  useEffect(() => {
    const getUserId = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        setUserId('guest');
      }
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
          logError('persistRemoteRow upsert error', error);
          return false;
        }
        return true;
      } catch (ex) {
        logError('persistRemoteRow exception', ex);
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
      const localKey = `product_table_prefs:${userId}`;
      const ok = await persistRemoteRow(row);
      if (!ok) {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(localKey, JSON.stringify(row));
        }
        try {
          toast.error(
            'Não foi possível salvar preferências remotamente — salvo localmente.'
          );
        } catch {
          /* ignore toast failures */
        }
      }
    },
    [persistRemoteRow, userId]
  );

  const syncPreferencesFromLocal = useCallback(async () => {
    if (!userId || userId === 'guest') return;
    const localKey = `product_table_prefs:${userId}`;
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const raw = window.localStorage.getItem(localKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SupabasePrefRow;
      const ok = await persistRemoteRow(parsed);
      if (ok) {
        window.localStorage.removeItem(localKey);
        const loadedOrder = (parsed.column_order as DataKey[]).filter(
          (key) => ALL_DATA_COLUMNS[key]
        );
        const loadedVisibleKeys = new Set(
          (parsed.visible_keys as DataKey[]).filter(
            (key) => ALL_DATA_COLUMNS[key]
          )
        );
        setColumnOrder(loadedOrder);
        setVisibleColumnKeys(loadedVisibleKeys);
      }
    } catch (e) {
      logError('syncPreferencesFromLocal error', e);
    }
  }, [persistRemoteRow, userId]);

  useEffect(() => {
    if (!isAuthReady) return;
    if (!userId || userId === 'guest') return;
    syncPreferencesFromLocal();
  }, [isAuthReady, userId, syncPreferencesFromLocal]);

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
      .limit(1)
      .then(({ data }) => {
        let saveNeeded = false;
        if (data && data.length > 0) {
          const loadedData = data[0];
          const loadedOrder = (loadedData.column_order as DataKey[]).filter(
            (key) => ALL_DATA_COLUMNS[key]
          );
          const loadedVisibleKeys = new Set(
            (loadedData.visible_keys as DataKey[]).filter(
              (key) => ALL_DATA_COLUMNS[key]
            )
          );
          const missingKeys = DEFAULT_PREFS.columnOrder.filter(
            (key) => !loadedOrder.includes(key)
          );
          const finalOrder = [...loadedOrder, ...missingKeys];
          setColumnOrder(finalOrder);
          setVisibleColumnKeys(loadedVisibleKeys);
        } else {
          setColumnOrder(DEFAULT_PREFS.columnOrder);
          setVisibleColumnKeys(DEFAULT_PREFS.visibleKeys);
          saveNeeded = true;
        }
        setIsLoadingPrefs(false);
        if (saveNeeded)
          savePreferences(DEFAULT_PREFS.columnOrder, DEFAULT_PREFS.visibleKeys);
      });

    const channel = supabase
      .channel('user_prefs_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: PREFS_TABLE_NAME,
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newPrefs = payload.new as SupabasePrefRow;
          if (newPrefs.table_key === PREFS_TABLE_KEY) {
            const loadedOrder = (newPrefs.column_order as DataKey[]).filter(
              (key) => ALL_DATA_COLUMNS[key]
            );
            const loadedVisibleKeys = new Set(
              (newPrefs.visible_keys as DataKey[]).filter(
                (key) => ALL_DATA_COLUMNS[key]
              )
            );
            setColumnOrder(loadedOrder);
            setVisibleColumnKeys(loadedVisibleKeys);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, isAuthReady, userId, savePreferences]);

  const toggleColumn = (key: DataKey) => {
    const newVisibleKeys = new Set(visibleColumnKeys);
    if (newVisibleKeys.has(key)) newVisibleKeys.delete(key);
    else newVisibleKeys.add(key);
    setVisibleColumnKeys(newVisibleKeys);
    savePreferences(columnOrder, newVisibleKeys);
  };

  const moveColumn = (key: DataKey, direction: 'up' | 'down') => {
    const currentIndex = columnOrder.indexOf(key);
    if (currentIndex === -1) return;
    let newIndex = currentIndex;
    if (direction === 'up' && currentIndex > 0) newIndex = currentIndex - 1;
    else if (direction === 'down' && currentIndex < columnOrder.length - 1)
      newIndex = currentIndex + 1;
    else return;
    const newOrder = [...columnOrder];
    [newOrder[currentIndex], newOrder[newIndex]] = [
      newOrder[newIndex],
      newOrder[currentIndex],
    ];
    setColumnOrder(newOrder);
    savePreferences(newOrder, visibleColumnKeys);
  };

  // --- FETCH INICIAL ---
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const userIdVal = user.id;

        const { data: productBrands } = await supabase
          .from('products')
          .select('brand')
          .eq('user_id', userIdVal)
          .not('brand', 'is', null);
        const brandNames = Array.from(
          new Set(
            (productBrands || [])
              .map((b: { brand?: string | null }) => b.brand)
              .filter((v): v is string => !!v)
          )
        );
        let brandsWithLogos: BrandOption[] = [];
        if (brandNames.length > 0) {
          const { data: brandsData } = await supabase
            .from('brands')
            .select('name, logo_url')
            .eq('user_id', userIdVal)
            .in('name', brandNames);
          const logoMap: Record<string, string | null> = {};
          (brandsData || []).forEach(
            (b: { name?: string; logo_url?: string | null }) => {
              if (!b.name) return;
              logoMap[b.name] = b.logo_url || null;
            }
          );
          brandsWithLogos = brandNames
            .sort((a: string, b: string) => a.localeCompare(b))
            .map((name: string) => ({ name, logo_url: logoMap[name] || null }));
        }
        setAvailableBrands(brandsWithLogos);

        const { data: productCats } = await supabase
          .from('products')
          .select('category')
          .eq('user_id', userIdVal)
          .not('category', 'is', null);
        const catNames = Array.from(
          new Set(
            (productCats || [])
              .map((c: { category?: string | null }) => c.category)
              .filter((v): v is string => !!v)
          )
        ).sort((a: string, b: string) => a.localeCompare(b));
        setAvailableCategories(catNames.map((name: string) => ({ name })));
      } catch (err) {
        logError('fetchOptions error', err);
      }
    };
    fetchOptions();
  }, [supabase]);

  // --- MEMOIZAÇÃO E PROCESSAMENTO ---
  const visibleAndOrderedColumns = useMemo(() => {
    return columnOrder
      .filter((key) => visibleColumnKeys.has(key))
      .map((key) => ALL_DATA_COLUMNS[key]);
  }, [columnOrder, visibleColumnKeys]);

  const kpis = useMemo(() => {
    const activeProducts = products.filter((p) => p.is_active !== false);
    const total = products.length;
    const uniqueBrands = new Set(
      activeProducts.map((p) => p.brand).filter(Boolean)
    ).size;
    const launches = activeProducts.filter((p) => p.is_launch).length;
    const bestSellers = activeProducts.filter((p) => p.is_best_seller).length;
    return { total, uniqueBrands, launches, bestSellers };
  }, [products]);

  const processedProducts = useMemo(() => {
    const data = products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.reference_code &&
          p.reference_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.barcode && p.barcode.includes(searchTerm));
      const matchesLaunch = filters.onlyLaunch ? p.is_launch : true;
      const matchesBestSeller = filters.onlyBestSeller
        ? p.is_best_seller
        : true;
      const costVal = p.cost ?? p.price ?? 0;
      const matchesMinPrice = filters.minPrice
        ? costVal >= Number(filters.minPrice)
        : true;
      const matchesMaxPrice = filters.maxPrice
        ? costVal <= Number(filters.maxPrice)
        : true;
      const matchesBrand =
        filters.brand.length === 0 ||
        (p.brand && filters.brand.includes(p.brand));
      const matchesCategory = filters.category
        ? p.category?.toLowerCase().includes(filters.category.toLowerCase())
        : true;
      const matchesColor = filters.color
        ? p.color?.toLowerCase().includes(filters.color.toLowerCase())
        : true;
      let matchesStock = true;
      if (filters.stockStatus === 'out_of_stock')
        matchesStock = p.track_stock === true && (p.stock_quantity || 0) <= 0;
      else if (filters.stockStatus === 'in_stock')
        matchesStock = !p.track_stock || (p.stock_quantity || 0) > 0;
      let matchesVisibility = true;
      if (filters.visibility === 'active')
        matchesVisibility = p.is_active !== false;
      if (filters.visibility === 'inactive')
        matchesVisibility = p.is_active === false;
      return (
        matchesSearch &&
        matchesLaunch &&
        matchesBestSeller &&
        matchesMinPrice &&
        matchesMaxPrice &&
        matchesBrand &&
        matchesCategory &&
        matchesStock &&
        matchesColor &&
        matchesVisibility
      );
    });

    if (sortConfig !== null) {
      data.sort((a, b) => {
        const aRec = a as unknown as Record<string, unknown>;
        const bRec = b as unknown as Record<string, unknown>;
        const aValue = aRec[sortConfig.key];
        const bValue = bRec[sortConfig.key];
        if (aValue == null) return 1;
        if (bValue == null) return -1;
        if (aValue < (bValue as any))
          return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > (bValue as any))
          return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [products, searchTerm, sortConfig, filters]);

  const totalPages = Math.max(
    1,
    Math.ceil(processedProducts.length / itemsPerPage)
  );
  const paginatedProducts = processedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when the filtered/processed list changes to avoid empty pages
  useEffect(() => {
    setCurrentPage(1);
  }, [processedProducts.length]);

  // --- HANDLERS ---
  const handleRefresh = () => {
    if (typeof window !== 'undefined' && window.location)
      window.location.reload();
  };
  const requestSort = (key: DataKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc')
      direction = 'desc';
    setSortConfig({ key, direction });
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
  const handleSelectAllMatching = () => {
    const allIds = processedProducts.map((p) => p.id);
    setSelectedIds(allIds);
    setSelectAllMatching(true);
  };
  const toggleSelectOne = (id: string) => {
    setSelectAllMatching(false);
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);

    // VALIDACAO: Verifica se existem produtos com imagem externa SEM sync
    // Precisamos checar na lista filtrada (o que será impresso)
    let productsToPrint = [];
    if (selectedIds.length > 0) {
      productsToPrint = processedProducts.filter((p) =>
        selectedIds.includes(p.id)
      );
    } else {
      productsToPrint = processedProducts;
    }

    const unsyncedCount = productsToPrint.filter(
      (p) => !p.image_path && p.external_image_url
    ).length;

    if (unsyncedCount > 0) {
      toast.error('Imagens não sincronizadas!', {
        description: `Existem ${unsyncedCount} produtos com imagens apenas externas. Sincronize antes para evitar erros no PDF.`,
        action: {
          label: 'Ir Sincronizar',
          onClick: () => router.push('/dashboard/manage-external-images'),
        },
        duration: 8000, // Tempo maior para ler
      });
      setIsGeneratingPdf(false);
      return; // BLOQUEIA A GERAÇÃO
    }

    const toastId = toast.loading('Gerando catálogo PDF...');
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // usar o id retornado pela chamada de auth (evita race com state userId)
      // Resiliência: usar .maybeSingle() para não quebrar se não houver settings
      const { data: settings } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      const coverUrl = settings?.logo_url || undefined;
      const storeName = settings?.name || 'Catálogo';

      const brandMap: Record<string, string | null> = {};
      availableBrands.forEach((b) => {
        brandMap[b.name] = b.logo_url || null;
      });

      await generateCatalogPDF(productsToPrint, {
        showPrices: pdfOptions.showPrices,
        title: pdfOptions.title,
        storeName: storeName,
        storeLogo: coverUrl,
        coverImageUrl: undefined,
        imageZoom: pdfOptions.imageZoom,
        brandMapping: brandMap,
      });

      toast.success('PDF Gerado!', { id: toastId });
      setShowPdfModal(false);
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao gerar PDF', {
        id: toastId,
        description: error.message,
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleBulkUpdate = async (field: string, value: boolean | string) => {
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
      setSelectAllMatching(false);
    } catch {
      toast.error('Erro');
    } finally {
      setIsProcessing(false);
    }
  };

  const openTextModal = (field: 'brand' | 'category', label: string) => {
    setTextConfig({ field, value: '', label });
    setShowTextModal(true);
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
      setSelectAllMatching(false);
    } catch {
      toast.error('Erro');
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
      toast.success('Preços atualizados!', { description: 'Recarregue.' });
      setShowPriceModal(false);
      setSelectedIds([]);
      window.location.reload();
    } catch {
      toast.error('Erro');
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmDeleteOne = (id: string) => {
    setDeleteTargetId(id);
    setShowDeleteModal(true);
  };
  const confirmDeleteBulk = () => {
    setDeleteTargetId(null);
    setShowDeleteModal(true);
  };
  const executeDelete = async (forcePreferSoft = false) => {
    setIsProcessing(true);
    try {
      if (deleteTargetId) {
        if (forcePreferSoft) {
          const { error: upErr } = await supabase
            .from('products')
            .update({ is_active: false })
            .eq('id', deleteTargetId);
          if (upErr) throw upErr;
          setProducts((prev) =>
            prev.map((p) =>
              p.id === deleteTargetId ? { ...p, is_active: false } : p
            )
          );
          toast.success('Produto inativado');
        } else {
          const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', deleteTargetId);
          if (error) throw error;
          setProducts((prev) => prev.filter((p) => p.id !== deleteTargetId));
          toast.success('Excluído');
        }
      } else {
        const result: any = await bulkDelete(selectedIds, {
          preferSoft: forcePreferSoft || preferSoftDelete,
        });
        const deleted = Array.isArray(result?.deletedIds)
          ? result.deletedIds
          : [];
        const softDeleted = Array.isArray(result?.softDeletedIds)
          ? result.softDeletedIds
          : [];
        setProducts((prev) =>
          prev
            .map((p) =>
              softDeleted.includes(p.id) ? { ...p, is_active: false } : p
            )
            .filter((p) => !deleted.includes(p.id))
        );
        if (deleted.length > 0 || softDeleted.length > 0)
          toast.success(
            `${deleted.length} excluídos, ${softDeleted.length} inativados`
          );
        setSelectedIds([]);
      }
      setShowDeleteModal(false);
    } catch (e: any) {
      toast.error('Erro', { description: e.message });
    } finally {
      setIsProcessing(false);
      setDeleteTargetId(null);
    }
  };

  // --- COMPONENTES ANINHADOS ---
  const SortableHeader = ({
    label,
    sortKey,
    align = 'left',
  }: {
    label: string;
    sortKey: DataKey;
    align?: 'left' | 'right' | 'center';
  }) => (
    <th
      className={`px-6 py-4 font-medium cursor-pointer hover:bg-gray-100 transition-colors group select-none ${align === 'right' ? 'text-right' : 'text-left'}`}
      onClick={() => requestSort(sortKey)}
    >
      <div
        className={`flex items-center gap-2 ${align === 'right' ? 'justify-end' : 'justify-start'}`}
      >
        {label}
        <span className="text-gray-400 group-hover:text-indigo-600 transition-colors">
          {sortConfig?.key === sortKey ? (
            sortConfig.direction === 'asc' ? (
              <ArrowUp size={14} />
            ) : (
              <ArrowDown size={14} />
            )
          ) : (
            <ArrowUpDown
              size={14}
              className="opacity-0 group-hover:opacity-50"
            />
          )}
        </span>
      </div>
    </th>
  );

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
      if (typeof document !== 'undefined') {
        document.addEventListener('mousedown', handleClickOutside);
        return () =>
          document.removeEventListener('mousedown', handleClickOutside);
      }
      return () => {};
    }, [isColumnDropdownOpen]);

    return (
      <div className="relative inline-block text-left" ref={dropdownRef}>
        <button
          onClick={() => setIsColumnDropdownOpen(!isColumnDropdownOpen)}
          className={`px-4 py-2 rounded-lg border flex items-center gap-2 font-medium transition-colors ${isColumnDropdownOpen ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          <ListOrdered size={18} /> Colunas
        </button>
        {isColumnDropdownOpen && (
          <div className="absolute right-0 mt-2 w-72 rounded-lg shadow-xl bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 z-50 max-h-96 overflow-y-auto">
            <div className="py-1 p-3">
              <p className="text-xs text-gray-500 font-semibold mb-2 px-2">
                Selecione e Ordene as Colunas
              </p>
              {columnOrder.map((key, index) => {
                const def = ALL_DATA_COLUMNS[key];
                const isChecked = visibleColumnKeys.has(key);
                const isFirst = index === 0;
                const isLast = index === columnOrder.length - 1;
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition duration-150 ease-in-out"
                  >
                    <div className="flex items-center min-w-0 flex-1">
                      <input
                        id={`col-${key}`}
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleColumn(key)}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <label
                        htmlFor={`col-${key}`}
                        className="ml-3 block text-sm font-medium text-gray-700 select-none truncate cursor-pointer"
                        title={def.title}
                      >
                        {def.title}
                      </label>
                    </div>
                    <div className="flex-shrink-0 flex items-center space-x-1 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveColumn(key, 'up');
                        }}
                        disabled={isFirst || !isChecked}
                        className={`p-1 rounded-full text-indigo-600 ${isFirst || !isChecked ? 'opacity-30 cursor-not-allowed' : 'hover:bg-indigo-100'}`}
                        title="Mover para a esquerda"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveColumn(key, 'down');
                        }}
                        disabled={isLast || !isChecked}
                        className={`p-1 rounded-full text-indigo-600 ${isLast || !isChecked ? 'opacity-30 cursor-not-allowed' : 'hover:bg-indigo-100'}`}
                        title="Mover para a direita"
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

  const renderCellContent = (product: Product, key: DataKey) => {
    const def = ALL_DATA_COLUMNS[key];
    // @ts-ignore
    const value = product[key];

    if (key === 'name') {
      return (
        <div className="flex items-center gap-4">
          <div className="relative h-10 w-10 rounded-lg bg-gray-100 overflow-hidden border">
            {(() => {
              // Lógica de Prioridade de Imagem
              let img: string | null = null;
              if (product.image_path) {
                const supabaseBase =
                  typeof process !== 'undefined'
                    ? (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
                    : '';
                img = supabaseBase
                  ? `${supabaseBase}/storage/v1/object/public/products/${product.image_path}`
                  : null;
              } else if (product.image_url) img = product.image_url;
              else if (product.external_image_url)
                img = product.external_image_url;
              else if (product.images && product.images.length > 0)
                img = product.images[0] || null;

              return img ? (
                <Image
                  src={img}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full w-full">
                  <ImageIcon size={16} className="text-gray-400" />
                </div>
              );
            })()}
          </div>
          <div>
            <span
              onClick={() => setViewProduct(product)}
              className="font-medium text-gray-900 block flex items-center gap-2 cursor-pointer"
            >
              {product.name}
              {product.is_active === false && (
                <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 rounded flex items-center gap-1">
                  <EyeOff size={10} /> Inativo
                </span>
              )}
            </span>
            <span className="text-xs text-gray-400">{product.brand}</span>
          </div>
        </div>
      );
    }
    if (def.isNumeric) {
      if (key === 'price' || key === 'cost')
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(value as number);
      return typeof value === 'number' ? value.toLocaleString('pt-BR') : '-';
    }
    if (key === 'is_active')
      return (
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center justify-center min-w-[70px] ${value === false ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}`}
        >
          {value === false ? 'Inativo' : 'Ativo'}
        </span>
      );
    if (key === 'is_launch')
      return value ? (
        <span title="Lançamento">
          <Zap size={16} className="text-purple-500 mx-auto" />
        </span>
      ) : (
        '-'
      );
    if (key === 'is_best_seller')
      return value ? (
        <span title="Best Seller">
          <Star size={16} className="text-orange-500 mx-auto" />
        </span>
      ) : (
        '-'
      );
    if (key === 'barcode') {
      const raw = value ? String(value) : '';
      const digits = raw.replace(/\D/g, '');
      const canRender = /^[0-9]{7,13}$/.test(digits);
      return (
        <div className="flex items-center gap-3">
          {raw ? (
            canRender ? (
              <div className="flex-shrink-0">
                <ProductBarcode value={raw} height={28} scale={1} />
              </div>
            ) : (
              <span className="text-gray-600 font-mono text-xs">{raw}</span>
            )
          ) : (
            <span className="text-gray-600 font-mono text-xs">-</span>
          )}
        </div>
      );
    }
    if (key === 'reference_code' || key === 'sku' || key === 'id')
      return (
        <span className="text-gray-600 font-mono text-xs">
          {typeof value === 'object' ? JSON.stringify(value) : (value ?? '-')}
        </span>
      );
    if (key === 'technical_specs') {
      return (
        <pre className="text-xs text-gray-600 whitespace-pre-wrap">
          {value ? JSON.stringify(value, null, 2) : '-'}
        </pre>
      );
    }
    const rendered =
      typeof value === 'object' ? JSON.stringify(value) : (value ?? '-');
    return <span className="text-gray-700">{rendered}</span>;
  };

  if (isLoadingPrefs) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="animate-spin -ml-1 mr-3 h-8 w-8 text-indigo-600" />
        <span className="text-xl text-indigo-600">
          A carregar preferências...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-xs font-bold uppercase mb-1">
            <Package size={14} /> Total Produtos
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-slate-50">
            {kpis.total}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-xs font-bold uppercase mb-1">
            <Briefcase size={14} /> Marcas Ativas
          </div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {kpis.uniqueBrands}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-xs font-bold uppercase mb-1">
            <Zap size={14} /> Lançamentos
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {kpis.launches}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-xs font-bold uppercase mb-1">
            <Star size={14} /> Best Sellers
          </div>
          <div className="text-2xl font-bold text-orange-500 dark:text-orange-400">
            {kpis.bestSellers}
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <button
          onClick={() => {
            if (!canCreate && !limitLoading) {
              toast.error('Limite do plano atingido!', {
                description: `Você usou ${usage.current} de ${usage.max} produtos. Faça upgrade para continuar.`,
                action: {
                  label: 'Ver Planos',
                  onClick: () => router.push('/dashboard/settings?tab=billing'),
                },
              });
              return;
            }
            router.push('/dashboard/products/new');
          }}
          disabled={limitLoading}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold shadow-sm transition-colors ${
            limitLoading
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : canCreate
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-orange-500 text-white hover:bg-orange-600'
          }`}
        >
          {limitLoading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Plus size={18} />
          )}
          <span>{limitLoading ? 'Verificando...' : 'Novo Produto'}</span>
        </button>
        <button
          onClick={() => setShowPdfModal(true)}
          className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-3 rounded-xl font-medium hover:bg-gray-50 shadow-sm transition-colors"
        >
          <FileText size={18} /> <span className="hidden sm:inline">PDF</span>
        </button>
        <Link
          href="/dashboard/products/matcher"
          className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-3 rounded-xl font-medium hover:bg-gray-50 shadow-sm transition-colors"
        >
          <LinkIcon size={18} />{' '}
          <span className="hidden sm:inline">Vincular</span>
        </Link>
        <Link
          href="/dashboard/products/import-massa"
          className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-3 rounded-xl font-medium hover:bg-gray-50 shadow-sm transition-colors"
        >
          <FileSpreadsheet size={18} />{' '}
          <span className="hidden sm:inline">Excel</span>
        </Link>
        <Link
          href="/dashboard/products/import-visual"
          className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-3 rounded-xl font-medium hover:bg-gray-50 shadow-sm transition-colors"
        >
          <UploadCloud size={18} />{' '}
          <span className="hidden sm:inline">Visual</span>
        </Link>
      </div>

      {/* Busca e Filtros */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 justify-between">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Buscar nome, referência, sku..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 focus:border-indigo-500 outline-none"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg border flex items-center gap-2 font-medium transition-colors ${showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <Filter size={18} /> Filtros
            </button>
            <ColumnSelectorDropdown />
          </div>
          <div className="flex gap-2">
            <button
              aria-label="Atualizar"
              onClick={handleRefresh}
              className="p-2.5 text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg"
            >
              <RefreshCcw size={18} />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-2">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                Preço Mínimo
              </label>
              <input
                type="number"
                placeholder="0,00"
                className="w-full p-2 border rounded text-sm"
                value={filters.minPrice}
                onChange={(e) =>
                  setFilters({ ...filters, minPrice: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                Preço Máximo
              </label>
              <input
                type="number"
                placeholder="0,00"
                className="w-full p-2 border rounded text-sm"
                value={filters.maxPrice}
                onChange={(e) =>
                  setFilters({ ...filters, maxPrice: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                Visibilidade
              </label>
              <select
                className="w-full p-2 border rounded text-sm bg-white"
                value={filters.visibility}
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
                Status Estoque
              </label>
              <select
                className="w-full p-2 border rounded text-sm bg-white"
                value={filters.stockStatus}
                onChange={(e) =>
                  setFilters({ ...filters, stockStatus: e.target.value })
                }
              >
                <option value="all">Todos</option>
                <option value="in_stock">Em Estoque</option>
                <option value="out_of_stock">Esgotado</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-500 uppercase block">
                Tags
              </label>
              <div className="flex gap-2">
                <label className="flex items-center gap-2 cursor-pointer border p-2 rounded w-full hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={filters.onlyLaunch}
                    onChange={(e) =>
                      setFilters({ ...filters, onlyLaunch: e.target.checked })
                    }
                    className="rounded text-indigo-600"
                  />
                  <span className="text-sm text-gray-700">Lançamentos</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer border p-2 rounded w-full hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={filters.onlyBestSeller}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        onlyBestSeller: e.target.checked,
                      })
                    }
                    className="rounded text-indigo-600"
                  />
                  <span className="text-sm text-gray-700">Best Sellers</span>
                </label>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                Marca
              </label>
              <input
                list="filter-brands"
                type="text"
                placeholder="Todas"
                className="w-full p-2 border rounded text-sm"
                value={filters.brand.join(', ')}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    brand: e.target.value ? [e.target.value] : [],
                  })
                }
              />
              <datalist id="filter-brands">
                {availableBrands.map((b, i) => (
                  <option key={i} value={b.name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                Categoria
              </label>
              <input
                list="filter-categories"
                type="text"
                placeholder="Todas"
                className="w-full p-2 border rounded text-sm"
                value={filters.category}
                onChange={(e) =>
                  setFilters({ ...filters, category: e.target.value })
                }
              />
              <datalist id="filter-categories">
                {availableCategories.map((c, i) => (
                  <option key={i} value={c.name} />
                ))}
              </datalist>
            </div>
            <div className="col-span-full flex justify-end pt-2">
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
                className="text-sm text-red-500 hover:underline flex items-center gap-1"
              >
                <X size={14} /> Limpar Filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg flex items-center justify-center text-sm text-blue-800 animate-in fade-in">
          {!selectAllMatching ? (
            <>
              <span className="mr-2">
                Os <strong>{selectedIds.length}</strong> produtos desta página
                estão selecionados.
              </span>
              {processedProducts.length > selectedIds.length && (
                <button
                  onClick={handleSelectAllMatching}
                  className="font-bold underline hover:text-blue-900"
                >
                  Selecionar todos os {processedProducts.length}?
                </button>
              )}
            </>
          ) : (
            <>
              <span className="mr-2">
                Todos os <strong>{processedProducts.length}</strong> produtos
                selecionados.
              </span>
              <button
                onClick={() => {
                  setSelectedIds([]);
                  setSelectAllMatching(false);
                }}
                className="font-bold underline hover:text-blue-900 ml-2"
              >
                Limpar seleção
              </button>
            </>
          )}
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex flex-wrap items-center gap-6 animate-in slide-in-from-bottom-4 max-w-[95vw] justify-center">
          <div className="flex items-center gap-2 border-r border-gray-700 pr-6">
            <span className="bg-white text-black text-xs font-bold px-2 py-1 rounded-full">
              {selectedIds.length}
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => handleBulkUpdate('is_active', true)}
              disabled={isProcessing}
              className="p-2 hover:bg-white/10 rounded-lg flex flex-col items-center gap-1 text-[10px] min-w-[60px]"
            >
              <Eye size={18} className="text-blue-400" /> Ativar
            </button>
            <button
              onClick={() => handleBulkUpdate('is_active', false)}
              disabled={isProcessing}
              className="p-2 hover:bg-white/10 rounded-lg flex flex-col items-center gap-1 text-[10px] min-w-[60px]"
            >
              <EyeOff size={18} className="text-gray-400" /> Inativar
            </button>
            <div className="w-px h-8 bg-gray-700 mx-2"></div>
            <button
              onClick={() => handleBulkUpdate('is_launch', true)}
              disabled={isProcessing}
              className="p-2 hover:bg-white/10 rounded-lg flex flex-col items-center gap-1 text-[10px] min-w-[60px]"
            >
              <Zap size={18} className="text-purple-400" /> Novo
            </button>
            <button
              onClick={() => handleBulkUpdate('is_best_seller', true)}
              disabled={isProcessing}
              className="p-2 hover:bg-white/10 rounded-lg flex flex-col items-center gap-1 text-[10px] min-w-[60px]"
            >
              <Star size={18} className="text-yellow-400" /> Best Seller
            </button>
            <button
              onClick={() => openTextModal('brand', 'Marca')}
              disabled={isProcessing}
              className="p-2 hover:bg-white/10 rounded-lg flex flex-col items-center gap-1 text-[10px] min-w-[60px]"
            >
              <Tag size={18} className="text-blue-400" /> Marca
            </button>
            <button
              onClick={() => openTextModal('category', 'Categoria')}
              disabled={isProcessing}
              className="p-2 hover:bg-white/10 rounded-lg flex flex-col items-center gap-1 text-[10px] min-w-[60px]"
            >
              <Layers size={18} className="text-orange-400" /> Categoria
            </button>
            <button
              onClick={() => setShowPriceModal(true)}
              disabled={isProcessing}
              className="p-2 hover:bg-white/10 rounded-lg flex flex-col items-center gap-1 text-[10px] min-w-[60px]"
            >
              <DollarSign size={18} className="text-green-400" /> Preço
            </button>
            <div className="w-px h-8 bg-gray-700 mx-2"></div>
            <button
              onClick={confirmDeleteBulk}
              disabled={isProcessing}
              className="p-2 hover:bg-red-900/50 rounded-lg flex flex-col items-center gap-1 text-[10px] text-red-400 min-w-[60px]"
            >
              <Trash2 size={18} /> Excluir
            </button>
          </div>
          <button
            onClick={() => setSelectedIds([])}
            className="ml-2 p-1 hover:bg-white/20 rounded-full"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* TABELA */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-4 py-4 w-10">
                  <button
                    aria-label="Selecionar todos"
                    onClick={toggleSelectAll}
                    className="text-gray-400 hover:text-indigo-600"
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
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleAndOrderedColumns.length + 2}
                    className="py-16 text-center"
                  >
                    {/* Se não tem produtos no total (Usuário Novo), mostra Onboarding */}
                    {initialProducts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                          <Rocket size={32} className="text-indigo-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                          Vamos começar o seu catálogo?
                        </h3>
                        <p className="text-gray-500 text-sm mb-6">
                          Você ainda não tem produtos cadastrados. Escolha como
                          prefere começar:
                        </p>
                        <div className="flex gap-3">
                          <Link
                            href="/dashboard/products/import-massa"
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                          >
                            Importar Excel
                          </Link>
                          <Link
                            href="/dashboard/products/import-visual"
                            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                          >
                            Usar Fotos
                          </Link>
                        </div>
                      </div>
                    ) : (
                      // Se tem produtos mas o filtro não achou nada (Busca vazia)
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <Search size={48} className="mb-2 opacity-20" />
                        <p>Nenhum produto encontrado com esses filtros.</p>
                        <button
                          onClick={() => {
                            setSearchTerm('');
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
                            });
                          }}
                          className="text-indigo-600 text-sm hover:underline mt-2"
                        >
                          Limpar busca
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => (
                  <tr
                    key={product.id}
                    className={`hover:bg-gray-50 transition-colors group ${selectedIds.includes(product.id) ? 'bg-indigo-50/50' : ''} ${product.is_active === false ? 'bg-gray-50 opacity-60 grayscale' : ''}`}
                  >
                    <td className="px-4 py-4">
                      <button
                        aria-label={`Selecionar ${product.name}`}
                        onClick={() => toggleSelectOne(product.id)}
                        className={`transition-colors ${selectedIds.includes(product.id) ? 'text-indigo-600' : 'text-gray-300'}`}
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
                        key={`${product.id}-${col.key}`}
                        className={`px-6 py-4 text-gray-600 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                      >
                        {renderCellContent(product, col.key)}
                      </td>
                    ))}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 transition-colors">
                        <Link
                          href={`/dashboard/products/${product.id}`}
                          className="p-2 text-gray-400 hover:text-green-600 rounded-lg transition-colors"
                          title="Editar"
                          aria-label={`Editar ${product.name}`}
                        >
                          <Edit2 size={18} />
                        </Link>

                        {/* BOTÃO SYNC INDIVIDUAL */}
                        {!product.image_path && product.external_image_url && (
                          <SyncSingleButton
                            productId={product.id}
                            externalUrl={product.external_image_url}
                          />
                        )}

                        <button
                          aria-label={`Visualizar ${product.name}`}
                          onClick={() => setViewProduct(product)}
                          className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg"
                          title="Visualizar"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          aria-label={`Excluir ${product.name}`}
                          onClick={() => confirmDeleteOne(product.id)}
                          className="p-2 text-gray-400 hover:text-red-600 rounded-lg"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <p className="text-sm text-gray-500">
            Página {currentPage} de {totalPages} • Total:{' '}
            {processedProducts.length}
          </p>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-3 py-1 border rounded bg-white disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-3 py-1 border rounded bg-white disabled:opacity-50"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>

      {/* MODAL PDF (ATUALIZADO) */}
      {showPdfModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 border border-gray-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-4 text-gray-900 dark:text-slate-50">
              <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                <FileText size={24} />
              </div>
              <h3 className="font-bold text-lg">Gerar PDF</h3>
            </div>

            <div className="space-y-4">
              {/* Checkbox Preços */}
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={pdfOptions.showPrices}
                  onChange={(e) =>
                    setPdfOptions({
                      ...pdfOptions,
                      showPrices: e.target.checked,
                    })
                  }
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-5 h-5"
                />
                <span className="text-sm font-medium">Incluir Preços</span>
              </label>

              {/* Botões de Zoom */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                  <ZoomIn size={14} /> Tamanho da Foto (Zoom)
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((z) => (
                    <button
                      key={z}
                      onClick={() =>
                        setPdfOptions({ ...pdfOptions, imageZoom: z })
                      }
                      className={`
                        flex-1 py-2 rounded-lg text-sm font-bold border transition-all
                        ${
                          pdfOptions.imageZoom === z
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-105'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }
                      `}
                    >
                      {z}x
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-1 text-center">
                  {pdfOptions.imageZoom === 1 &&
                    'Lista compacta (10 itens/pág)'}
                  {pdfOptions.imageZoom === 2 && 'Lista padrão (5 itens/pág)'}
                  {pdfOptions.imageZoom === 3 && 'Equilibrado (3 itens/pág)'}
                  {pdfOptions.imageZoom >= 4 && 'Foco na imagem (2 itens/pág)'}
                </p>
              </div>

              {/* Título */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Título do Catálogo
                </label>
                <input
                  type="text"
                  value={pdfOptions.title}
                  onChange={(e) =>
                    setPdfOptions({ ...pdfOptions, title: e.target.value })
                  }
                  className="w-full p-2.5 border rounded-lg text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => setShowPdfModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleGeneratePdf}
                disabled={isGeneratingPdf}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 transition-opacity disabled:opacity-50"
              >
                {isGeneratingPdf ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Download size={18} />
                )}
                Baixar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {showTextModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-2xl animate-in zoom-in-95">
            <h3 className="font-bold text-lg mb-4">
              Definir {textConfig.label}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {textConfig.label}
                </label>
                {textConfig.field === 'brand' ? (
                  <>
                    <select
                      className="w-full p-2 border rounded mb-2"
                      value={
                        availableBrands.find((b) => b.name === textConfig.value)
                          ? textConfig.value
                          : textConfig.value === ''
                            ? ''
                            : '__other__'
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === '__other__')
                          setTextConfig({ ...textConfig, value: '' });
                        else setTextConfig({ ...textConfig, value: v });
                      }}
                    >
                      <option value="">-- Selecionar Marca --</option>
                      {availableBrands.map((b, i) => (
                        <option key={i} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                      <option value="__other__">Outro...</option>
                    </select>
                    {textConfig.value === '' && (
                      <input
                        type="text"
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Digite a marca..."
                        value={textConfig.value}
                        onChange={(e) =>
                          setTextConfig({
                            ...textConfig,
                            value: e.target.value,
                          })
                        }
                        autoFocus
                      />
                    )}
                  </>
                ) : (
                  <>
                    <select
                      className="w-full p-2 border rounded mb-2"
                      value={
                        availableCategories.find(
                          (c) => c.name === textConfig.value
                        )
                          ? textConfig.value
                          : textConfig.value === ''
                            ? ''
                            : '__other__'
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === '__other__')
                          setTextConfig({ ...textConfig, value: '' });
                        else setTextConfig({ ...textConfig, value: v });
                      }}
                    >
                      <option value="">-- Selecionar Categoria --</option>
                      {availableCategories.map((c, i) => (
                        <option key={i} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                      <option value="__other__">Outro...</option>
                    </select>
                    {textConfig.value === '' && (
                      <input
                        type="text"
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Digite a categoria..."
                        value={textConfig.value}
                        onChange={(e) =>
                          setTextConfig({
                            ...textConfig,
                            value: e.target.value,
                          })
                        }
                        autoFocus
                      />
                    )}
                  </>
                )}
              </div>
              <div className="flex gap-2 justify-end mt-4">
                <button
                  onClick={() => setShowTextModal(false)}
                  className="px-4 py-2 text-gray-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleBulkTextUpdate}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-indigo-600 text-white rounded font-bold flex gap-2 items-center"
                >
                  {isProcessing && (
                    <Loader2 className="animate-spin" size={16} />
                  )}{' '}
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick-view modal */}
      {viewProduct && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setViewProduct(null)}
          />
          <div className="relative bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 max-h-[90vh]">
            <button
              onClick={() => setViewProduct(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-white/80 rounded-full hover:bg-white text-gray-500 hover:text-gray-900 shadow-sm"
            >
              <X size={20} />
            </button>

            <div className="w-full md:w-1/2 bg-gray-100 p-4 flex flex-col items-center justify-center">
              {(viewProduct.images && viewProduct.images.length > 0) ||
              (viewProduct as any).image_url ||
              (viewProduct as any).external_image_url ? (
                (() => {
                  const imgSrc =
                    viewProduct.images && viewProduct.images.length > 0
                      ? viewProduct.images[currentImageIndex]
                      : (viewProduct as any).image_url ||
                        (viewProduct as any).external_image_url ||
                        '';
                  if (!imgSrc) return null;
                  return (
                    <div className="relative w-full h-[60vh] max-h-[60vh]">
                      <Image
                        src={imgSrc}
                        alt={viewProduct.name}
                        fill
                        style={{ objectFit: 'contain' }}
                      />
                    </div>
                  );
                })()
              ) : (
                <div className="text-gray-400 flex flex-col items-center">
                  <Search size={48} className="mb-2 opacity-50" />
                  <p>Sem imagem</p>
                </div>
              )}
              {viewProduct.images && viewProduct.images.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {viewProduct.images!.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-16 h-16 rounded-lg overflow-hidden border ${currentImageIndex === idx ? 'border-indigo-600' : 'border-gray-200'}`}
                    >
                      <div className="relative w-16 h-16">
                        <Image
                          src={img}
                          alt={viewProduct.name + ' thumbnail'}
                          fill
                          style={{ objectFit: 'cover' }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="w-full md:w-1/2 p-6 flex flex-col overflow-y-auto">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {viewProduct.reference_code}
                </span>
                {viewProduct.brand && (
                  <span className="text-xs font-bold uppercase bg-indigo-50 px-2 py-1 rounded text-indigo-700">
                    {viewProduct.brand}
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {viewProduct.name}
              </h2>
              <div className="mb-4">
                <div className="text-lg font-bold text-gray-900">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(viewProduct.cost ?? viewProduct.price)}
                </div>
              </div>
              {viewProduct.description &&
                viewProduct.description.trim() !== '' && (
                  <div className="prose prose-sm text-gray-600 mb-4">
                    <h4 className="font-semibold text-gray-900 mb-1">
                      Descrição
                    </h4>
                    <p>{viewProduct.description}</p>
                  </div>
                )}
              <div className="mt-auto flex gap-2">
                <Link
                  href={`/dashboard/products/${viewProduct.id}`}
                  className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-center font-bold hover:bg-indigo-700"
                >
                  Editar
                </Link>
                <button
                  onClick={() => setViewProduct(null)}
                  className="flex-1 py-2 rounded-lg border border-gray-200"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPriceModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 border border-gray-200 dark:border-slate-800">
            <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-slate-50">
              Atualização de Preço
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <select
                  className="w-full p-2 border rounded"
                  value={priceConfig.mode}
                  onChange={(e) =>
                    setPriceConfig({
                      ...priceConfig,
                      mode: e.target.value as any,
                    })
                  }
                >
                  <option value="fixed">Fixo (R$)</option>
                  <option value="percentage">Percentual (%)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Valor</label>
                <input
                  type="number"
                  className="w-full p-2 border rounded"
                  value={priceConfig.value}
                  onChange={(e) =>
                    setPriceConfig({ ...priceConfig, value: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-2 justify-end mt-4">
                <button
                  onClick={() => setShowPriceModal(false)}
                  className="px-4 py-2 text-gray-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleBulkPriceUpdate}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-indigo-600 text-white rounded font-bold flex gap-2 items-center"
                >
                  {isProcessing && (
                    <Loader2 className="animate-spin" size={16} />
                  )}{' '}
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-center animate-in zoom-in-95 border border-red-100">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {deleteTargetId
                ? 'Excluir este produto?'
                : `Excluir ${selectedIds.length} produtos?`}
            </h3>
            <div className="text-sm text-gray-600 mb-3">
              Ao excluir, se existirem dependências, a operação física pode
              falhar e os produtos serão automaticamente{' '}
              <strong>inativados</strong> (soft-delete).
            </div>
            <div className="mb-4 flex items-center gap-2">
              <input
                id="prefer-soft"
                type="checkbox"
                checked={preferSoftDelete}
                onChange={(e) => setPreferSoftDelete(e.target.checked)}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
              <label htmlFor="prefer-soft" className="text-sm text-gray-700">
                Preferir inativar (soft-delete)
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => executeDelete(preferSoftDelete)}
                disabled={isProcessing}
                className="py-3 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700"
              >
                {isProcessing ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  'Sim, Excluir'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
