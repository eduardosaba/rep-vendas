'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Play,
  Pause,
  Loader2,
  CheckCircle,
  XCircle,
  ExternalLink,
  AlertTriangle,
  CloudLightning,
  Zap,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FixedSizeList as List } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import { LazyProductImage } from '@/components/ui/LazyProductImage';
import { createClient } from '@/lib/supabase/client';

interface Product {
  id: string;
  name: string;
  reference_code: string | null;
  brand: string | null;
  category: string | null;
  external_image_url: string;
  image_url?: string | null;
  sync_status?: string | null;
}

type Status = 'idle' | 'processing' | 'success' | 'error';

interface ProcessItem extends Product {
  status: Status;
  message?: string;
}

export default function ManageExternalImagesClient({
  initialProducts,
}: {
  initialProducts: Product[];
}) {
  // DEBUG: loga quantos itens o componente recebeu (ajuste temporário)
  useEffect(() => {
    try {
      const ids = (initialProducts || []).slice(0, 3).map((p) => p.id);
      console.debug(
        '[ManageExternalImagesClient] received',
        initialProducts.length,
        'items, sample ids=',
        ids
      );
    } catch (e) {
      console.debug('[ManageExternalImagesClient] debug log failed', e);
    }
  }, [initialProducts]);
  const [items, setItems] = useState<ProcessItem[]>(
    initialProducts.map((p) => ({ ...p, status: 'idle' }))
  );

  // Ensure client state matches server props after hydration/navigation
  useEffect(() => {
    try {
      setItems(initialProducts.map((p) => ({ ...p, status: 'idle' })));
    } catch (e) {
      console.debug(
        '[ManageExternalImagesClient] failed to set items from props',
        e
      );
    }
  }, [initialProducts]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingCountToConfirm, setPendingCountToConfirm] = useState(0);
  const [activeJobId, setActiveJobId] = useState<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem('rv_sync_job') : null
  );

  // On mount, if there's no active job id, try to fetch the latest job for this user
  useEffect(() => {
    if (activeJobId) return;
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/sync-jobs/latest');
        if (!res.ok) return;
        const j = await res.json();
        if (mounted && j?.success && j.job?.id) {
          setActiveJobId(j.job.id);
          try {
            localStorage.setItem('rv_sync_job', j.job.id);
          } catch {}
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, [activeJobId]);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [auditMode, setAuditMode] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'pending' | 'synced' | 'failed'
  >('all');

  const CONFIRM_THRESHOLD = 50;

  // Extrai listas únicas de marcas e categorias
  const brands = Array.from(
    new Set(
      initialProducts.map((p) => p.brand).filter((b): b is string => Boolean(b))
    )
  ).sort();
  const categories = Array.from(
    new Set(
      initialProducts
        .map((p) => p.category)
        .filter((c): c is string => Boolean(c))
    )
  ).sort();

  // Filtra items baseado nos filtros ativos
  const filteredItems = items.filter((item) => {
    // Filtra por status (sync_status) quando selecionado
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'pending' &&
        (item.sync_status === 'pending' || item.status === 'idle')) ||
      (statusFilter === 'synced' && item.sync_status === 'synced') ||
      (statusFilter === 'failed' &&
        (item.sync_status === 'failed' || item.status === 'error'));
    const matchesSearch =
      !searchTerm ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.reference_code?.toLowerCase() || '').includes(
        searchTerm.toLowerCase()
      ) ||
      (item.brand?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    const matchesBrand = !selectedBrand || item.brand === selectedBrand;
    const matchesCategory =
      !selectedCategory || item.category === selectedCategory;

    // NOVA LÓGICA DE AUDITORIA: quando auditMode=true, mostrar apenas itens que
    // provavelmente não têm P00 como capa (verifica external_image_url).
    const external = (item.external_image_url || '').toLowerCase();
    const matchesAudit =
      !auditMode || !external || !external.includes('p00.jpg');

    return (
      matchesSearch &&
      matchesBrand &&
      matchesCategory &&
      matchesAudit &&
      matchesStatus
    );
  });

  // Paginação: limitar para um lote seguro de itens por página
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25; // seguro para a maioria dos navegadores
  const totalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / ITEMS_PER_PAGE)
  );
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = filteredItems.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  // Resetar para a primeira página sempre que os filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedBrand, selectedCategory, auditMode]);

  // Configuração de colunas usada tanto no header quanto nas linhas (Row)
  const columnClasses = {
    photo: 'w-20 px-4 flex-shrink-0 flex justify-center',
    product: 'flex-1 px-4 min-w-[200px] truncate',
    brand: 'w-32 px-4 flex-shrink-0 hidden sm:flex',
    status: 'w-28 px-4 flex-shrink-0 flex justify-center',
    actions: 'w-16 px-4 flex-shrink-0 flex justify-end',
  } as const;

  // Header fixo para a lista virtualizada
  const TableHeader = () => (
    <div className="flex items-center bg-gray-50 dark:bg-slate-800/50 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-10">
      <div className={columnClasses.photo}>Foto</div>
      <div className={columnClasses.product}>Produto</div>
      <div className={columnClasses.brand}>Marca</div>
      <div className={columnClasses.status}>Status</div>
      <div className={columnClasses.actions}></div>
    </div>
  );

  // Linha renderizada pelo react-window
  const Row = ({
    index,
    style,
    data,
  }: {
    index: number;
    style: any;
    data: ProcessItem[];
  }) => {
    const item = data[index] as ProcessItem;
    const displayImageUrl =
      item.status === 'success' || item.sync_status === 'synced'
        ? item.image_url || item.external_image_url
        : item.external_image_url || item.image_url;

    return (
      <div
        style={style}
        className="flex items-center text-xs border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors bg-white dark:bg-slate-900"
        key={item.id}
      >
        <div className={columnClasses.photo}>
          <div className="w-10 h-10 rounded-md bg-gray-50 border border-gray-200 dark:border-slate-700 overflow-hidden flex items-center justify-center">
            <LazyProductImage
              src={displayImageUrl ?? ''}
              alt={item.name}
              className="max-w-full max-h-full object-contain"
              fallbackSrc="/placeholder-no-image.svg"
            />
          </div>
        </div>

        <div
          className={`${columnClasses.product} font-medium text-gray-900 dark:text-slate-200`}
        >
          {item.name}
        </div>

        <div
          className={`${columnClasses.brand} text-gray-500 dark:text-slate-400 italic`}
        >
          {item.brand || 'N/A'}
        </div>

        <div className={columnClasses.status}>
          <span
            className={`px-2 py-0.5 rounded-full font-bold text-[10px] tracking-tight ${
              item.sync_status === 'synced'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            }`}
          >
            {(item.sync_status || '—').toUpperCase()}
          </span>
        </div>

        <div className={columnClasses.actions}>
          <a
            href={item.external_image_url}
            target="_blank"
            rel="noreferrer"
            className="text-gray-400 hover:text-indigo-500 transition-colors p-1"
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    );
  };

  /**
   * ESTA É A FUNÇÃO QUE ESCALA O SISTEMA
   * Em vez de fazer o loop aqui, ela avisa o Inngest para trabalhar no servidor.
   */
  const startBackgroundSync = async () => {
    setIsProcessing(true);
    setProgress(10); // Progresso visual inicial

    try {
      const response = await fetch('/api/sync-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setProgress(100);
        // Guarda jobId para que o console possa monitorar
        // Prefer explicit jobId, otherwise try to re-fetch latest job
        if (result.jobId) {
          setActiveJobId(result.jobId);
          try {
            localStorage.setItem('rv_sync_job', result.jobId);
          } catch {}
        } else {
          try {
            const latest = await fetch('/api/sync-jobs/latest');
            if (latest.ok) {
              const body = await latest.json();
              if (body?.success && body.job?.id) {
                setActiveJobId(body.job.id);
                try {
                  localStorage.setItem('rv_sync_job', body.job.id);
                } catch {}
              }
            }
          } catch {}
        }

        toast.success('🚀 Sincronização iniciada com sucesso!', {
          description:
            'O motor RepVendas está processando as imagens em segundo plano. Você pode acompanhar o progresso abaixo nesta página.',
          duration: 8000,
          action: {
            label: 'Ver Progresso',
            onClick: () => {
              // Navega para o console nesta página
              try {
                window.location.hash = 'sync-console';
              } catch {}
            },
          },
        });
      } else {
        throw new Error(
          result.error || 'Erro ao disparar motor de sincronização'
        );
      }
    } catch (error: any) {
      toast.error('Falha ao iniciar motor', {
        description: error.message,
      });
      setProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartRequest = () => {
    const pendingItems = filteredItems.filter((i) => i.status !== 'success');

    if (pendingItems.length === 0) {
      toast.info('Tudo atualizado! Nenhum item pendente nos filtros atuais.');
      return;
    }

    if (pendingItems.length > CONFIRM_THRESHOLD) {
      setPendingCountToConfirm(pendingItems.length);
      setShowConfirm(true);
    } else {
      startBackgroundSync();
    }
  };

  const handleMassRepair = async () => {
    const toastId = toast.loading(
      'Reparando capas... Verificando arrays de imagens.'
    );

    try {
      const res = await fetch('/api/admin/repair-covers', { method: 'POST' });
      if (!res.ok) throw new Error('Falha no reparo em massa');

      toast.success('Reparo concluído!', { id: toastId });
      // Recarrega os dados para atualizar a lista de auditoria
      try {
        window.location.reload();
      } catch {
        // fallback silencioso
      }
    } catch (error) {
      toast.error('Erro ao processar reparo.', { id: toastId });
    }
  };

  const stats = {
    total: filteredItems.length,
    totalGlobal: items.length,
    success: items.filter((i) => i.status === 'success').length,
    pending: items.filter((i) => i.status === 'idle').length,
    failed: filteredItems.filter(
      (i) => i.status === 'error' || i.sync_status === 'failed'
    ).length,
  };

  // Supabase client (usado para operações administrativas como bulk retry)
  const supabase = createClient();
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetryFailed = async () => {
    const failedCount = stats.failed;
    if (!failedCount) return;

    const ok = window.confirm(
      `Desejas colocar ${failedCount} produtos de volta na fila de sincronização?`
    );
    if (!ok) return;

    setIsRetrying(true);
    try {
      const { error } = await supabase
        .from('products')
        .update({
          sync_status: 'pending',
          sync_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('sync_status', 'failed');

      if (error) throw error;

      toast.success(`Reprocessamento agendado para ${failedCount} items.`);
      try {
        router.refresh();
      } catch {}
    } catch (err: any) {
      toast.error('Falha ao reprocessar: ' + (err?.message || String(err)));
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* FILTROS E BUSCA */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-900 dark:to-slate-900 p-4 border-b border-gray-200 dark:border-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="🔍 Buscar por nome, marca ou referência..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
          >
            <option value="">Todas as Marcas</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
          >
            <option value="">Todas as Categorias</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="md:col-span-4 flex items-center justify-between gap-3">
            <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
              {[
                {
                  id: 'all',
                  label: 'Todos',
                  color: 'text-gray-600',
                  count: stats.totalGlobal,
                },
                {
                  id: 'pending',
                  label: 'Pendentes',
                  color: 'text-amber-600',
                  count: stats.pending,
                },
                {
                  id: 'synced',
                  label: 'OK',
                  color: 'text-emerald-600',
                  count: stats.success,
                },
                {
                  id: 'failed',
                  label: 'Falhas',
                  color: 'text-rose-600',
                  count: stats.failed,
                },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setStatusFilter(btn.id as any)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                    statusFilter === btn.id
                      ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <span
                    className={
                      statusFilter === btn.id ? 'text-blue-600' : btn.color
                    }
                  >
                    {btn.label}
                  </span>
                  <span className="bg-gray-200 dark:bg-slate-600 px-1.5 py-0.5 rounded text-[10px] opacity-70">
                    {btn.count}
                  </span>
                </button>
              ))}
            </div>

            {/* BOTÃO DE REPROCESSAR FALHAS */}
            {stats.failed > 0 && (
              <button
                onClick={handleRetryFailed}
                disabled={isRetrying}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isRetrying
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400'
                }`}
              >
                <RefreshCcw
                  size={14}
                  className={isRetrying ? 'animate-spin' : ''}
                />
                {isRetrying
                  ? 'A processar...'
                  : `Reprocessar ${stats.failed} Falhas`}
              </button>
            )}
          </div>
          <div className="md:col-span-4 flex items-center justify-end gap-3">
            <button
              onClick={() => {
                setAuditMode(!auditMode);
                toast.success(
                  !auditMode
                    ? 'Modo Auditoria ativado'
                    : 'Modo Auditoria desativado'
                );
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all ${
                auditMode
                  ? 'bg-amber-100 text-amber-700 border-2 border-amber-500'
                  : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              <AlertTriangle size={16} />
              {auditMode
                ? 'Visualizando Falhas de Capa'
                : 'Auditar Capas (P00)'}
            </button>

            {auditMode && (
              <button
                onClick={handleMassRepair}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-lg transition-all animate-in fade-in slide-in-from-left-2"
              >
                <Zap size={16} />
                Corrigir Todas com Fallback
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PAINEL DE CONTROLE */}
      <div className="bg-white dark:bg-slate-900 p-4 border-b border-gray-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex gap-4 items-center">
          <div className="text-sm">
            <span className="text-gray-500">Exibindo:</span>{' '}
            <b className="text-indigo-600">{stats.total}</b> de{' '}
            {stats.totalGlobal}
          </div>
          <div className="h-4 w-[1px] bg-gray-200"></div>
          <div className="flex items-center gap-1.5 text-sm text-amber-600 font-medium">
            <CloudLightning size={16} />
            Background Ativo
          </div>
        </div>

        <button
          onClick={handleStartRequest}
          disabled={isProcessing || stats.total === 0}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
        >
          {isProcessing ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <Play size={18} fill="currentColor" />
          )}
          {isProcessing ? 'Acionando Motor...' : 'Sincronizar Catálogo'}
        </button>
      </div>

      {/* PROGRESS BAR */}
      {isProcessing && (
        <div className="w-full h-1.5 bg-gray-100 dark:bg-slate-800">
          <div
            className="h-full bg-indigo-600 transition-all duration-1000"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}

      {/* TABELA VIRTUALIZADA (react-window) */}
      <div className="flex flex-col flex-1">
        {/* Definição das larguras de coluna para manter header e rows alinhados */}
        <style>{``}</style>
        <div className="px-0">
          {/* Header fixo */}
          <TableHeader />
        </div>

        <div className="flex-1 overflow-auto">
          <div className="px-0">
            {/* Rows (paginated) */}
            {paginatedItems.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                Nenhum item encontrado.
              </div>
            ) : (
              paginatedItems.map((_, idx) => (
                <Row
                  key={paginatedItems[idx].id}
                  index={idx}
                  style={{}}
                  data={paginatedItems}
                />
              ))
            )}

            {/* Pagination controls */}
            <div className="flex items-center justify-between p-4 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="text-sm text-gray-500">
                Página {currentPage} de {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded bg-white border"
                >
                  Anterior
                </button>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  className="px-3 py-1 rounded bg-white border"
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE CONFIRMAÇÃO */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowConfirm(false)}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 dark:border-slate-800 text-center">
            <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CloudLightning size={40} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Processar em Lote?
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              Você tem <b>{pendingCountToConfirm}</b> imagens para internalizar.
              O processo será feito em segundo plano nos nossos servidores.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setShowConfirm(false);
                  startBackgroundSync();
                }}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all"
              >
                Sim, iniciar agora
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="w-full py-4 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 rounded-2xl font-bold"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* SYNC CONSOLE: mostra progresso detalhado e logs */}
      <div id="sync-console" className="mt-4">
        {activeJobId && <SyncConsole jobId={activeJobId} />}
      </div>
    </div>
  );
}

function SyncConsole({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    async function fetchAll() {
      try {
        const { data: j } = await supabase
          .from('sync_jobs')
          .select('*')
          .eq('id', jobId)
          .maybeSingle();
        if (mounted) setJob(j || null);

        const { data: its } = await supabase
          .from('sync_job_items')
          .select('product_id,status,error_text,created_at')
          .eq('job_id', jobId)
          .order('created_at', { ascending: false })
          .limit(50);
        if (mounted) setItems(its || []);
      } catch (e) {
        console.error('Failed to load sync console', e);
      }
    }

    fetchAll();
    const t = setInterval(fetchAll, 3000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, [jobId, supabase]);

  return (
    <div className="mt-6 bg-gray-50 dark:bg-slate-900 p-4 rounded-lg border border-gray-100 dark:border-slate-800">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">Console de Sincronização</div>
        <div className="text-xs text-gray-500">Job: {jobId}</div>
      </div>
      <div className="mb-3 text-xs text-gray-600 flex items-center gap-3">
        <div>
          Status: <b className="ml-1">{job?.status || '—'}</b>
        </div>
        <div>
          Processados:{' '}
          <b className="ml-1">
            {job?.completed_count ?? 0}/{job?.total_count ?? 0}
          </b>
        </div>
        <div className="flex-1">
          <div className="w-full h-2 bg-gray-200 rounded">
            <div
              className="h-2 bg-indigo-600 rounded transition-all"
              style={{
                width: `${job && job.total_count ? Math.round(((job.completed_count || 0) / job.total_count) * 100) : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="max-h-56 overflow-auto text-[12px] font-mono bg-white dark:bg-slate-950 p-2 rounded">
        {items.length === 0 ? (
          <div className="text-gray-500">Nenhum registro ainda.</div>
        ) : (
          items.map((it) => (
            <div key={it.created_at + it.product_id} className="mb-1">
              <span className="text-xs text-gray-400">
                [{new Date(it.created_at).toLocaleTimeString()}]
              </span>{' '}
              <span
                className={
                  it.status === 'failed' ? 'text-red-500' : 'text-green-600'
                }
              >
                {it.status.toUpperCase()}
              </span>{' '}
              <span className="ml-2">{it.product_id}</span>
              {it.error_text && (
                <div className="text-xxs text-red-400">{it.error_text}</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
