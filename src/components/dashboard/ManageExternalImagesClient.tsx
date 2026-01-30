'use client';

import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useConfirm } from '@/hooks/useConfirm';
import {
  Play,
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
  images?: any[] | null;
  image_path?: string | null;
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
  const [items, setItems] = useState<ProcessItem[]>(
    initialProducts.map((p) => ({ ...p, status: 'idle' }))
  );

  const [isProcessing, setIsProcessing] = useState(false);
  const [processedInSession, setProcessedInSession] = useState(0);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [wsAvailable, setWsAvailable] = useState<boolean | null>(null);

  const { confirm } = useConfirm();
  const router = useRouter();
  const supabase = createClient();

  // Mostrar todos os itens em uma página quando o total for pequeno,
  // senão paginar por 20 por página.
  const ITEMS_PER_PAGE = useMemo(
    () => (items.length <= 20 ? Math.max(8, items.length) : 20),
    [items.length]
  );

  // Polling conservador: atualiza os dados do servidor periodicamente.
  // Evita refreshs ATIVOS durante processamento e quando a aba está oculta.
  useEffect(() => {
    const POLL_INTERVAL = 30000; // 30s
    let iv: any = null;

    const shouldRefresh = () => {
      if (document.visibilityState !== 'visible') return false;
      if (isProcessing) return false;
      return true;
    };

    const start = () => {
      if (iv) return;
      iv = setInterval(() => {
        try {
          if (!shouldRefresh()) return;
          router.refresh();
        } catch (_) {}
      }, POLL_INTERVAL);
    };

    start();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') start();
      else if (iv) clearInterval(iv);
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      if (iv) clearInterval(iv);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isProcessing, router]);

  // --- MOTOR DE REPARO EM LOTE (A SOLUÇÃO DEFINITIVA) ---
  // helper: fetch with timeout and optional retries
  const fetchWithTimeout = async (
    input: RequestInfo,
    init?: RequestInit,
    timeoutMs = 20000
  ) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(input, {
        ...(init || {}),
        signal: controller.signal,
      });
      clearTimeout(id);
      return res;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  };

  const runBatchRepair = async (isAuto = false) => {
    if (isProcessing) return;
    setIsProcessing(true);
    const toastId = isAuto
      ? 'batch-repair'
      : toast.loading('Iniciando processamento no servidor...');

    try {
      // tentativas simples com retry
      let attempt = 0;
      let lastErr: any = null;
      while (attempt < 2) {
        attempt++;
        try {
          // send the visible/filtered product ids to the server so it only processes intended items
          const payload = {
            product_ids: filteredItems.map((i) => i.id),
            // optional filters for server-side processing
            brand: selectedBrand || null,
            search: searchTerm || null,
          };

          const res = await fetchWithTimeout(
            '/api/products/image-repair',
            {
              method: 'POST',
              body: JSON.stringify(payload),
              headers: { 'Content-Type': 'application/json' },
            },
            30000
          );
          if (!res.ok) {
            const txt = await res.text().catch(() => '');
            throw new Error(`API retornou status ${res.status}: ${txt}`);
          }
          const data = await res.json().catch(() => ({}));

          if (data.fail_count > 0) {
            setIsProcessing(false);
            toast.error(
              `Pausado: ${data.fail_count} falhas no lote. Verifique os logs.`,
              { id: toastId }
            );
            return;
          }

          if (data.success_count > 0) {
            setProcessedInSession((prev) => prev + data.success_count);
            toast.success(`${data.success_count} imagens internalizadas!`, {
              id: toastId,
            });

            if (data.remaining > 0) {
              toast.loading(
                `Aguardando próximo lote... (${data.remaining} restantes)`,
                { id: 'batch-repair' }
              );
              await new Promise((r) => setTimeout(r, 2000));
              // recursão/control loop para próximo lote
              continue;
            } else {
              setIsProcessing(false);
              toast.success('🎉 Sincronização global completa!', {
                id: 'batch-repair',
              });
              try {
                router.refresh();
              } catch (_) {}
              return;
            }
          } else {
            setIsProcessing(false);
            toast.info('Nenhuma imagem pendente encontrada.', { id: toastId });
            return;
          }
        } catch (err: any) {
          lastErr = err;
          // small backoff
          await new Promise((r) => setTimeout(r, 800 * attempt));
        }
      }

      setIsProcessing(false);
      toast.error(
        `Falha ao comunicar com a API de mídias: ${String(lastErr)}`,
        { id: toastId }
      );
    } catch (error) {
      setIsProcessing(false);
      toast.error('Erro inesperado no motor de reparo.', { id: toastId });
    }
  };

  const handleStartRequest = async () => {
    const estimatedBatches = Math.max(1, Math.ceil(items.length / 20));
    const ok = await confirm({
      title: 'Iniciar Sincronização Turbo?',
      description: `O sistema processará ${items.length} itens em lotes automáticos (~${estimatedBatches} lote(s)). Mantenha esta aba aberta.`,
      confirmText: 'Começar Agora',
      cancelText: 'Cancelar',
    });
    if (ok) runBatchRepair();
  };

  // --- FILTROS ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  // Debounce search term to reduce re-renders
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const filteredItems = useMemo(() => {
    const q = debouncedSearchTerm || '';
    return items.filter((item) => {
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q.toLowerCase()) ||
        (item.reference_code?.toLowerCase() || '').includes(q.toLowerCase());
      const matchesBrand = !selectedBrand || item.brand === selectedBrand;
      return matchesSearch && matchesBrand;
    });
  }, [items, debouncedSearchTerm, selectedBrand]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Ajusta a página atual caso o total de páginas mude (por filtros ou atualização)
  useEffect(() => {
    if (totalPages === 0) return setCurrentPage(1);
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages]);

  const brands = useMemo(
    () =>
      Array.from(
        new Set(initialProducts.map((p) => p.brand).filter(Boolean))
      ).sort(),
    [initialProducts]
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden">
      {/* FILTROS */}
      <div className="p-6 bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Buscar produtos..."
            className="lg:col-span-1 px-5 py-3 rounded-2xl bg-white dark:bg-slate-800 border-none shadow-sm text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="px-5 py-3 rounded-2xl bg-white dark:bg-slate-800 border-none shadow-sm text-sm font-bold"
          >
            <option value="">Todas as Marcas</option>
            {brands.map((b) => (
              <option key={b} value={b || ''}>
                {b}
              </option>
            ))}
          </select>
          <button
            onClick={handleStartRequest}
            disabled={isProcessing || filteredItems.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 py-3 disabled:opacity-50"
          >
            {isProcessing ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Zap size={16} />
            )}
            Sincronizar Pendentes
          </button>
        </div>
      </div>

      {/* LISTA DE PRODUTOS */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {paginatedItems.map((item) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-slate-50/30 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 rounded-2xl"
            >
              <div className="flex items-center gap-3 w-full">
                <div className="h-12 w-12 rounded-xl bg-white overflow-hidden border flex-shrink-0">
                  <LazyProductImage
                    src={
                      item.image_url ||
                      (Array.isArray(item.images)
                        ? typeof item.images[0] === 'string'
                          ? item.images[0]
                          : item.images[0]?.url
                        : null) ||
                      item.external_image_url
                    }
                    alt={item.name}
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm truncate">{item.name}</h4>
                  <p className="text-[10px] uppercase font-black text-slate-400 truncate">
                    {item.reference_code} • {item.brand}
                  </p>
                </div>
              </div>
              <div className="mt-3 sm:mt-0 sm:ml-3 flex items-center gap-2">
                <a
                  href={item.external_image_url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 text-slate-300 hover:text-indigo-600"
                >
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER PAGINAÇÃO */}
      <div className="p-6 border-t flex items-center justify-between">
        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
          {processedInSession} Processados / {items.length} Restantes
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-2 bg-slate-100 rounded-xl"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="px-4 py-2 font-black text-xs">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="p-2 bg-slate-100 rounded-xl"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* CONSOLE DE LOGS (OPCIONAL) - oculto em mobile para reduzir espaço */}
      <div className="px-6 pb-6 hidden md:block">
        <SyncConsole jobId={activeJobId || 'Sessão Atual'} />
      </div>
    </div>
  );
}

// Componente de Console Interno (Simplificado)
function SyncConsole({ jobId }: { jobId: string }) {
  return (
    <div className="bg-slate-900 rounded-2xl p-4 font-mono text-[10px] text-emerald-400 border border-slate-800">
      <div className="flex justify-between border-b border-slate-800 pb-2 mb-2">
        <span className="uppercase font-bold">Log de Processamento</span>
        <span className="opacity-50">{jobId}</span>
      </div>
      <div className="h-20 overflow-y-auto space-y-1">
        <div>{`[${new Date().toLocaleTimeString()}] Aguardando comando de sincronização...`}</div>
      </div>
    </div>
  );
}
