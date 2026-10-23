'use client';

import { useState, useEffect } from 'react';
import {
  Zap,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Loader2,
  Sliders,
  Database,
  ArrowRight,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { getTestUsers, simulateWebhookEvent } from './actions';

interface UserOption {
  id: string;
  email: string;
  full_name?: string | null;
  role: string;
  status: string | null;
  trial_ends_at?: string | null;
}

export default function TestesIntegracaoPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const [selectedEvent, setSelectedEvent] = useState<
    'PAYMENT_RECEIVED' | 'PAYMENT_OVERDUE' | 'SUBSCRIPTION_DELETED' | 'PAYMENT_REFUNDED'
  >('PAYMENT_RECEIVED');
  const [billingType, setBillingType] = useState<'PIX' | 'CREDIT_CARD' | 'BOLETO'>('PIX');
  const [amount, setAmount] = useState<number>(97.0);
  const [testIdempotency, setTestIdempotency] = useState<boolean>(true);

  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await getTestUsers();
      if (res.success && res.data) {
        setUsers(res.data);
        if (res.data.length > 0) {
          setSelectedUserId(res.data[0].id);
        }
      }
    } catch (err: any) {
      toast.error('Erro ao carregar usuários: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRunSimulation = async () => {
    if (!selectedUserId) {
      toast.error('Selecione um usuário para o teste.');
      return;
    }

    setExecuting(true);
    setExecutionResult(null);
    const toastId = toast.loading(`Simulando evento ${selectedEvent}...`);

    try {
      const res = await simulateWebhookEvent({
        userId: selectedUserId,
        event: selectedEvent,
        billingType,
        value: amount,
        testIdempotency,
      });

      if (res.success) {
        toast.success(`Evento ${selectedEvent} processado com sucesso!`, { id: toastId });
        setExecutionResult(res);
      } else {
        toast.error(`Falha na simulação: ${res.error || 'Erro no webhook'}`, { id: toastId });
        setExecutionResult(res);
      }
    } catch (err: any) {
      toast.error('Erro inesperado: ' + err.message, { id: toastId });
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-amber-500" size={36} />
        <p className="text-sm text-gray-500 font-medium">Carregando ambiente de simulação...</p>
      </div>
    );
  }

  const selectedUserObj = users.find((u) => u.id === selectedUserId);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in pb-12">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Zap className="text-amber-500" /> Testes Sintéticos & Homologação
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Simule webhooks e validação de renovações com dados sintéticos sem transações financeiras reais.
          </p>
        </div>

        {/* Abas de Navegação */}
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
          <Link
            href="/admin/licenses"
            className="px-3 py-1.5 rounded-lg text-gray-600 dark:text-slate-400 hover:text-gray-900"
          >
            Assinaturas
          </Link>
          <Link
            href="/admin/financeiro/integracoes"
            className="px-3 py-1.5 rounded-lg text-gray-600 dark:text-slate-400 hover:text-gray-900"
          >
            Configuração Gateways
          </Link>
          <span className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm flex items-center gap-1">
            <Zap size={13} className="text-amber-500" /> Testes Sintéticos
          </span>
          <Link
            href="/admin/financeiro/fechamento"
            className="px-3 py-1.5 rounded-lg text-gray-600 dark:text-slate-400 hover:text-gray-900"
          >
            Fechamento
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* COLUNA ESQUERDA: PARÂMETROS DA SIMULAÇÃO */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
              <Sliders size={18} className="text-indigo-600" />
              Parâmetros da Simulação
            </h2>

            {/* 1. Selecionar Usuário */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider block">
                Usuário Alvo do Teste
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full text-sm rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email} {u.full_name ? `(${u.full_name})` : ''} — {u.status || 'sem status'}
                  </option>
                ))}
              </select>

              {selectedUserObj && (
                <div className="p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">ID:</span>
                    <span className="font-mono text-gray-700 dark:text-gray-300">{selectedUserObj.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status Atual:</span>
                    <span className="font-bold text-gray-900 dark:text-white">{selectedUserObj.status || 'null'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Selecionar Evento */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider block">
                Evento de Webhook a Disparar
              </label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedEvent('PAYMENT_RECEIVED')}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                    selectedEvent === 'PAYMENT_RECEIVED'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500'
                      : 'border-gray-200 dark:border-slate-800 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <div>
                      <span className="font-bold text-xs block">PAYMENT_RECEIVED</span>
                      <span className="text-[10px] text-gray-500">Pagamento Confirmado (Ativação +30d)</span>
                    </div>
                  </div>
                  {selectedEvent === 'PAYMENT_RECEIVED' && <CheckCircle2 size={16} className="text-emerald-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedEvent('PAYMENT_OVERDUE')}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                    selectedEvent === 'PAYMENT_OVERDUE'
                      ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500'
                      : 'border-gray-200 dark:border-slate-800 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <div>
                      <span className="font-bold text-xs block">PAYMENT_OVERDUE</span>
                      <span className="text-[10px] text-gray-500">Pagamento Vencido (Inadimplência)</span>
                    </div>
                  </div>
                  {selectedEvent === 'PAYMENT_OVERDUE' && <CheckCircle2 size={16} className="text-amber-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedEvent('SUBSCRIPTION_DELETED')}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                    selectedEvent === 'SUBSCRIPTION_DELETED'
                      ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20 text-red-900 dark:text-red-200 ring-2 ring-red-500'
                      : 'border-gray-200 dark:border-slate-800 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                    <div>
                      <span className="font-bold text-xs block">SUBSCRIPTION_DELETED</span>
                      <span className="text-[10px] text-gray-500">Assinatura Cancelada</span>
                    </div>
                  </div>
                  {selectedEvent === 'SUBSCRIPTION_DELETED' && <CheckCircle2 size={16} className="text-red-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedEvent('PAYMENT_REFUNDED')}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                    selectedEvent === 'PAYMENT_REFUNDED'
                      ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 text-purple-900 dark:text-purple-200 ring-2 ring-purple-500'
                      : 'border-gray-200 dark:border-slate-800 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                    <div>
                      <span className="font-bold text-xs block">PAYMENT_REFUNDED</span>
                      <span className="text-[10px] text-gray-500">Reembolso / Estorno</span>
                    </div>
                  </div>
                  {selectedEvent === 'PAYMENT_REFUNDED' && <CheckCircle2 size={16} className="text-purple-600" />}
                </button>
              </div>
            </div>

            {/* 3. Meio de Pagamento & Valor */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Meio</label>
                <select
                  value={billingType}
                  onChange={(e) => setBillingType(e.target.value as any)}
                  className="w-full text-xs rounded-lg border border-gray-300 dark:border-slate-700 p-2 bg-white dark:bg-slate-800"
                >
                  <option value="PIX">Pix</option>
                  <option value="CREDIT_CARD">Cartão</option>
                  <option value="BOLETO">Boleto</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs rounded-lg border border-gray-300 dark:border-slate-700 p-2 bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            {/* 4. Teste de Idempotência */}
            <label className="flex items-center gap-2 cursor-pointer p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700">
              <input
                type="checkbox"
                checked={testIdempotency}
                onChange={(e) => setTestIdempotency(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <span className="text-xs text-gray-700 dark:text-slate-300 font-medium">
                Validar Idempotência (dispara evento duplicado e confere prevenção)
              </span>
            </label>

            {/* BOTÃO DISPARAR */}
            <button
              type="button"
              onClick={handleRunSimulation}
              disabled={executing || !selectedUserId}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {executing ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
              Executar Simulação Sintética
            </button>
          </div>
        </div>

        {/* COLUNA DIREITA: CONSOLE DE RESULTADOS AO VIVO */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-5 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-slate-300 font-bold">
                <Terminal size={18} className="text-emerald-400" />
                <span>Console de Resposta do Webhook</span>
              </div>
              {executionResult && (
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    executionResult.success
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-red-950 text-red-400 border border-red-800'
                  }`}
                >
                  HTTP {executionResult.httpStatus || (executionResult.success ? '200' : '500')}
                </span>
              )}
            </div>

            {!executionResult && !executing && (
              <div className="py-16 text-center text-slate-600 flex flex-col items-center gap-3">
                <Zap size={32} className="opacity-30" />
                <p>Selecione os parâmetros e clique em &quot;Executar Simulação Sintética&quot;.</p>
              </div>
            )}

            {executing && (
              <div className="py-16 text-center text-amber-400 flex flex-col items-center gap-3">
                <Loader2 size={32} className="animate-spin" />
                <p>Disparando payload e processando webhook no servidor...</p>
              </div>
            )}

            {executionResult && (
              <div className="space-y-4 animate-in fade-in">
                {/* Status Geral */}
                <div className="flex items-center gap-2 text-sm">
                  {executionResult.success ? (
                    <CheckCircle2 size={18} className="text-emerald-400" />
                  ) : (
                    <XCircle size={18} className="text-red-400" />
                  )}
                  <span className="font-bold text-white">
                    {executionResult.success
                      ? `Evento ${executionResult.event} aceito e processado!`
                      : `Falha: ${executionResult.error || 'Erro no webhook'}`}
                  </span>
                </div>

                {/* Idempotência */}
                {executionResult.idempotency && (
                  <div
                    className={`p-3 rounded-lg border text-[11px] ${
                      executionResult.idempotency.isIdempotent
                        ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                        : 'bg-amber-950/40 border-amber-800 text-amber-300'
                    }`}
                  >
                    <span className="font-bold">🛡️ Teste de Idempotência: </span>
                    {executionResult.idempotency.isIdempotent
                      ? 'SUCESSO! O 2º disparo idêntico foi identificado como já processado e não duplicou a cobrança.'
                      : 'AVISO: O 2º disparo não foi marcado como already_processed.'}
                  </div>
                )}

                {/* Diff no Banco de Dados */}
                {executionResult.dbDiff && (
                  <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-amber-400 font-bold block flex items-center gap-1.5">
                      <Database size={14} /> Efeito no Banco de Dados
                    </span>

                    <div className="grid grid-cols-2 gap-3 text-[11px] pt-1">
                      <div>
                        <span className="text-slate-500 block mb-1">Antes do Teste:</span>
                        <div className="bg-black/40 p-2 rounded text-slate-300 space-y-0.5">
                          <div>Sub Status: {executionResult.dbDiff.subscription?.before?.status || 'n/a'}</div>
                          <div>Vencimento: {executionResult.dbDiff.subscription?.before?.current_period_end?.split('T')[0] || 'n/a'}</div>
                          <div>Profile Status: {executionResult.dbDiff.profile?.before?.status || 'n/a'}</div>
                        </div>
                      </div>

                      <div>
                        <span className="text-emerald-400 block mb-1">Depois do Teste:</span>
                        <div className="bg-black/40 p-2 rounded text-emerald-300 space-y-0.5 border border-emerald-900/50">
                          <div>Sub Status: {executionResult.dbDiff.subscription?.after?.status || 'n/a'}</div>
                          <div>Vencimento: {executionResult.dbDiff.subscription?.after?.current_period_end?.split('T')[0] || 'n/a'}</div>
                          <div>Profile Status: {executionResult.dbDiff.profile?.after?.status || 'n/a'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payload JSON Enviado */}
                <div className="space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Payload Enviado:</span>
                  <pre className="p-3 bg-black/60 rounded-xl text-[10px] text-slate-300 overflow-x-auto max-h-48 scrollbar-thin">
                    {JSON.stringify(executionResult.payloadSent, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
