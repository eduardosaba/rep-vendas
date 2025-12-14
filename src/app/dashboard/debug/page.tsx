'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Database,
  Shield,
  Image as ImageIcon,
  Server,
  RefreshCcw,
  Loader2, // <--- ADICIONADO AQUI (O erro era a falta disto)
  Wifi,
} from 'lucide-react';

interface TestResult {
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  details?: string;
  latency?: number;
}

export default function SystemHealthPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const [results, setResults] = useState<{ [key: string]: TestResult }>({
    env: { status: 'pending', message: 'Verificando variáveis...' },
    auth: { status: 'pending', message: 'Verificando sessão...' },
    db_read: { status: 'pending', message: 'Teste de leitura...' },
    settings_table: {
      status: 'pending',
      message: 'Verificando tabela settings...',
    },
    storage: { status: 'pending', message: 'Acesso ao Storage...' },
  });

  const runDiagnostics = async () => {
    setLoading(true);
    const newResults = { ...results };

    // Reinicia status visual
    Object.keys(newResults).forEach((key) => {
      newResults[key] = { status: 'pending', message: 'Aguardando...' };
    });
    setResults({ ...newResults });

    // 1. TESTE DE AMBIENTE
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (url && key && url.startsWith('https://') && key.length > 20) {
        newResults.env = {
          status: 'success',
          message: 'Variáveis carregadas corretamente.',
          details: `URL: ${url.substring(0, 15)}...`,
        };
      } else {
        newResults.env = {
          status: 'error',
          message: 'Variáveis de ambiente inválidas ou ausentes.',
          details: 'Verifique o arquivo .env.local',
        };
      }
    } catch (e) {
      newResults.env = { status: 'error', message: 'Erro ao ler process.env' };
    }
    setResults({ ...newResults });

    // 2. TESTE DE AUTENTICAÇÃO
    let userId = '';
    try {
      const start = performance.now();
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      const latency = Math.round(performance.now() - start);

      if (error) throw error;
      if (session) {
        userId = session.user.id;
        newResults.auth = {
          status: 'success',
          message: `Logado como: ${session.user.email}`,
          latency,
          details: `UID: ${session.user.id}`,
        };
      } else {
        newResults.auth = {
          status: 'warning',
          message: 'Nenhuma sessão ativa.',
          latency,
        };
      }
    } catch (error: any) {
      newResults.auth = { status: 'error', message: error.message };
    }
    setResults({ ...newResults });

    // 3. TESTE DE LEITURA DO BANCO (Tabela Settings)
    if (userId) {
      try {
        const start = performance.now();
        // Tenta buscar a configuração do usuário
        const { data, error } = await supabase
          .from('settings')
          .select('id, name')
          .eq('user_id', userId)
          .maybeSingle();

        const latency = Math.round(performance.now() - start);

        if (error) {
          newResults.db_read = {
            status: 'error',
            message: 'Erro ao conectar no DB: ' + error.message,
            latency,
          };
          newResults.settings_table = {
            status: 'error',
            message: 'Falha na query de settings.',
          };
        } else {
          newResults.db_read = {
            status: 'success',
            message: 'Conexão com Banco OK',
            latency,
          };

          if (data) {
            newResults.settings_table = {
              status: 'success',
              message: 'Registro de configurações encontrado.',
              details: `Loja: ${data.name || 'Sem nome'}`,
            };
          } else {
            newResults.settings_table = {
              status: 'warning',
              message: 'Tabela settings vazia para este usuário.',
              details:
                'Isso pode causar erro ao salvar produtos. Vá em Configurações e Salve.',
            };
          }
        }
      } catch (error: any) {
        newResults.db_read = {
          status: 'error',
          message: 'Exceção: ' + error.message,
        };
      }
    } else {
      newResults.db_read = {
        status: 'warning',
        message: 'Pulei teste de DB (Sem Auth)',
      };
      newResults.settings_table = {
        status: 'warning',
        message: 'Pulei teste (Sem Auth)',
      };
    }
    setResults({ ...newResults });

    // 4. TESTE DE STORAGE
    try {
      const start = performance.now();
      const { data, error } = await supabase.storage.listBuckets();
      const latency = Math.round(performance.now() - start);

      if (error) {
        newResults.storage = {
          status: 'error',
          message: 'Erro ao listar buckets: ' + error.message,
          latency,
        };
      } else {
        const buckets = data.map((b) => b.name).join(', ');
        newResults.storage = {
          status: 'success',
          message: `Buckets acessíveis: ${buckets}`,
          latency,
        };
      }
    } catch (error: any) {
      newResults.storage = { status: 'error', message: error.message };
    }

    setResults({ ...newResults });
    setLoading(false);
    setLastCheck(new Date());
  };

  useEffect(() => {
    runDiagnostics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="text-green-500" />;
      case 'error':
        return <XCircle className="text-red-500" />;
      case 'warning':
        return <AlertTriangle className="text-yellow-500" />;
      default:
        return <Loader2 className="animate-spin text-blue-500" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="text-indigo-600" /> Diagnóstico do Sistema
          </h1>
          <p className="text-gray-500 text-sm">
            Use esta tela para identificar problemas de conexão ou configuração.
          </p>
        </div>
        <button
          onClick={runDiagnostics}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <RefreshCcw size={18} />
          )}
          Rodar Testes
        </button>
      </div>

      {lastCheck && (
        <p className="text-xs text-right text-gray-400">
          Última verificação: {lastCheck.toLocaleTimeString()}
        </p>
      )}

      <div className="grid gap-4">
        {/* VARIAVEIS DE AMBIENTE */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-start gap-4">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Server size={24} className="text-gray-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">Ambiente (.env)</h3>
              <StatusIcon status={results.env.status} />
            </div>
            <p className="text-sm text-gray-600">{results.env.message}</p>
            {results.env.details && (
              <p className="text-xs font-mono bg-gray-50 p-1 mt-2 rounded border">
                {results.env.details}
              </p>
            )}
          </div>
        </div>

        {/* AUTENTICAÇÃO */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-start gap-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Shield size={24} className="text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">Autenticação</h3>
              <StatusIcon status={results.auth.status} />
            </div>
            <p className="text-sm text-gray-600">{results.auth.message}</p>
            {results.auth.latency && (
              <span className="text-xs text-gray-400">
                Latência: {results.auth.latency}ms
              </span>
            )}
            {results.auth.details && (
              <p className="text-xs font-mono text-gray-500 mt-1">
                {results.auth.details}
              </p>
            )}
          </div>
        </div>

        {/* BANCO DE DADOS */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-start gap-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <Database size={24} className="text-green-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">
                Banco de Dados (Conexão)
              </h3>
              <StatusIcon status={results.db_read.status} />
            </div>
            <p className="text-sm text-gray-600">{results.db_read.message}</p>
            {results.db_read.latency && (
              <span className="text-xs text-gray-400">
                Latência: {results.db_read.latency}ms
              </span>
            )}
          </div>
        </div>

        {/* TABELA SETTINGS (CRÍTICO) */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-start gap-4">
          <div className="p-2 bg-orange-100 rounded-lg">
            <AlertTriangle size={24} className="text-orange-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">
                Integridade de Dados (Settings)
              </h3>
              <StatusIcon status={results.settings_table.status} />
            </div>
            <p className="text-sm text-gray-600">
              {results.settings_table.message}
            </p>
            {results.settings_table.details && (
              <p
                className={`text-xs mt-2 p-2 rounded ${results.settings_table.status === 'warning' ? 'bg-yellow-50 text-yellow-700' : 'text-gray-500'}`}
              >
                {results.settings_table.details}
              </p>
            )}
          </div>
        </div>

        {/* STORAGE */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-start gap-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <ImageIcon size={24} className="text-purple-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">Storage (Imagens)</h3>
              <StatusIcon status={results.storage.status} />
            </div>
            <p className="text-sm text-gray-600">{results.storage.message}</p>
            {results.storage.latency && (
              <span className="text-xs text-gray-400">
                Latência: {results.storage.latency}ms
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
