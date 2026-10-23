'use client';

import { useState, useEffect } from 'react';
import {
  CreditCard,
  ShieldCheck,
  Zap,
  CheckCircle2,
  XCircle,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
  Radio,
  Sliders,
  Layers,
  Terminal,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  getIntegrationsData,
  saveIntegrationsData,
  testIntegrationsConnectivity,
} from './actions';

export default function IntegracoesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const [activeProvider, setActiveProvider] = useState<'asaas' | 'infinitepay'>('asaas');
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox');
  const [apiKey, setApiKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [infinitepayHandle, setInfinitepayHandle] = useState('repvendas');

  const [maskedApiKey, setMaskedApiKey] = useState('');
  const [maskedWebhookSecret, setMaskedWebhookSecret] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [hasWebhookSecret, setHasWebhookSecret] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  const [lastTestedAt, setLastTestedAt] = useState<string | null>(null);
  const [lastTestStatus, setLastTestStatus] = useState<string | null>(null);
  const [lastTestMessage, setLastTestMessage] = useState<string | null>(null);

  const [webhookUrl, setWebhookUrl] = useState('https://repvendas.com.br/api/webhooks/asaas');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWebhookUrl(`${window.location.origin}/api/webhooks/asaas`);
    }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getIntegrationsData();
      if (res.success && res.data) {
        setActiveProvider(res.data.activeProvider);
        setEnvironment(res.data.environment);
        setMaskedApiKey(res.data.maskedApiKey);
        setMaskedWebhookSecret(res.data.maskedWebhookSecret);
        setHasApiKey(res.data.hasApiKey);
        setHasWebhookSecret(res.data.hasWebhookSecret);
        setInfinitepayHandle(res.data.infinitepayHandle);
        setLastTestedAt(res.data.lastTestedAt ?? null);
        setLastTestStatus((res.data.lastTestStatus as any) ?? null);
        setLastTestMessage(res.data.lastTestMessage ?? null);
      }
    } catch (err: any) {
      toast.error('Erro ao carregar configurações: ' + (err.message || 'Erro inesperado'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success('URL do Webhook copiada para a área de transferência!');
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const toastId = toast.loading('Testando conectividade com o Asaas...');
    try {
      const res = await testIntegrationsConnectivity({
        apiKey: apiKey || undefined,
        environment,
      });

      if (res.success) {
        toast.success(res.message || 'Conexão validada com sucesso!', { id: toastId });
        setTestResult({
          success: true,
          status: res.status,
          message: res.message,
          environment: res.environment,
          details: res.details,
        });
      } else {
        toast.error(res.error || res.message || 'Falha ao conectar com o Asaas', { id: toastId });
        setTestResult({
          success: false,
          status: res.status || 400,
          message: res.error || res.message,
          environment: res.environment,
        });
      }
      loadData();
    } catch (err: any) {
      toast.error('Erro no teste: ' + err.message, { id: toastId });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const toastId = toast.loading('Salvando credenciais e configurações...');
    try {
      const form = new FormData();
      form.append('activeProvider', activeProvider);
      form.append('environment', environment);
      if (apiKey) form.append('asaasApiKey', apiKey);
      if (webhookSecret) form.append('asaasWebhookSecret', webhookSecret);
      form.append('infinitepayHandle', infinitepayHandle);

      const res = await saveIntegrationsData(form);
      if (res.success) {
        toast.success(res.message || 'Configurações salvas com sucesso!', { id: toastId });
        setApiKey('');
        setWebhookSecret('');
        loadData();
      } else {
        toast.error(res.error || 'Falha ao salvar', { id: toastId });
      }
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-indigo-600" size={36} />
        <p className="text-sm text-gray-500 font-medium">Carregando integrações financeiras...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in pb-12">
      {/* Header & Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Sliders className="text-indigo-600" /> Integrações de Pagamento
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure credenciais de API, webhooks e ambiente de cobrança recorrente do RepVendas.
          </p>
        </div>

        {/* Abas de Navegação Financeira */}
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
          <Link
            href="/admin/licenses"
            className="px-3 py-1.5 rounded-lg text-gray-600 dark:text-slate-400 hover:text-gray-900"
          >
            Assinaturas
          </Link>
          <span className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm">
            Configuração Gateways
          </span>
          <Link
            href="/admin/financeiro/testes"
            className="px-3 py-1.5 rounded-lg text-gray-600 dark:text-slate-400 hover:text-gray-900 flex items-center gap-1"
          >
            <Zap size={13} className="text-amber-500" /> Testes Sintéticos
          </Link>
          <Link
            href="/admin/financeiro/fechamento"
            className="px-3 py-1.5 rounded-lg text-gray-600 dark:text-slate-400 hover:text-gray-900"
          >
            Fechamento
          </Link>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* CARD 1: SELEÇÃO DE PROVEDOR E AMBIENTE */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Layers className="text-indigo-600" size={20} />
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Provedor de Pagamentos & Ambiente
              </h2>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
              Torre de Controle Master
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Escolha do Provedor */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider block">
                Motor Principal de Cobrança
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setActiveProvider('asaas')}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                    activeProvider === 'asaas'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500'
                      : 'border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="font-bold text-sm">Asaas</span>
                    {activeProvider === 'asaas' && (
                      <CheckCircle2 size={16} className="text-indigo-600" />
                    )}
                  </div>
                  <span className="text-[11px] text-gray-500 dark:text-slate-400">
                    Recorrência Automática (Pix, Cartão e Boleto)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveProvider('infinitepay')}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                    activeProvider === 'infinitepay'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500'
                      : 'border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="font-bold text-sm">InfinitePay</span>
                    {activeProvider === 'infinitepay' && (
                      <CheckCircle2 size={16} className="text-indigo-600" />
                    )}
                  </div>
                  <span className="text-[11px] text-gray-500 dark:text-slate-400">
                    Links de Pagamento Avulsos
                  </span>
                </button>
              </div>
            </div>

            {/* Escolha do Ambiente */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider block">
                Ambiente de Execução
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setEnvironment('sandbox')}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                    environment === 'sandbox'
                      ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500'
                      : 'border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="font-bold text-sm flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                      Sandbox
                    </span>
                    {environment === 'sandbox' && (
                      <CheckCircle2 size={16} className="text-amber-600" />
                    )}
                  </div>
                  <span className="text-[11px] text-gray-500 dark:text-slate-400">
                    Testes seguros sem cobranças reais
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setEnvironment('production')}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                    environment === 'production'
                      ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500'
                      : 'border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="font-bold text-sm flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Produção
                    </span>
                    {environment === 'production' && (
                      <CheckCircle2 size={16} className="text-emerald-600" />
                    )}
                  </div>
                  <span className="text-[11px] text-gray-500 dark:text-slate-400">
                    Pagamentos reais ativos
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: CREDENCIAIS ASAAS */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-indigo-600" size={20} />
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Credenciais Asaas ({environment === 'sandbox' ? 'Sandbox' : 'Produção'})
              </h2>
            </div>
            {hasApiKey ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 size={13} /> Chave Configurada
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                <AlertTriangle size={13} /> Não Configurada
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Chave de API */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider flex justify-between">
                <span>Chave de API (Access Token)</span>
                {hasApiKey && (
                  <span className="text-gray-400 font-mono font-normal">{maskedApiKey}</span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={hasApiKey ? 'Digite para alterar a chave...' : '$aact_YTU5YTE...'}
                  className="w-full font-mono text-sm px-3 py-2.5 pr-10 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-[11px] text-gray-400">
                Obtido em <strong>Asaas &gt; Integrações &gt; Chaves de API</strong>.
              </p>
            </div>

            {/* Segredo de Validação do Webhook */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider flex justify-between">
                <span>Token de Validação do Webhook</span>
                {hasWebhookSecret && (
                  <span className="text-gray-400 font-mono font-normal">
                    {maskedWebhookSecret}
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showWebhookSecret ? 'text' : 'password'}
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder={
                    hasWebhookSecret
                      ? 'Digite para alterar o segredo...'
                      : 'Token configurado no Asaas...'
                  }
                  className="w-full font-mono text-sm px-3 py-2.5 pr-10 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showWebhookSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-[11px] text-gray-400">
                O mesmo valor configurado no campo <em>&quot;Token de autenticação&quot;</em> do webhook no Asaas.
              </p>
            </div>
          </div>

          {/* Endpoint de Webhook para copiar */}
          <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-slate-800">
            <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
              Endpoint Público para Recebimento de Webhooks (Cole no Asaas)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="flex-1 font-mono text-xs md:text-sm px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300"
              />
              <button
                type="button"
                onClick={handleCopyWebhook}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all"
              >
                <Copy size={14} /> Copiar URL
              </button>
            </div>
          </div>
        </div>

        {/* CARD 3: DIAGNÓSTICO E AUDITORIA */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                Diagnóstico de Conectividade
              </h3>
              <p className="text-xs text-gray-500">
                {lastTestedAt ? (
                  <>
                    Último teste executado em:{' '}
                    <strong>{new Date(lastTestedAt).toLocaleString('pt-BR')}</strong> —{' '}
                    <span
                      className={
                        lastTestStatus === 'success'
                          ? 'text-emerald-600 font-bold'
                          : 'text-red-500 font-bold'
                      }
                    >
                      {lastTestStatus === 'success' ? 'Sucesso' : 'Falhou'}
                    </span>
                    {lastTestMessage && ` (${lastTestMessage})`}
                  </>
                ) : (
                  'Nenhum teste de conectividade registrado ainda.'
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || (!hasApiKey && !apiKey)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 rounded-xl transition-all disabled:opacity-50"
            >
              {testing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              Testar Conexão com Asaas
            </button>
          </div>

          {testResult && (
            <div
              className={`p-4 rounded-xl border text-xs font-mono transition-all animate-in fade-in ${
                testResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
              }`}
            >
              <div className="flex items-center gap-2 font-bold mb-1">
                {testResult.success ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                <span>
                  Status HTTP {testResult.status} — {testResult.message}
                </span>
              </div>
              {testResult.details && (
                <pre className="mt-2 text-[10px] bg-black/5 dark:bg-black/30 p-2 rounded overflow-x-auto max-h-40">
                  {JSON.stringify(testResult.details, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* BOTÃO SALVAR */}
        <div className="flex items-center justify-between pt-2">
          <Link
            href="/admin/financeiro/testes"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline"
          >
            <Zap size={14} /> Ir para o Painel de Testes Sintéticos &gt;
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-200 dark:shadow-none transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            Salvar Configurações
          </button>
        </div>
      </form>
    </div>
  );
}
