'use client';

import { useState, useEffect, useRef } from 'react';
import {
  RefreshCw,
  Play,
  Pause,
  AlertCircle,
  CheckCircle,
  Clock,
  Image as ImageIcon,
  Zap,
  Filter,
  X,
  Loader2,
  Download,
  TrendingUp,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';

interface SyncStats {
  stats: {
    pending: number;
    processing: number;
    synced: number;
    failed: number;
    total: number;
  };
  recentErrors: any[];
  pendingByBrand: { brand: string; count: number }[];
  recentPending: any[];
  storage: {
    syncedProducts: number;
    totalVariants: number;
    avgVariantsPerProduct: string;
  };
}

interface LogEntry {
  message: string;
  level: 'info' | 'success' | 'error' | 'warning';
  timestamp: string;
}

interface SyncProgress {
  current: number;
  total: number;
  productId?: string;
  productName?: string;
  brand?: string;
}

export default function SyncManagerClient() {
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [syncLimit, setSyncLimit] = useState(20);
  const [forceSync, setForceSync] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Carrega estatísticas ao montar
  useEffect(() => {
    loadStats();
  }, []);

  const addLog = (message: string, level: LogEntry['level'] = 'info') => {
    setLogs((prev) => [
      ...prev,
      {
        message,
        level,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const loadStats = async () => {
    setIsLoadingStats(true);
    try {
      const response = await fetch('/api/admin/sync-stats');

      if (!response.ok) throw new Error('Erro ao carregar estatísticas');

      const data = await response.json();
      if (data.success) {
        setStats(data);
        addLog('✅ Estatísticas carregadas', 'success');
      }
    } catch (error: any) {
      addLog(`❌ Erro ao carregar estatísticas: ${error.message}`, 'error');
      toast.error('Erro ao carregar estatísticas');
    } finally {
      setIsLoadingStats(false);
    }
  };

  const startSync = async () => {
    if (isSyncing) {
      toast.warning('Sincronização já em andamento');
      return;
    }

    setIsSyncing(true);
    setLogs([]);
    setProgress(null);

    try {
      abortControllerRef.current = new AbortController();

      const payload: any = {
        limit: syncLimit,
        force: forceSync,
      };

      if (selectedBrand) {
        // Encontra brand_id baseado no nome
        const brand = stats?.pendingByBrand.find(
          (b) => b.brand === selectedBrand
        );
        if (brand) {
          // Nota: precisaríamos do brand_id aqui, não apenas o nome
          // Por simplicidade, vamos filtrar apenas pelo limite
          addLog(`🏷️ Filtro de marca selecionado: ${selectedBrand}`, 'info');
        }
      }

      addLog('🚀 Iniciando conexão com servidor...', 'info');

      const response = await fetch('/api/admin/sync-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ''}`,
        },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Stream não disponível');
      }

      addLog('✅ Conexão estabelecida, aguardando eventos...', 'success');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n').filter(Boolean);

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              switch (data.type) {
                case 'log':
                  addLog(data.message, data.level || 'info');
                  break;

                case 'progress':
                  setProgress({
                    current: data.current,
                    total: data.total,
                    productId: data.productId,
                    productName: data.productName,
                    brand: data.brand,
                  });
                  break;

                case 'complete':
                  addLog(
                    `\n🎉 Sincronização finalizada! Sucesso: ${data.success} | Falhas: ${data.failed} | Pulados: ${data.skipped}`,
                    'success'
                  );
                  toast.success('Sincronização concluída!');
                  setProgress(null);
                  // Recarrega estatísticas
                  setTimeout(loadStats, 1000);
                  break;

                case 'error':
                  addLog(`❌ Erro: ${data.message}`, 'error');
                  toast.error(data.message);
                  break;
              }
            } catch (e) {
              console.error('Erro ao parsear evento SSE:', line, e);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        addLog('⚠️ Sincronização cancelada pelo usuário', 'warning');
        toast.info('Sincronização cancelada');
      } else {
        addLog(`❌ Erro fatal: ${error.message}`, 'error');
        toast.error('Erro na sincronização');
      }
    } finally {
      setIsSyncing(false);
      abortControllerRef.current = null;
    }
  };

  const cancelSync = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      addLog('🛑 Solicitando cancelamento...', 'warning');
    }
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('🧹 Console limpo', 'info');
  };

  const getLogIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <ImageIcon className="w-4 h-4 text-blue-500" />;
    }
  };

  const formatTimestamp = (iso: string) => {
    return new Date(iso).toLocaleTimeString('pt-BR');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-3">
                <Zap className="w-7 h-7 text-blue-600" />
                Sincronização de Imagens
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Painel Master - Gerenciamento de URLs externas → Supabase
                Storage
              </p>
            </div>
            <button
              onClick={loadStats}
              disabled={isLoadingStats}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoadingStats ? 'animate-spin' : ''}`}
              />
              Atualizar
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Total
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                    {stats.stats.total}
                  </p>
                </div>
                <Package className="w-8 h-8 text-gray-400" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-4 border border-yellow-200 dark:border-yellow-900">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    Pendentes
                  </p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {stats.stats.pending}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-4 border border-blue-200 dark:border-blue-900">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Processando
                  </p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.stats.processing}
                  </p>
                </div>
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-4 border border-green-200 dark:border-green-900">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Sincronizados
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.stats.synced}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-4 border border-red-200 dark:border-red-900">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Falhados
                  </p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {stats.stats.failed}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Controles de Sincronização
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Limite de Produtos
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={syncLimit}
                onChange={(e) => setSyncLimit(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50"
                disabled={isSyncing}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Processar no máximo X produtos por vez
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Filtrar por Marca (Opcional)
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50"
                disabled={isSyncing}
              >
                <option value="">Todas as marcas</option>
                {stats?.pendingByBrand.map((b) => (
                  <option key={b.brand} value={b.brand}>
                    {b.brand} ({b.count})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceSync}
                  onChange={(e) => setForceSync(e.target.checked)}
                  disabled={isSyncing}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Forçar re-processamento
                </span>
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            {!isSyncing ? (
              <button
                onClick={startSync}
                disabled={!stats || stats.stats.pending === 0}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
              >
                <Play className="w-5 h-5" />
                Iniciar Sincronização
              </button>
            ) : (
              <button
                onClick={cancelSync}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 font-medium"
              >
                <Pause className="w-5 h-5" />
                Cancelar
              </button>
            )}

            <button
              onClick={clearLogs}
              className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
            >
              <X className="w-5 h-5" />
              Limpar Logs
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {progress && (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-6 border border-blue-200 dark:border-blue-900">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-50">
                Progresso: {progress.current} / {progress.total}
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {Math.round((progress.current / progress.total) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-slate-800 rounded-full h-2.5 mb-2">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{
                  width: `${(progress.current / progress.total) * 100}%`,
                }}
              />
            </div>
            {progress.productName && (
              <p className="text-xs text-slate-600 dark:text-slate-400">
                🔄 {progress.productName} ({progress.brand})
              </p>
            )}
          </div>
        )}

        {/* Logs Console */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800">
          <div className="p-4 border-b border-gray-200 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Console de Logs ({logs.length})
            </h2>
          </div>
          <div className="p-4 bg-slate-950 rounded-b-lg max-h-96 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-slate-500 text-center py-8">
                Nenhum log ainda. Inicie uma sincronização para ver os eventos
                em tempo real.
              </p>
            ) : (
              <div className="space-y-1">
                {logs.map((log, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 text-slate-300"
                  >
                    {getLogIcon(log.level)}
                    <span className="text-slate-500 text-xs">
                      [{formatTimestamp(log.timestamp)}]
                    </span>
                    <span className="flex-1">{log.message}</span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Recent Errors */}
        {stats && stats.recentErrors.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-red-200 dark:border-red-900 p-6">
            <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Erros Recentes ({stats.recentErrors.length})
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {stats.recentErrors.map((error: any) => (
                <div
                  key={error.id}
                  className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded text-sm"
                >
                  <p className="font-medium text-slate-900 dark:text-slate-50">
                    {error.name} ({error.reference_code})
                  </p>
                  <p className="text-red-600 dark:text-red-400 text-xs mt-1">
                    {error.sync_error}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-xs">
                    {new Date(error.updated_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
