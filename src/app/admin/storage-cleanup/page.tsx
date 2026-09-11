'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useConfirm } from '@/hooks/useConfirm';
import { createClient } from '@/lib/supabase/client';
import {
  Trash2,
  Move,
  Loader2,
  CheckCircle2,
  HardDrive,
  AlertTriangle,
  Database,
  TrendingDown,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  FileText,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';

interface StorageItem {
  name: string;
  path: string;
  size_bytes: number;
  size_kb: string;
  extension: string;
  status: 'in_use' | 'orphan' | 'unknown';
  public_url: string;
  updated_at: string;
}

interface OrderPdfItem {
  name: string;
  path: string;
  order_id: string | null;
  size_bytes: number;
  size_kb: string;
  classification: 'regenerable_data_fidelity' | 'preserved_historical_original' | 'unknown';
  has_signature: boolean;
  order_status: string | null;
  public_url: string;
  updated_at: string;
}

interface SummaryData {
  operation_id: string;
  token: string;
  total_items: number;
  total_bytes: number;
  total_mb: string;
  extensions_breakdown?: Record<string, number>;
  affected_prefixes?: string[];
  expires_at: string;
}

export default function StorageCleanupPage() {
  const [loading, setLoading] = useState(false);
  const [isMaster, setIsMaster] = useState<boolean | null>(null);
  const [activeModule, setActiveModule] = useState<'products' | 'order_pdfs'>('products');

  // STATES: Product Images
  const [items, setItems] = useState<StorageItem[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [selectAll, setSelectAll] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [statusFilter, setStatusFilter] = useState<'orphan' | 'in_use' | 'unknown' | 'all'>('orphan');
  const [extensionFilter, setExtensionFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('size_desc');

  // Metrics Product Images
  const [totalFiles, setTotalFiles] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [orphanCount, setOrphanCount] = useState(0);
  const [inUseCount, setInUseCount] = useState(0);
  const [unknownCount, setUnknownCount] = useState(0);
  const [totalOrphanBytes, setTotalOrphanBytes] = useState(0);

  // STATES: Order PDFs
  const [orderPdfItems, setOrderPdfItems] = useState<OrderPdfItem[]>([]);
  const [orderPdfPage, setOrderPdfPage] = useState(1);
  const [orderPdfTotalItems, setOrderPdfTotalItems] = useState(0);
  const [orderPdfTotalPages, setOrderPdfTotalPages] = useState(1);
  const [orderPdfClassificationFilter, setOrderPdfClassificationFilter] = useState('all');
  const [orderPdfRegenerableCount, setOrderPdfRegenerableCount] = useState(0);
  const [orderPdfPreservedCount, setOrderPdfPreservedCount] = useState(0);
  const [orderPdfUnknownCount, setOrderPdfUnknownCount] = useState(0);
  const [orderPdfTotalRegenerableBytes, setOrderPdfTotalRegenerableBytes] = useState(0);

  // Summary Modal State
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [confirmingAction, setConfirmingAction] = useState(false);

  const { confirm } = useConfirm();
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setIsMaster(false);
          return;
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        setIsMaster(profile?.role === 'master');
      } catch (err) {
        setIsMaster(false);
      }
    })();
  }, [supabase]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
      setOrderPdfPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch Products Inventory
  const fetchProductInventory = useCallback(
    async (forceRefresh = false) => {
      setLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;

        const params = new URLSearchParams({
          page: String(page),
          page_size: String(pageSize),
          status: statusFilter,
          extension: extensionFilter,
          search: debouncedSearch,
          sort: sortBy,
          refresh: forceRefresh ? 'true' : 'false',
        });

        const res = await fetch(`/api/admin/storage-cleanup?${params.toString()}`, {
          headers: { Authorization: token ? `Bearer ${token}` : '' },
        });

        const json = await res.json();
        if (res.ok) {
          setItems(json.items || []);
          setTotalItems(json.total_items || 0);
          setTotalPages(json.total_pages || 1);
          setTotalFiles(json.total_files || 0);
          setOrphanCount(json.orphan_count || 0);
          setInUseCount(json.in_use_count || 0);
          setUnknownCount(json.unknown_count || 0);
          setTotalOrphanBytes(json.total_orphan_bytes || 0);
          setSelected({});
          setSelectAll(false);
        } else {
          toast.error(json.error || 'Erro ao carregar inventário de produtos');
        }
      } catch (e) {
        toast.error('Erro de conexão');
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, statusFilter, extensionFilter, debouncedSearch, sortBy, supabase]
  );

  // Fetch Order PDFs Inventory (Dry-Run Mode)
  const fetchOrderPdfInventory = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const params = new URLSearchParams({
        page: String(orderPdfPage),
        page_size: String(pageSize),
        classification: orderPdfClassificationFilter,
        search: debouncedSearch,
      });

      const res = await fetch(`/api/admin/storage-cleanup/orders?${params.toString()}`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });

      const json = await res.json();
      if (res.ok) {
        setOrderPdfItems(json.items || []);
        setOrderPdfTotalItems(json.total_items || 0);
        setOrderPdfTotalPages(json.total_pages || 1);
        setOrderPdfRegenerableCount(json.regenerable_count || 0);
        setOrderPdfPreservedCount(json.preserved_count || 0);
        setOrderPdfUnknownCount(json.unknown_count || 0);
        setOrderPdfTotalRegenerableBytes(json.total_regenerable_bytes || 0);
      } else {
        toast.error(json.error || 'Erro ao carregar inventário de PDFs de pedidos');
      }
    } catch (e) {
      toast.error('Erro de conexão');
    } finally {
      setLoading(false);
    }
  }, [orderPdfPage, pageSize, orderPdfClassificationFilter, debouncedSearch, supabase]);

  useEffect(() => {
    if (activeModule === 'products') {
      fetchProductInventory();
    } else {
      fetchOrderPdfInventory();
    }
  }, [activeModule, fetchProductInventory, fetchOrderPdfInventory]);

  const toggleSelect = (path: string) => {
    setSelected((s) => ({ ...s, [path]: !s[path] }));
  };

  const handleSelectAll = () => {
    const next = !selectAll;
    setSelectAll(next);
    if (next) {
      const map: Record<string, boolean> = {};
      items.forEach((o) => (map[o.path] = true));
      setSelected(map);
    } else {
      setSelected({});
    }
  };

  const selectedPaths = Object.keys(selected).filter((k) => selected[k]);

  // Request Action Summary Token
  const handleOpenSummaryModal = async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const endpoint = activeModule === 'products' ? '/api/admin/storage-cleanup' : '/api/admin/storage-cleanup/orders';

      const bodyPayload =
        selectedPaths.length > 0
          ? { action: 'summary', paths: selectedPaths }
          : activeModule === 'products'
          ? { action: 'summary', status: statusFilter, extension: extensionFilter, search: debouncedSearch }
          : { action: 'summary' };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(bodyPayload),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setSummaryData(json);
        setSummaryModalOpen(true);
      } else {
        toast.error(json.error || 'Erro ao gerar resumo da operação');
      }
    } catch (err) {
      toast.error('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmMoveToTrash = async () => {
    if (!summaryData) return;
    setConfirmingAction(true);
    const toastId = toast.loading('Movendo arquivos para a lixeira...');

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const endpoint = activeModule === 'products' ? '/api/admin/storage-cleanup' : '/api/admin/storage-cleanup/orders';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          action: 'trash',
          operation_id: summaryData.operation_id,
          token: summaryData.token,
        }),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        toast.success(
          `✅ Movidos: ${json.moved} | 🛡️ Protegidos: ${json.protected} ${json.failed > 0 ? `| ⚠️ Erros: ${json.failed}` : ''}`,
          { id: toastId, duration: 6000 }
        );
        setSummaryModalOpen(false);
        setSummaryData(null);
        if (activeModule === 'products') fetchProductInventory(true);
        else fetchOrderPdfInventory();
      } else {
        toast.error(json.error || 'Erro ao mover para a lixeira', { id: toastId });
      }
    } catch (err) {
      toast.error('Erro de conexão', { id: toastId });
    } finally {
      setConfirmingAction(false);
    }
  };

  if (isMaster === false) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
          <ShieldAlert size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Acesso Negado (HTTP 403)</h2>
        <p className="text-slate-500 font-medium max-w-md mx-auto">
          A funcionalidade de Limpeza de Storage é restrita exclusivamente a usuários com o papel <strong>master</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none">
              <HardDrive size={28} />
            </div>
            Auditoria e Limpeza de Storage
          </h1>
          <p className="text-slate-500 font-medium mt-2">
            Varredura e auditoria segura de assets e documentos no Supabase Storage
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => (activeModule === 'products' ? fetchProductInventory(true) : fetchOrderPdfInventory())}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} size={18} />
            Recarregar
          </button>
        </div>
      </div>

      {/* MODULE SELECTOR TABS */}
      <div className="flex items-center gap-3 mb-8 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-fit">
        <button
          onClick={() => setActiveModule('products')}
          className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeModule === 'products'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Database size={16} /> Imagens de Produtos (`product-images`)
        </button>

        <button
          onClick={() => setActiveModule('order_pdfs')}
          className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeModule === 'order_pdfs'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileText size={16} /> PDFs de Pedidos (`orders` - Dry-Run)
        </button>
      </div>

      {/* PRODUCTS STATS CARDS */}
      {activeModule === 'products' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <Database className="text-slate-400" size={24} />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total no Bucket</span>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white">{totalFiles}</div>
            <div className="text-xs text-slate-400 font-medium mt-1">arquivos varridos no Storage</div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="text-amber-600" size={24} />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Arquivos Órfãos</span>
            </div>
            <div className="text-3xl font-black text-amber-600">{orphanCount}</div>
            <div className="text-xs text-amber-600 font-bold mt-1">
              {totalFiles > 0 ? ((orphanCount / totalFiles) * 100).toFixed(1) : 0}% sem produto
            </div>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-6">
            <div className="flex items-center justify-between mb-2">
              <ShieldCheck className="text-emerald-600" size={24} />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Arquivos Em Uso</span>
            </div>
            <div className="text-3xl font-black text-emerald-600">{inUseCount}</div>
            <div className="text-xs text-emerald-600 font-bold mt-1">vinculados a catálogo/banco</div>
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-200 dark:border-indigo-800 p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingDown className="text-indigo-600" size={24} />
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Espaço Órfão</span>
            </div>
            <div className="text-3xl font-black text-indigo-600">{(totalOrphanBytes / (1024 * 1024)).toFixed(1)} MB</div>
            <div className="text-xs text-indigo-600 font-bold mt-1">potencial de economia</div>
          </div>
        </div>
      )}

      {/* ORDER PDF STATS CARDS */}
      {activeModule === 'order_pdfs' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 p-6">
            <div className="flex items-center justify-between mb-2">
              <RefreshCw className="text-amber-600" size={24} />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">PDFs Regeneráveis</span>
            </div>
            <div className="text-3xl font-black text-amber-600">{orderPdfRegenerableCount}</div>
            <div className="text-xs text-amber-600 font-bold mt-1">com fidelidade de dados</div>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-6">
            <div className="flex items-center justify-between mb-2">
              <ShieldCheck className="text-emerald-600" size={24} />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Originais Preservados</span>
            </div>
            <div className="text-3xl font-black text-emerald-600">{orderPdfPreservedCount}</div>
            <div className="text-xs text-emerald-600 font-bold mt-1">assinados / aprovados</div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <ShieldAlert className="text-slate-400" size={24} />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Indeterminados</span>
            </div>
            <div className="text-3xl font-black text-slate-700 dark:text-slate-300">{orderPdfUnknownCount}</div>
            <div className="text-xs text-slate-400 font-medium mt-1">protegidos por segurança</div>
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-200 dark:border-indigo-800 p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingDown className="text-indigo-600" size={24} />
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Espaço Regenerável</span>
            </div>
            <div className="text-3xl font-black text-indigo-600">{(orderPdfTotalRegenerableBytes / (1024 * 1024)).toFixed(1)} MB</div>
            <div className="text-xs text-indigo-600 font-bold mt-1">retenção 30 dias na lixeira</div>
          </div>
        </div>
      )}

      {/* SEARCH AND FILTERS */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-6 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nome do arquivo ou ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {activeModule === 'products' ? (
            <>
              <div className="md:col-span-3">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as any);
                    setPage(1);
                  }}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
                >
                  <option value="orphan">⚠️ Apenas Órfãos (sem produto)</option>
                  <option value="in_use">✅ Apenas Em Uso</option>
                  <option value="unknown">🛡️ Protegidos / Sistema</option>
                  <option value="all">🔍 Todos os Estados</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <select
                  value={extensionFilter}
                  onChange={(e) => {
                    setExtensionFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
                >
                  <option value="all">Todas as Extensões</option>
                  <option value=".webp">.WEBP</option>
                  <option value=".jpg">.JPG</option>
                  <option value=".png">.PNG</option>
                </select>
              </div>
            </>
          ) : (
            <div className="md:col-span-6">
              <select
                value={orderPdfClassificationFilter}
                onChange={(e) => {
                  setOrderPdfClassificationFilter(e.target.value);
                  setOrderPdfPage(1);
                }}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">Todas as Classificações</option>
                <option value="regenerable_data_fidelity">⚠️ Regeneráveis com Fidelidade de Dados</option>
                <option value="preserved_historical_original">🛡️ Originais Históricos Preservados (Assinados / Aprovados)</option>
                <option value="unknown">❓ Indeterminados</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* CONTENT LIST */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-8">
        <div className="p-6 bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {activeModule === 'products'
              ? `Arquivos de Imagens de Produtos (${items.length} exibidos)`
              : `PDFs de Pedidos no Bucket 'orders' (Modo Auditoria Dry-Run)`}
          </span>

          <button
            onClick={handleOpenSummaryModal}
            disabled={loading}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-200 dark:shadow-none transition-all disabled:opacity-50"
          >
            <Move size={16} /> Mover Selecionados p/ Lixeira (Retenção 30 dias)
          </button>
        </div>

        <div className="p-6 space-y-3 min-h-[400px]">
          {loading && (
            <div className="flex flex-col items-center justify-center p-20 text-center">
              <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
              <p className="text-slate-500 font-medium">Processando auditoria e classificando arquivos...</p>
            </div>
          )}

          {/* LIST PRODUCTS */}
          {!loading &&
            activeModule === 'products' &&
            items.map((o) => (
              <div key={o.path} className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-800 rounded-2xl">
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={!!selected[o.path]}
                    onChange={() => toggleSelect(o.path)}
                    className="w-5 h-5 rounded border-slate-300 text-indigo-600"
                  />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{o.name}</div>
                    <div className="text-xs text-slate-500 font-mono">{o.path}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                      o.status === 'orphan'
                        ? 'bg-amber-100 text-amber-700'
                        : o.status === 'in_use'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {o.status}
                  </span>
                  <span className="text-sm font-black text-slate-600">{o.size_kb} KB</span>
                </div>
              </div>
            ))}

          {/* LIST ORDER PDFS */}
          {!loading &&
            activeModule === 'order_pdfs' &&
            orderPdfItems.map((o) => (
              <div key={o.path} className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-800 rounded-2xl">
                <div className="flex items-center gap-4">
                  <FileText className="text-indigo-600 flex-shrink-0" size={24} />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{o.name}</div>
                    <div className="text-xs text-slate-500 font-mono">
                      Pedido ID: {o.order_id || 'Não localizado'} | Status Pedido: {o.order_status || 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {o.classification === 'regenerable_data_fidelity' && (
                    <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-xs font-black uppercase tracking-wider">
                      ⚠️ Regenerável (Snapshot OK)
                    </span>
                  )}
                  {o.classification === 'preserved_historical_original' && (
                    <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-black uppercase tracking-wider">
                      🛡️ Original Preservado (Assinado / Aprovado)
                    </span>
                  )}
                  {o.classification === 'unknown' && (
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-xs font-black uppercase tracking-wider">
                      ❓ Indeterminado / Protegido
                    </span>
                  )}
                  <span className="text-sm font-black text-slate-600 dark:text-slate-400">{o.size_kb} KB</span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* SUMMARY MODAL */}
      {summaryModalOpen && summaryData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] max-w-xl w-full p-8 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-4">
              Confirmar Operação com Token SHA-256
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 font-medium">
              Serão movidos <strong>{summaryData.total_items}</strong> arquivos ({summaryData.total_mb} MB) para a lixeira com retenção de 30 dias.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setSummaryModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600">
                Cancelar
              </button>
              <button
                onClick={handleConfirmMoveToTrash}
                disabled={confirmingAction}
                className="px-6 py-2.5 bg-amber-500 text-white rounded-xl font-black text-sm uppercase tracking-wider"
              >
                {confirmingAction ? <Loader2 className="animate-spin" size={16} /> : 'Confirmar e Mover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
