'use client';

/**
 * src/components/payment/PaymentGatewaySetup.tsx
 *
 * Componente para configuração de gateway de pagamento
 * Permite que o usuário insira suas credenciais do Mercado Pago de forma segura
 */

import { registerPaymentGateway } from '@/actions/payment-actions';
import { PaymentGateway } from '@/lib/types';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

interface PaymentGatewaySetupProps {
  userId: string;
  currentGateway?: PaymentGateway | null;
  onSuccess?: (gateway: PaymentGateway) => void;
  primaryColor?: string;
}

export default function PaymentGatewaySetup({
  userId,
  currentGateway,
  onSuccess,
  primaryColor = '#3B82F6',
}: PaymentGatewaySetupProps) {
  const [isPending, startTransition] = useTransition();
  const [accessToken, setAccessToken] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accessToken.trim()) {
      toast.error('Access token é obrigatório');
      return;
    }

    startTransition(async () => {
      try {
        const result = await registerPaymentGateway(
          userId,
          accessToken.trim(),
          webhookSecret.trim() || undefined
        );

        if (result.success && result.gateway) {
          toast.success('Gateway de pagamento configurado com sucesso! 🎉');
          setAccessToken('');
          setWebhookSecret('');
          setIsExpanded(false);
          onSuccess?.(result.gateway);
        } else {
          toast.error(result.error || 'Erro ao configurar gateway');
        }
      } catch (error) {
        console.error('[PaymentGatewaySetup]', error);
        toast.error('Erro ao configurar gateway de pagamento');
      }
    });
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            💳 Mercado Pago
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Configure seu gateway de pagamento para aceitar compras online
          </p>
        </div>
        {currentGateway?.is_configured && (
          <div className="flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-900/20 rounded-full">
            <CheckCircle2
              size={16}
              className="text-green-600 dark:text-green-400"
            />
            <span className="text-xs font-medium text-green-700 dark:text-green-300">
              Configurado
            </span>
          </div>
        )}
      </div>

      {/* Current Status */}
      {currentGateway?.is_configured && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <p className="text-sm text-blue-900 dark:text-blue-200">
            ✅ Seu gateway está ativo. Os clientes podem realizar pagamentos
            online.
          </p>
        </div>
      )}

      {/* Form Toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full mb-4 px-4 py-2 text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
      >
        {isExpanded ? '📍 Fechar' : '📍 Adicionar / Atualizar Credenciais'}
      </button>

      {/* Form */}
      {isExpanded && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 pt-4 border-t border-gray-200 dark:border-slate-700"
        >
          {/* Warning */}
          <div className="flex gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
            <AlertCircle
              size={18}
              className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
            />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium mb-1">
                Suas credenciais são armazenadas com segurança.
              </p>
              <p>Nunca compartilhe seu Access Token com terceiros.</p>
            </div>
          </div>

          {/* Access Token Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Access Token do Mercado Pago *
            </label>
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="APP_USR_..."
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 transition-all"
              style={{ '--tw-ring-color': primaryColor } as any}
              disabled={isPending}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Encontre em: Mercado Pago Dashboard &gt; Credenciais &gt; Access
              Token
            </p>
          </div>

          {/* Webhook Secret Input (Optional) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Webhook Secret (Opcional)
            </label>
            <input
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder="webhook_secret_..."
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 transition-all"
              style={{ '--tw-ring-color': primaryColor } as any}
              disabled={isPending}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Opcional. Use se ativou "Webhook Signature Validation" no Mercado
              Pago.
            </p>
          </div>

          {/* Helper Link */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <p className="text-xs text-blue-900 dark:text-blue-200 mb-2">
              Precisa de ajuda? Siga esse guia:
            </p>
            <ol className="text-xs text-blue-800 dark:text-blue-300 space-y-1 list-decimal list-inside">
              <li>
                Acesse{' '}
                <a
                  href="https://www.mercadopago.com.br/developers/panel/app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                >
                  Mercado Pago Developers
                </a>
              </li>
              <li>Acesse suas credenciais na sessão de producción</li>
              <li>Copie o Access Token</li>
              <li>Cole aqui e clique em Salvar</li>
            </ol>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending || !accessToken.trim()}
              className="flex-1 px-4 py-2 bg-gradient-to-r text-white font-medium text-sm rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: primaryColor,
                opacity: isPending || !accessToken.trim() ? 0.5 : 1,
              }}
            >
              {isPending && <Loader2 size={16} className="animate-spin" />}
              {isPending ? 'Validando...' : 'Salvar Credenciais'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsExpanded(false);
                setAccessToken('');
                setWebhookSecret('');
              }}
              disabled={isPending}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Info Footer */}
      {!isExpanded && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
          <p>
            {currentGateway?.is_configured
              ? '✅ Seus clientes podem pagar agora.'
              : '⚠️ Configure para começar a aceitar pagamentos online.'}
          </p>
        </div>
      )}
    </div>
  );
}
