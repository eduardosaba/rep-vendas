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
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Product {
  id: string;
  name: string;
  reference_code: string | null;
  brand: string | null;
  category: string | null;
  external_image_url: string;
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

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

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

    return matchesSearch && matchesBrand && matchesCategory;
  });

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
        if (result.jobId) {
          setActiveJobId(result.jobId);
          try {
            localStorage.setItem('rv_sync_job', result.jobId);
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

  const stats = {
    total: filteredItems.length,
    totalGlobal: items.length,
    success: filteredItems.filter((i) => i.status === 'success').length,
    pending: filteredItems.filter((i) => i.status === 'idle').length,
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

      {/* TABELA DE ITENS */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-gray-50 dark:bg-slate-800 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
            <tr>
              <th className="px-6 py-3 w-10">Status</th>
              <th className="px-6 py-3">Produto / Referência</th>
              <th className="px-6 py-3">Marca</th>
              <th className="px-6 py-3">Link Original</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {filteredItems.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-gray-50 dark:hover:bg-slate-800/40"
              >
                <td className="px-6 py-4">
                  {item.status === 'success' ? (
                    <CheckCircle className="text-green-500" size={20} />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-200" />
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {item.name}
                  </div>
                  <div className="text-xs text-gray-400">
                    {item.reference_code || 'Sem ref.'}
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-500">{item.brand}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <a
                      href={item.external_image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-500 hover:underline flex items-center gap-1"
                    >
                      Ver <ExternalLink size={12} />
                    </a>
                    {item.external_image_url && (
                      <a
                        href={`/api/proxy-image?url=${encodeURIComponent(
                          item.external_image_url
                        )}&w=800&format=webp&q=80&fallback=1`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-gray-500 hover:underline"
                        title="Abrir versão reduzida (800px, webp)"
                      >
                        Ver reduzida
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

      <div className="mb-3 text-xs text-gray-600">
        Status: <b className="ml-1">{job?.status || '—'}</b> · Processados:{' '}
        {job?.completed_count ?? 0}/{job?.total_count ?? 0}
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
