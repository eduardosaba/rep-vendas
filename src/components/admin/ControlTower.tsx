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
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import EcosystemHealthCards from '@/components/admin/EcosystemHealthCards';
import RecentActivityFeed from '@/components/admin/RecentActivityFeed';

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

  // Auto-scroll do console
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    // load global config (control flags)
    let mounted = true;
    fetch('/api/global_config')
      .then((r) => r.json())
      .then((j) => {
        if (!mounted) return;
        setGlobalConfig(j || null);
        setPlanFeatures(j?.plan_feature_matrix || null);
      })
      .catch(() => {});
    // load plans for matrix via Supabase client
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
        // ignore
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
      isDryRun ? '🔍 Iniciando simulação...' : '🗑️  Iniciando limpeza real...'
    );

    try {
      addLog('📡 Conectando à API de limpeza do storage...');

      // Endpoint da API que criamos anteriormente
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

      addLog('📦 Processando resposta do servidor...');
      const data = await response.json();

      if (data.success) {
        setResults(data);
        const fileCount = data.orphans?.length || data.count || 0;

        if (!isDryRun) {
          addLog(`✅ Limpeza concluída! ${fileCount} arquivo(s) removido(s).`);
          toast.success('Limpeza Realizada!', {
            description: `${data.count} arquivos órfãos foram removidos do Supabase.`,
          });
        } else {
          addLog(
            `✅ Simulação concluída! ${fileCount} arquivo(s) órfão(s) detectado(s).`
          );
        }
      } else {
        addLog(`❌ Erro na operação: ${data.error || 'Erro desconhecido'}`);
        toast.error(data.error || 'Erro na operação');
      }
    } catch (error) {
      addLog(
        `❌ Erro de conexão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
      toast.error('Erro de conexão com a API');
    } finally {
      setLoading(false);
      addLog('🏁 Operação finalizada.');
    }
  };

  const handleSaveGlobalConfig = async (patch: any) => {
    try {
      setLoading(true);
      const res = await fetch('/api/global_config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const j = await res.json();
      if (res.status === 401 || res.status === 403) {
        setNotAuthorized(true);
        toast.error('Acesso negado: você não tem permissão para editar.');
        return;
      }
      if (res.ok && j.ok) {
        setGlobalConfig((prev: any) => ({ ...(prev || {}), ...patch }));
        toast.success('Configurações salvas');
      } else {
        toast.error('Falha ao salvar configurações');
      }
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header da Torre */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-primary/10 rounded-2xl text-primary">
            <ShieldAlert size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-secondary dark:text-white uppercase tracking-tighter">
              Torre de Controle
            </h1>
            <p className="text-gray-500 font-medium text-sm">
              Painel Master de Manutenção do RepVendas
            </p>
          </div>
        </div>
      </div>
      {/* Ecosystem Health Cards */}
      <div>
        <EcosystemHealthCards />
      </div>
      {/* Control Tower: Global Flags */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-3 text-secondary dark:text-white mb-4">
          <Terminal size={24} />
          <h3 className="font-black text-xl">Permissões Globais (Torre)</h3>
        </div>

        <p className="text-sm text-gray-500 mb-6">
          Configure comportamentos globais que afetam contas em trial/teste.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border">
            <p className="text-sm font-bold">Permitir desbloqueio (trial)</p>
            <p className="text-xs text-gray-400 mb-3">
              Se ativo, contas em trial podem liberar a visualização dos preços
              sem senha.
            </p>
            <div className="flex gap-2">
              <Button
                variant={
                  globalConfig?.allow_trial_unlock ? 'primary' : 'outline'
                }
                onClick={() =>
                  handleSaveGlobalConfig({
                    allow_trial_unlock: !globalConfig?.allow_trial_unlock,
                  })
                }
                disabled={loading || notAuthorized}
              >
                {globalConfig?.allow_trial_unlock ? 'Ativado' : 'Desativado'}
              </Button>
            </div>
          </div>

          <div className="p-4 rounded-lg border">
            <p className="text-sm font-bold">Permitir finalização (trial)</p>
            <p className="text-xs text-gray-400 mb-3">
              Se ativo, contas em trial podem finalizar pedidos normalmente.
            </p>
            <div className="flex gap-2">
              <Button
                variant={
                  globalConfig?.allow_trial_checkout ? 'primary' : 'outline'
                }
                onClick={() =>
                  handleSaveGlobalConfig({
                    allow_trial_checkout: !globalConfig?.allow_trial_checkout,
                  })
                }
                disabled={loading || notAuthorized}
              >
                {globalConfig?.allow_trial_checkout ? 'Ativado' : 'Desativado'}
              </Button>
            </div>
          </div>

          <div className="p-4 rounded-lg border">
            <p className="text-sm font-bold">Bypass para usuários de teste</p>
            <p className="text-xs text-gray-400 mb-3">
              Ativa um modo de bypass global para facilitar testes QA.
            </p>
            <div className="flex gap-2">
              <Button
                variant={
                  globalConfig?.allow_test_bypass ? 'primary' : 'outline'
                }
                onClick={() =>
                  handleSaveGlobalConfig({
                    allow_test_bypass: !globalConfig?.allow_test_bypass,
                  })
                }
                disabled={loading || notAuthorized}
              >
                {globalConfig?.allow_test_bypass ? 'Ativado' : 'Desativado'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Plan feature matrix */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-slate-800 mt-6">
        <div className="flex items-center gap-3 text-secondary dark:text-white mb-4">
          <Terminal size={24} />
          <h3 className="font-black text-xl">Matriz de Recursos (Planos)</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Controle quais recursos cada plano pode usar. As mudanças afetarão o
          comportamento de contas em trial conforme a matriz.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-xs text-gray-500">
                <th className="py-2">Plano</th>
                <th className="py-2">Ver Preços</th>
                <th className="py-2">Finalizar Pedido</th>
                <th className="py-2">Salvar Pedido</th>
              </tr>
            </thead>
            <tbody>
              {(plans || []).map((p) => (
                <tr key={p.id} className="border-t border-gray-100">
                  <td className="py-2 font-medium">{p.name}</td>
                  {['view_prices', 'finalize_order', 'save_cart'].map((f) => (
                    <td key={f} className="py-2">
                      <input
                        type="checkbox"
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

        <div className="mt-4 flex justify-end">
          <Button
            onClick={() =>
              handleSaveGlobalConfig({ plan_feature_matrix: planFeatures })
            }
            disabled={loading}
          >
            Salvar Matriz de Recursos
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card de Ação */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-slate-800 space-y-6">
          <div className="flex items-center gap-3 text-secondary dark:text-white">
            <Database size={24} />
            <h3 className="font-black text-xl">Saneamento do Storage</h3>
          </div>

          <p className="text-gray-500 text-sm leading-relaxed">
            Esta ferramenta analisa o bucket{' '}
            <code className="bg-gray-100 px-2 py-1 rounded">
              product-images
            </code>{' '}
            e remove arquivos que não possuem mais referência na tabela de
            produtos (incluindo imagens de galeria).
          </p>

          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 p-4 rounded-2xl flex gap-3 text-amber-700 dark:text-amber-400">
            <AlertTriangle size={20} className="shrink-0" />
            <p className="text-xs font-medium">
              Recomenda-se rodar uma <b>Simulação</b> antes de qualquer deleção
              real para garantir que imagens importantes não sejam listadas.
            </p>
          </div>

          <div className="flex gap-4 pt-2">
            <Button
              variant="outline"
              onClick={() => handleCleanup(true)}
              disabled={loading}
              className="flex-1 py-6 rounded-2xl font-bold"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <Eye size={18} className="mr-2" /> Buscar imagens sem
                  sincronização
                </>
              )}
            </Button>
            <Button
              onClick={() => setShowConfirm(true)}
              disabled={loading}
              className="flex-1 py-6 rounded-2xl font-bold bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <Trash2 size={18} className="mr-2" /> Executar Limpeza
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Modal de Confirmação: substituir confirm() nativo */}
        {showConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowConfirm(false)}
            />
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-lg font-bold mb-2">Confirmar Limpeza</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                CONFIRMAR DELEÇÃO? Esta ação é irreversível e apagará os
                arquivos do Supabase.
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="ghost" onClick={() => setShowConfirm(false)}>
                  Cancelar
                </Button>
                <Button
                  className="bg-red-600 text-white"
                  onClick={async () => {
                    setShowConfirm(false);
                    await handleCleanup(false);
                  }}
                >
                  Executar Limpeza
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Card de Status Rápido */}
        <div className="bg-secondary rounded-[2.5rem] p-8 text-white flex flex-col justify-between">
          <h4 className="font-bold opacity-60 uppercase text-xs tracking-widest">
            Resumo da Torre
          </h4>
          <div className="py-6">
            <p className="text-4xl font-black">
              {results?.orphans?.length || results?.count || 0}
            </p>
            <p className="text-sm opacity-80">Arquivos processados</p>
          </div>
          <div className="text-[10px] font-mono opacity-40 break-all">
            API_PATH: /api/admin/cleanup-storage
          </div>
        </div>
      </div>

      {/* Resultados Detalhados */}
      {results && results.orphans && (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-4">
          <h4 className="font-black text-secondary dark:text-white mb-4 uppercase text-xs tracking-widest flex items-center gap-2">
            <CheckCircle2 size={16} className="text-green-500" /> Lista de
            Arquivos Detectados
          </h4>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 overflow-y-auto max-h-80 custom-scrollbar">
            {results.orphans.length > 0 ? (
              <ul className="text-[11px] font-mono space-y-2 text-gray-500 dark:text-gray-400">
                {results.orphans.map((file, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 border-b border-gray-200 dark:border-slate-700 pb-1 last:border-0"
                  >
                    <span className="text-primary font-bold">{i + 1}.</span>{' '}
                    {file}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-center text-gray-400 py-10">
                Tudo limpo! Nenhum órfão encontrado.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Console de Logs + Feed */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="bg-slate-950 rounded-[2.5rem] p-8 shadow-2xl border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <Terminal size={14} className="text-emerald-500" />
                Console de Operações
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLogs([])}
                className="text-[10px] h-7 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-700"
              >
                Limpar Console
              </Button>
            </div>
            <div
              ref={consoleRef}
              className="bg-slate-900 rounded-2xl p-6 h-64 overflow-y-auto font-mono text-[11px] text-emerald-400 space-y-1 custom-scrollbar"
            >
              {logs.length > 0 ? (
                logs.map((log, i) => (
                  <div key={i} className="leading-relaxed">
                    {log}
                  </div>
                ))
              ) : (
                <div className="text-slate-600 text-center py-20">
                  Aguardando operações...
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="md:col-span-1">
          <RecentActivityFeed />
        </div>
      </div>
    </div>
  );
}
