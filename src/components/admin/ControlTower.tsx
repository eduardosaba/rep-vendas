'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldAlert,
  Trash2,
  Eye,
  Database,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Terminal,
  Save,
  RefreshCw,
  Zap,
  FileSearch,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import EcosystemHealthCards from '@/components/admin/EcosystemHealthCards';
import RecentActivityFeed from '@/components/admin/RecentActivityFeed';
import Link from 'next/link';
import { useConfirm } from '@/hooks/useConfirm';

export default function ControlTower() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    mode: string;
    orphans: string[];
    count?: number;
  } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [globalConfig, setGlobalConfig] = useState<any | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [planFeatures, setPlanFeatures] = useState<Record<
    string,
    Record<string, boolean>
  > | null>(null);
  const [notAuthorized, setNotAuthorized] = useState(false);
  const consoleRef = useRef<HTMLDivElement>(null);
  const { confirm } = useConfirm();

  // Auto-scroll do console
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    let mounted = true;
    fetch('/api/global_config')
      .then((r) => r.json())
      .then((j) => {
        if (!mounted) return;
        setGlobalConfig(j || null);
        setPlanFeatures(j?.plan_feature_matrix || null);
      })
      .catch(() => {});

    (async () => {
      try {
        const supabase = createClient();
        const { data: plansData } = await supabase
          .from('plans')
          .select('*')
          .order('price', { ascending: true });
        if (!mounted) return;
        if (Array.isArray(plansData)) setPlans(plansData);
      } catch (e) {
        /* ignore */
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleCleanup = async (isDryRun: boolean) => {
    setLoading(true);
    setResults(null);
    addLog(
      isDryRun ? '🔍 Iniciando simulação...' : '🗑️ Iniciando limpeza real...'
    );

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(
        `/api/admin/cleanup-storage?dryRun=${isDryRun}`,
        {
          method: 'POST',
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setResults(data);
        const fileCount = data.orphans?.length || data.count || 0;
        if (!isDryRun) {
          addLog(`✅ Limpeza concluída! ${fileCount} arquivos removidos.`);
          toast.success('Limpeza Realizada!');
        } else {
          addLog(`✅ Simulação concluída! ${fileCount} órfãos detectados.`);
        }
      } else {
        addLog(`❌ Erro: ${data.error}`);
        toast.error(data.error);
      }
    } catch (error) {
      addLog(`❌ Erro de conexão.`);
      toast.error('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStats, setSyncStats] = useState({ success: 0, failed: 0 });

  const handleSyncImages = async () => {
    if (isSyncing) return;

    const confirmed = await confirm({
      title: 'Otimizar Todas as Imagens',
      description:
        'Deseja iniciar a otimização de TODAS as imagens pendentes? O processo continuará automaticamente em lotes até esvaziar a fila.',
      confirmText: 'Sim, Iniciar',
      cancelText: 'Cancelar',
    });

    if (!confirmed) {
      return;
    }

    setIsSyncing(true);
    setSyncStats({ success: 0, failed: 0 });
    const toastId = toast.loading('Inicializando motor de otimização...', {
      duration: Infinity,
    });

    // Função Recursiva Interna
    const runBatch = async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;

        const res = await fetch('/api/admin/sync-images', {
          method: 'POST',
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.message || 'Erro na API');

        // Mostra erros específicos se houver falhas
        if (data.errors && data.errors.length > 0) {
          console.error('Erros de sincronização:', data.errors);
          toast.error(
            `Erros encontrados: ${data.errors.map((e: any) => `${e.name}: ${e.error}`).join(', ')}`,
            { duration: 8000 }
          );
        }

        // Se não houver mais imagens, encerra o ciclo
        if (data.message === 'Nenhuma imagem pendente.') {
          toast.success(
            `🎉 Processo concluído! Total: ${syncStats.success + (data.detalhes?.success || 0)} otimizadas.`,
            { id: toastId, duration: 5000 }
          );
          setIsSyncing(false);
          refreshData(); // Atualiza a tela geral
          return;
        }

        // Atualiza estatísticas acumuladas e continua
        const currentSuccess =
          syncStats.success + (data.detalhes?.success || 0);
        const currentFailed = syncStats.failed + (data.detalhes?.failed || 0);

        setSyncStats({
          success: currentSuccess,
          failed: currentFailed,
        });

        toast.loading(
          `Otimizando... Sucesso: ${currentSuccess} | Falhas: ${currentFailed}`,
          { id: toastId }
        );

        // Chama o próximo lote recursivamente
        await runBatch();
      } catch (error: any) {
        console.error('Ciclo interrompido:', error);
        toast.error(`Processo pausado por erro: ${error.message}`, {
          id: toastId,
          duration: 5000,
        });
        setIsSyncing(false);
      }
    };

    // Dispara a primeira execução
    await runBatch();
  };
  const handleRestandardize = async () => {
    const confirmed = await confirm({
      title: 'Re-padronizar Imagens Antigas',
      description:
        'Isso marcará todas as imagens antigas (não-WebP) para reprocessamento. Deseja continuar?',
      confirmText: 'Sim, Re-padronizar',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    addLog('🛠️ Agendando re-padronização de imagens antigas...');
    toast.info(
      'Para agendar a re-padronização, execute o script SQL/queue_restandardization.sql no Supabase Studio.'
    );
    addLog(
      'ℹ️ Execute SQL/queue_restandardization.sql no painel para iniciar.'
    );
  };
  const refreshData = () => {
    /* Função placeholder se já não existir no contexto, 
       mas idealmente deveria recarregar os counts da tela */
    handleCleanup(true); // Recarrega simulando um scan para atualizar contadores se possível
  };

  const handleSaveGlobalConfig = async (patch: any) => {
    try {
      setLoading(true);
      const res = await fetch('/api/global_config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (res.status === 401 || res.status === 403) {
        setNotAuthorized(true);
        toast.error('Acesso negado.');
        return;
      }
      if (res.ok) {
        setGlobalConfig((prev: any) => ({ ...(prev || {}), ...patch }));
        toast.success('Configurações aplicadas');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 w-full overflow-hidden">
      {/* Header simplificado e mais denso */}
      <header className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <ShieldAlert size={24} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold uppercase tracking-tight text-slate-900 dark:text-white">
              Torre de Controle
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Monitoramento Master RepVendas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/audit">
            <Button variant="outline" size="sm" className="gap-2">
              <FileSearch size={14} />
              Auditoria de Imagens
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono text-slate-400">
              SISTEMA ONLINE
            </span>
          </div>
        </div>
      </header>

      {/* Cards de Saúde do Ecossistema */}
      <EcosystemHealthCards />

      {/* Grid Principal: Flags Globais e Matriz de Planos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Permissões Globais */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-6 text-slate-800 dark:text-slate-100">
            <Terminal size={18} />
            <h3 className="font-bold">Permissões Globais</h3>
          </div>
          <div className="space-y-4">
            {[
              {
                id: 'allow_trial_unlock',
                label: 'Desbloqueio (Trial)',
                desc: 'Preços sem senha.',
              },
              {
                id: 'allow_trial_checkout',
                label: 'Finalização (Trial)',
                desc: 'Pedidos liberados.',
              },
              {
                id: 'allow_test_bypass',
                label: 'Modo QA/Bypass',
                desc: 'Ignorar travas.',
              },
            ].map((flag) => (
              <div
                key={flag.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
              >
                <div>
                  <p className="text-xs font-bold">{flag.label}</p>
                  <p className="text-[10px] text-slate-400">{flag.desc}</p>
                </div>
                <Button
                  size="sm"
                  variant={globalConfig?.[flag.id] ? 'primary' : 'outline'}
                  className="h-8 text-[11px]"
                  onClick={() =>
                    handleSaveGlobalConfig({
                      [flag.id]: !globalConfig?.[flag.id],
                    })
                  }
                  disabled={loading || notAuthorized}
                >
                  {globalConfig?.[flag.id] ? 'Ativo' : 'Inativo'}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Matriz de Recursos */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <Database size={18} />
              <h3 className="font-bold">Matriz de Recursos</h3>
            </div>
            <Button
              size="sm"
              onClick={() =>
                handleSaveGlobalConfig({ plan_feature_matrix: planFeatures })
              }
              disabled={loading}
              className="gap-2"
            >
              <Save size={14} /> Salvar
            </Button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                <tr>
                  <th className="p-3 text-left">Plano</th>
                  <th className="p-3 text-center text-[10px] uppercase">
                    Preços
                  </th>
                  <th className="p-3 text-center text-[10px] uppercase">
                    Finalizar
                  </th>
                  <th className="p-3 text-center text-[10px] uppercase">
                    Carrinho
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(plans || []).map((p) => (
                  <tr key={p.id}>
                    <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                      {p.name}
                    </td>
                    {['view_prices', 'finalize_order', 'save_cart'].map((f) => (
                      <td key={f} className="p-3 text-center">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-primary focus:ring-primary"
                          checked={!!planFeatures?.[p.name]?.[f]}
                          onChange={() => {
                            setPlanFeatures((prev) => {
                              const copy = { ...(prev || {}) };
                              if (!copy[p.name]) copy[p.name] = {};
                              copy[p.name][f] = !copy[p.name][f];
                              return copy;
                            });
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Sessão de Manutenção de Storage */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-4">
            <Database className="text-primary" size={20} />
            <h3 className="font-bold">Saneamento do Storage</h3>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-3">
              <p className="text-xs text-slate-500 leading-relaxed">
                Varredura no bucket{' '}
                <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">
                  product-images
                </code>
                .
              </p>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 p-3 rounded-xl flex gap-3">
                <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                <p className="text-[10px] text-amber-700 dark:text-amber-400">
                  Execute uma <b>Simulação</b> antes de apagar permanentemente.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <Button
                variant="outline"
                onClick={() => handleCleanup(true)}
                disabled={loading}
                className="text-xs h-10"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : (
                  <Eye size={14} className="mr-2" />
                )}{' '}
                Simular
              </Button>
              <Button
                onClick={() => setShowConfirm(true)}
                disabled={loading}
                className="text-xs h-10 bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 size={14} className="mr-2" /> Limpeza Real
              </Button>
            </div>
          </div>

          {/* Seção de Otimização de Imagens */}
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <RefreshCw className="text-indigo-600" size={18} />
              <h4 className="font-bold text-slate-700 dark:text-slate-300">
                Otimização de Imagens
              </h4>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-slate-500 max-w-md">
                  Redimensiona e converte imagens pendentes (URL externa) para o
                  padrão interno (WebP 1000px).
                </p>
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  <Button
                    onClick={handleSyncImages}
                    disabled={loading || isSyncing}
                    className={`${isSyncing ? 'bg-amber-500' : 'bg-indigo-600'} hover:bg-indigo-700 text-white gap-2 w-full sm:w-auto text-xs h-10`}
                  >
                    {isSyncing ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <RefreshCw size={14} />
                    )}
                    {isSyncing
                      ? 'PROCESSANDO FILA...'
                      : 'OTIMIZAR TODAS AS IMAGENS'}
                  </Button>
                  {isSyncing && (
                    <span className="text-[10px] font-bold text-amber-600 animate-pulse text-center">
                      Não feche esta aba.
                    </span>
                  )}
                </div>
              </div>

              {/* Contador Acumulado */}
              {(syncStats.success > 0 || syncStats.failed > 0) && (
                <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest text-gray-500 bg-gray-50 dark:bg-slate-800 p-3 rounded-xl border border-gray-100 dark:border-slate-700">
                  <span className="text-emerald-600">
                    Sucesso: {syncStats.success}
                  </span>
                  <span className="text-red-500">
                    Falhas: {syncStats.failed}
                  </span>
                </div>
              )}
            </div>

            {/* Seção de Manutenção de Qualidade (Tier 2) */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 mt-4 flex items-center justify-between">
              <div>
                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                  Manutenção de Qualidade
                </h3>
                <p className="text-[10px] text-slate-400 mt-1 max-w-sm leading-relaxed">
                  Padronizar fotos antigas para o formato WebP (Mais rápido e
                  leve). Use para atualizar imagens enviadas antes da
                  otimização.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestandardize}
                className="text-xs h-8 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800"
              >
                <Zap size={14} className="mr-2 text-amber-500" />
                PADRONIZAR ANTIGOS
              </Button>
            </div>
          </div>
        </div>

        {/* Resumo Rápido */}
        <div className="md:col-span-4 bg-slate-900 rounded-2xl p-6 text-white flex flex-col justify-center border border-slate-800">
          <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest">
            Arquivos Detectados
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-4xl font-black text-primary">
              {results?.orphans?.length || results?.count || 0}
            </p>
            <p className="text-[10px] opacity-40 font-mono">/ total</p>
          </div>
        </div>
      </div>

      {/* Resultados e Console */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-950 rounded-2xl p-6 shadow-xl border border-slate-800 flex flex-col h-[350px]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <Terminal size={14} className="text-emerald-500" /> Console de
              Operações
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setLogs([])}
              className="text-[9px] h-6 text-slate-500"
            >
              Limpar
            </Button>
          </div>
          <div
            ref={consoleRef}
            className="flex-1 overflow-y-auto font-mono text-[10px] text-emerald-400 custom-scrollbar space-y-1"
          >
            {logs.length > 0 ? (
              logs.map((log, i) => <div key={i}>{log}</div>)
            ) : (
              <div className="text-slate-700 text-center mt-20">
                Aguardando...
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 h-[350px] flex flex-col">
          <h4 className="text-[10px] font-black uppercase text-slate-500 mb-4 tracking-widest flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-500" /> Lista de
            Arquivos
          </h4>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {results?.orphans && results.orphans.length > 0 ? (
              <ul className="text-[10px] font-mono divide-y divide-slate-100 dark:divide-slate-800">
                {results.orphans.map((file, i) => (
                  <li
                    key={i}
                    className="py-1.5 text-slate-500 dark:text-slate-400"
                  >
                    <span className="text-primary mr-2">{i + 1}.</span>
                    {file}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-30 italic text-sm">
                Nenhum resultado
              </div>
            )}
          </div>
        </div>
      </div>

      <RecentActivityFeed />

      {/* Modal de Confirmação */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Confirmar Deleção?
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Esta ação é irreversível e removerá fisicamente os arquivos do
              bucket product-images no Supabase.
            </p>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setShowConfirm(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-red-600 text-white"
                onClick={() => {
                  setShowConfirm(false);
                  handleCleanup(false);
                }}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
