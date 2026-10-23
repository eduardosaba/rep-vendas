'use client';

import { useState, useEffect } from 'react';
import {
  CreditCard,
  Zap,
  MessageCircle,
  ShieldCheck,
  Clock,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  ExternalLink,
  Copy,
  Calendar,
  Sparkles,
  RefreshCw,
  XCircle,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getSubscriptionManagementData,
  cancelarAssinaturaUsuario,
  type PlanOption,
} from './actions';

type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';

const CYCLE_CONFIGS: Record<
  BillingCycle,
  { label: string; months: number; discountPercent: number; badge?: string }
> = {
  MONTHLY: { label: 'Mensal', months: 1, discountPercent: 0 },
  QUARTERLY: { label: 'Trimestral', months: 3, discountPercent: 0.05, badge: '5% OFF' },
  SEMIANNUALLY: { label: 'Semestral', months: 6, discountPercent: 0.10, badge: '10% OFF' },
  YEARLY: {
    label: 'Anual',
    months: 12,
    discountPercent: 0.20,
    badge: '20% OFF (Mais Econômico)',
  },
};

export default function FaturaPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>('MONTHLY');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('Fundador');
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<any>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      let res: any = null;
      try {
        const apiRes = await fetch('/api/subscription/me', {
          method: 'GET',
          cache: 'no-store',
        });
        if (apiRes.ok) {
          res = await apiRes.json();
        }
      } catch {
        // Fallback para Server Action
      }

      if (!res || !res.success) {
        res = await getSubscriptionManagementData();
      }

      if (res && res.success) {
        setData(res);
        if (res.subscription?.plan_name) {
          const matched = (res.plans as PlanOption[])?.find(
            (p) => p.name.toLowerCase() === res.subscription.plan_name.toLowerCase()
          );
          if (matched) setSelectedPlanId(matched.id);
        }
      } else {
        toast.error(res?.error || 'Erro ao carregar dados da assinatura.');
      }
    } catch (err: any) {
      console.error('[fatura] Erro ao carregar assinatura:', err);
      toast.error('Erro de conexão ao carregar assinatura.');
    } finally {
      setLoading(false);
    }
  };

  const handleGerarCheckout = async () => {
    setIsProcessing(true);
    setCheckoutResult(null);
    const toastId = toast.loading('Gerando fatura segura no Asaas...');

    try {
      const response = await fetch('/api/asaas/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planName: selectedPlanId,
          cycle: selectedCycle,
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.ok) {
        if (json.notConfigured) {
          toast.error(
            'O gateway Asaas ainda não foi configurado. Entre em contato com o suporte.',
            { id: toastId, duration: 6000 }
          );
        } else {
          toast.error(json.error || 'Erro ao processar pagamento.', { id: toastId });
        }
        setIsProcessing(false);
        return;
      }

      toast.success('Fatura gerada com sucesso!', { id: toastId });
      setCheckoutResult(json);

      // Se tiver URL de fatura direta, redireciona em nova aba ou exibe na tela
      if (json.url) {
        window.open(json.url, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      toast.error('Erro ao conectar com o servidor: ' + (err.message || 'Tente novamente.'), {
        id: toastId,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelarAssinatura = async () => {
    setIsCanceling(true);
    const toastId = toast.loading('Processando cancelamento...');
    try {
      const res = await cancelarAssinaturaUsuario();
      if (res.success) {
        toast.success(res.message, { id: toastId, duration: 6000 });
        setIsCancelModalOpen(false);
        loadSubscriptionData();
      } else {
        toast.error(res.error || 'Falha ao cancelar assinatura.', { id: toastId });
      }
    } catch (err: any) {
      toast.error('Erro inesperado ao cancelar assinatura.', { id: toastId });
    } finally {
      setIsCanceling(false);
    }
  };

  const copyToClipboard = (text: string, label = 'Código') => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado para a área de transferência!`);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-primary" size={38} />
        <p className="text-sm text-slate-500 font-medium">Carregando detalhes do seu plano...</p>
      </div>
    );
  }

  const access = data?.access;
  const subscription = data?.subscription;
  const profile = data?.profile;
  const isGatewayConfigured = data?.isGatewayConfigured;

  const currentPlanName = subscription?.plan_name || 'Plano Fundador';
  const isTrial = access?.status === 'ACTIVE_TRIAL' || access?.status === 'GRACE_PERIOD_TRIAL';
  const isPaid = access?.status === 'ACTIVE_PAID' || access?.status === 'GRACE_PERIOD_PAID';
  const isBlocked = access?.isBlocked;
  const inGracePeriod = access?.inGracePeriod;
  const daysLeft = access?.daysRemainingOrOverdue ?? 0;

  // Cálculo de valores conforme ciclo selecionado
  const activePlanObj =
    (data?.plans as PlanOption[])?.find((p) => p.id === selectedPlanId) ||
    (data?.plans as PlanOption[])?.[0] || { monthlyPrice: 50, name: 'Plano Fundador' };

  const currentCycleConfig = CYCLE_CONFIGS[selectedCycle];
  const rawCycleTotal = activePlanObj.monthlyPrice * currentCycleConfig.months;
  const finalCycleTotal = rawCycleTotal * (1 - currentCycleConfig.discountPercent);
  const monthlyEquivalent = finalCycleTotal / currentCycleConfig.months;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <CreditCard size={22} />
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Meu Plano & Assinatura
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gerencie seu plano, ciclo de faturamento e renove com desconto para manter seus catálogos ativos.
          </p>
        </div>

        <button
          onClick={loadSubscriptionData}
          className="self-start md:self-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <RefreshCw size={13} /> Atualizar status
        </button>
      </div>

      {/* CARD 1: Status Atual da Assinatura */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white p-6 md:p-8 shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Plano Vigente
              </span>

              {/* Badges de Status */}
              {isBlocked ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                  <XCircle size={13} /> Assinatura Vencida / Suspensa
                </span>
              ) : inGracePeriod ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <AlertTriangle size={13} /> Tolerância ({Math.abs(daysLeft)} dias em atraso)
                </span>
              ) : isTrial ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  <Clock size={13} /> Período de Testes ({daysLeft} dias restantes)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 size={13} /> Assinatura Ativa
                </span>
              )}
            </div>

            <h2 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
              {currentPlanName}
            </h2>

            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              {isBlocked
                ? 'Sua conta expirou o prazo limite de tolerância. Renove abaixo para desbloquear seu catálogo público imediatamente.'
                : inGracePeriod
                  ? 'Você está no período de carência de 5 dias. Regularize sua assinatura para não ter seu catálogo pausado.'
                  : isTrial
                    ? `Você está aproveitando o teste gratuito do RepVendas. Restam ${daysLeft} dia(s) para escolher seu ciclo e ativar sua assinatura.`
                    : 'Sua assinatura está regularizada e seus catálogos públicos estão totalmente ativos para receber pedidos.'}
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 flex flex-col gap-1 min-w-[220px]">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
              {isTrial ? 'Expiração do Teste' : 'Próxima Renovação'}
            </span>
            <span className="text-xl font-black text-white flex items-center gap-2">
              <Calendar size={18} className="text-primary" />
              {access?.expiryDate
                ? new Date(access.expiryDate).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })
                : 'A definir'}
            </span>
            <span className="text-xs text-slate-400 mt-1">
              {daysLeft > 0
                ? `${daysLeft} dia(s) restantes`
                : daysLeft < 0
                  ? `Vencido há ${Math.abs(daysLeft)} dia(s)`
                  : 'Vence hoje'}
            </span>
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: Seleção de Ciclo de Faturamento */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles size={18} className="text-primary" />
            Escolha seu Ciclo de Renovação
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Pague por períodos mais longos e garanta descontos exclusivos para o seu negócio.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {(Object.keys(CYCLE_CONFIGS) as BillingCycle[]).map((cycleKey) => {
            const cycle = CYCLE_CONFIGS[cycleKey];
            const isSelected = selectedCycle === cycleKey;
            const cycleTotal =
              activePlanObj.monthlyPrice * cycle.months * (1 - cycle.discountPercent);
            const cycleMonthly = cycleTotal / cycle.months;

            return (
              <button
                key={cycleKey}
                type="button"
                onClick={() => setSelectedCycle(cycleKey)}
                className={`relative rounded-2xl p-4 sm:p-5 text-left border-2 transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-lg shadow-primary/10 ring-2 ring-primary/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {cycle.badge && (
                  <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-sm">
                    {cycle.badge}
                  </span>
                )}

                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Ciclo
                  </span>
                  <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                    {cycle.label}
                  </h4>
                  <div className="mt-2 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    R$ {cycleMonthly.toFixed(2).replace('.', ',')}
                    <span className="text-xs font-normal text-slate-400">/mês</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
                  Total:{' '}
                  <strong className="text-slate-800 dark:text-slate-200">
                    R$ {cycleTotal.toFixed(2).replace('.', ',')}
                  </strong>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SEÇÃO 3: Opções de Planos (Para Upgrade / Downgrade) */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Planos Disponíveis
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Selecione o plano ideal para a quantidade de armações e volume do seu catálogo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(data?.plans as PlanOption[])?.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            const planCycleTotal =
              plan.monthlyPrice * currentCycleConfig.months * (1 - currentCycleConfig.discountPercent);

            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`cursor-pointer rounded-3xl p-6 sm:p-7 border-2 transition-all flex flex-col justify-between relative ${
                  isSelected
                    ? 'border-primary bg-white dark:bg-slate-900 shadow-2xl ring-2 ring-primary/20 scale-[1.01]'
                    : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {plan.recommended && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary text-white shadow-md">
                    Mais Popular
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="text-xl font-black text-slate-900 dark:text-white">
                      {plan.name}
                    </h4>
                    <span
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? 'border-primary bg-primary text-white'
                          : 'border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                    {plan.description}
                  </p>

                  <div className="mb-6">
                    <span className="text-3xl font-black text-slate-900 dark:text-white">
                      R$ {plan.monthlyPrice.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-xs text-slate-400">/mês base</span>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 mb-6">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all ${
                      isSelected
                        ? 'bg-primary text-white shadow-md shadow-primary/25'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {isSelected ? 'Plano Selecionado' : 'Escolher este Plano'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SEÇÃO 4: CTA de Pagamento com Asaas */}
      <div className="rounded-3xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="space-y-1 text-center md:text-left">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            Resumo do Pedido
          </span>
          <h4 className="text-xl font-black text-slate-900 dark:text-white">
            {activePlanObj.name} • {currentCycleConfig.label}
          </h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Total a faturar: <strong className="text-slate-900 dark:text-white text-base">R$ {finalCycleTotal.toFixed(2).replace('.', ',')}</strong> via PIX, Cartão ou Boleto.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleGerarCheckout}
            disabled={isProcessing}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/35 active:scale-98 transition-all disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Gerando fatura...</span>
              </>
            ) : (
              <>
                <Zap size={20} />
                <span>Pagar e Ativar via Asaas</span>
              </>
            )}
          </button>

          <a
            href="https://wa.me/5575981272323"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <MessageCircle size={17} className="text-emerald-500" />
            <span>Falar com Financeiro</span>
          </a>
        </div>
      </div>

      {/* MODAL / CARD DE PIX GERADO OU FATURA RECENTE */}
      {checkoutResult && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-500/50 p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-200 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 rounded-xl">
                <CheckCircle2 size={22} />
              </span>
              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                  Fatura Gerada com Sucesso!
                </h4>
                <p className="text-xs text-slate-500">
                  {checkoutResult.planName} • {checkoutResult.cycleLabel} (R$ {Number(checkoutResult.totalValue).toFixed(2).replace('.', ',')})
                </p>
              </div>
            </div>

            {checkoutResult.url && (
              <a
                href={checkoutResult.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary/90 transition-all shadow-sm"
              >
                Abrir Fatura Asaas <ExternalLink size={14} />
              </a>
            )}
          </div>

          {/* Se houver QR Code Pix */}
          {checkoutResult.pix && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex flex-col items-center text-center">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2">
                  Pagamento Instantâneo via PIX
                </span>
                {checkoutResult.pix.encodedImage ? (
                  <img
                    src={`data:image/png;base64,${checkoutResult.pix.encodedImage}`}
                    alt="QR Code Pix"
                    className="w-48 h-48 rounded-xl border border-slate-200 dark:border-slate-700 bg-white p-2 shadow-sm"
                  />
                ) : (
                  <div className="w-48 h-48 bg-slate-200 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                    <QrCode size={48} className="text-slate-400" />
                  </div>
                )}
                <span className="text-[11px] text-slate-400 mt-2">
                  Aponte o app do seu banco para o QR Code acima
                </span>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Código Pix Copia e Cola:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={checkoutResult.pix.payload || ''}
                    className="w-full text-xs p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-mono truncate"
                  />
                  <button
                    onClick={() => copyToClipboard(checkoutResult.pix.payload, 'Código Pix')}
                    className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors shrink-0 font-bold text-xs inline-flex items-center gap-1.5"
                  >
                    <Copy size={16} /> Copiar
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Assim que você realizar o pagamento pelo app do seu banco, o Asaas avisará nosso sistema e seu catálogo será <strong>desbloqueado no mesmo segundo</strong>.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SEÇÃO 5: Gestão & Cancelamento de Assinatura */}
      {isPaid && (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800/80 p-6 bg-white dark:bg-slate-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Deseja cancelar sua assinatura?
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ao cancelar, você não terá novas cobranças e seu acesso continuará ativo até o fim do ciclo pago atual.
            </p>
          </div>

          <button
            onClick={() => setIsCancelModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-900/30 transition-colors"
          >
            Cancelar Assinatura
          </button>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE CANCELAMENTO */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>

            <h4 className="text-xl font-bold text-slate-900 dark:text-white">
              Confirmar cancelamento da assinatura?
            </h4>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Você não receberá novas cobranças recorrentes. Seu catálogo e painel continuarão funcionando normalmente até a data limite da vigência atual.
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleCancelarAssinatura}
                disabled={isCanceling}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-all shadow-md disabled:opacity-50"
              >
                {isCanceling ? 'Cancelando...' : 'Sim, Cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}