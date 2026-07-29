'use client';

/**
 * src/app/checkout/payment-result/page.tsx
 *
 * Página de resultado após retorno do Mercado Pago
 * Query params: status=success|failure|pending
 *
 * Fluxo:
 * 1. MP redireciona aqui com status
 * 2. Mostramos mensagem de sucesso/erro
 * 3. Oferecemos opções: Voltar ao Catálogo, Ver Pedido, etc
 */

import { ArrowRight, CheckCircle2, Clock, Home, XCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function PaymentResultFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
          Carregando resultado...
        </h1>
      </div>
    </div>
  );
}

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const status = searchParams?.get('status') || 'pending';
  const orderId = searchParams?.get('order_id');

  const isSuccess = status === 'success' || status === 'approved';
  const isFailure = status === 'failure' || status === 'rejected';
  const isPending = status === 'pending';

  if (!isClient) {
    return <PaymentResultFallback />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Success State */}
        {isSuccess && (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 p-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-green-100 dark:bg-green-900/20 rounded-full animate-pulse" />
                <CheckCircle2
                  size={64}
                  className="relative text-green-600 dark:text-green-400"
                />
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-2">
                Pagamento Aprovado! ✅
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Sua compra foi processada com sucesso.
              </p>
            </div>

            {orderId && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  <span className="font-medium">ID do Pedido:</span>{' '}
                  {orderId.slice(0, 8).toUpperCase()}
                </p>
              </div>
            )}

            <div className="pt-4 space-y-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <ArrowRight size={18} />
                Ver Meus Pedidos
              </button>

              <button
                onClick={() => router.push('/')}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                <Home size={18} />
                Voltar ao Catálogo
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 pt-4 border-t border-slate-200 dark:border-slate-700">
              Você receberá um email de confirmação em breve.
            </p>
          </div>
        )}

        {/* Failure State */}
        {isFailure && (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 p-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-red-100 dark:bg-red-900/20 rounded-full animate-pulse" />
                <XCircle
                  size={64}
                  className="relative text-red-600 dark:text-red-400"
                />
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-2">
                Pagamento Recusado ❌
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Não conseguimos processar seu pagamento. Verifique seus dados e
                tente novamente.
              </p>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
              <p className="text-sm text-amber-900 dark:text-amber-200">
                ⚠️ Possíveis motivos:
              </p>
              <ul className="text-xs text-amber-800 dark:text-amber-300 mt-2 text-left space-y-1 list-disc list-inside">
                <li>Dados do cartão incorretos</li>
                <li>Cartão expirado ou bloqueado</li>
                <li>Limite insuficiente</li>
                <li>Operação suspeita (rejeição de segurança)</li>
              </ul>
            </div>

            <div className="pt-4 space-y-3">
              <button
                onClick={() => router.push('/checkout')}
                className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <ArrowRight size={18} />
                Tentar Novamente
              </button>

              <button
                onClick={() => router.push('/')}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                <Home size={18} />
                Voltar ao Catálogo
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 pt-4 border-t border-slate-200 dark:border-slate-700">
              Se o problema persistir, entre em contato com o suporte.
            </p>
          </div>
        )}

        {/* Pending State */}
        {isPending && (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 p-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/20 rounded-full animate-pulse" />
                <Clock
                  size={64}
                  className="relative text-blue-600 dark:text-blue-400 animate-spin"
                />
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-2">
                Pagamento em Processamento ⏳
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Estamos verificando seu pagamento. Isso pode levar alguns
                minutos.
              </p>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                ℹ️ Você receberá uma notificação quando confirmado.
              </p>
            </div>

            <div className="pt-4 space-y-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <ArrowRight size={18} />
                Ver Meus Pedidos
              </button>

              <button
                onClick={() => router.push('/')}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                <Home size={18} />
                Voltar ao Catálogo
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 pt-4 border-t border-slate-200 dark:border-slate-700">
              Não feche esta página durante o processamento.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={<PaymentResultFallback />}>
      <PaymentResultContent />
    </Suspense>
  );
}
