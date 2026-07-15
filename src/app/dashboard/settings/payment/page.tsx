'use client';

/**
 * src/app/dashboard/settings/payment/page.tsx
 *
 * Página de configuração de pagamento
 * Integra o componente PaymentGatewaySetup para o usuário configurar Mercado Pago
 */

import PaymentGatewaySetup from '@/components/payment/PaymentGatewaySetup';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { PaymentGateway } from '@/lib/types';
import {
  ArrowLeft,
  CreditCard,
  DollarSign,
  Loader2,
  Shield,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function PaymentSettingsPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#3B82F6');
  const [currentGateway, setCurrentGateway] = useState<PaymentGateway | null>(
    null
  );
  const [settings, setSettings] = useState<any>(null);

  // 1. Carregar dados do usuário e configurações
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Obter usuário atual
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          toast.error('Erro ao carregar usuário');
          return;
        }

        setUserId(user.id);

        // Obter configurações (para cor primária)
        const { data: settingsData } = await supabase
          .from('settings')
          .select('primary_color, secondary_color')
          .eq('user_id', user.id)
          .single();

        if (settingsData?.primary_color) {
          setPrimaryColor(settingsData.primary_color);
        }
        setSettings(settingsData);

        // Obter gateway de pagamento atual
        const { data: gatewayData } = await supabase
          .from('payment_gateways')
          .select('*')
          .eq('user_id', user.id)
          .eq('provider', 'mercadopago')
          .eq('is_active', true)
          .maybeSingle();

        setCurrentGateway(gatewayData as PaymentGateway | null);
      } catch (error) {
        console.error('[PaymentSettingsPage] Error loading data:', error);
        toast.error('Erro ao carregar configurações');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin mx-auto mb-4" />
          <p>Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/dashboard/settings"
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft
                size={20}
                className="text-gray-600 dark:text-gray-400"
              />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                🏦 Configuração de Pagamento
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Gerencie seus gateways de pagamento e comece a aceitar compras
                online
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <CreditCard
                size={20}
                className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
              />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-200">
                  Múltiplos Métodos
                </p>
                <p className="text-xs text-blue-800 dark:text-blue-300 mt-1">
                  Cartão, Boleto, PIX e mais
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-3">
              <DollarSign
                size={20}
                className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5"
              />
              <div className="text-sm">
                <p className="font-medium text-green-900 dark:text-green-200">
                  Sem Taxa Fixa
                </p>
                <p className="text-xs text-green-800 dark:text-green-300 mt-1">
                  Pague apenas por transação
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-start gap-3">
              <Shield
                size={20}
                className="text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5"
              />
              <div className="text-sm">
                <p className="font-medium text-purple-900 dark:text-purple-200">
                  100% Seguro
                </p>
                <p className="text-xs text-purple-800 dark:text-purple-300 mt-1">
                  Criptografia de ponta a ponta
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Gateway Setup Section */}
        {userId && (
          <div className="space-y-6">
            <PaymentGatewaySetup
              userId={userId}
              currentGateway={currentGateway}
              primaryColor={primaryColor}
              onSuccess={(gateway) => {
                setCurrentGateway(gateway);
                toast.success('✅ Configuração atualizada com sucesso!');
              }}
            />

            {/* Status Summary */}
            <div className="p-6 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                📊 Status de Configuração
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Gateway Ativo
                  </span>
                  <span
                    className={`text-sm font-medium px-3 py-1 rounded-full ${
                      currentGateway?.is_active
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {currentGateway?.is_active ? '✅ Ativo' : '⚠️ Inativo'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Configuração Completa
                  </span>
                  <span
                    className={`text-sm font-medium px-3 py-1 rounded-full ${
                      currentGateway?.is_configured
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    {currentGateway?.is_configured
                      ? '✅ Pronto'
                      : '⏳ Incompleto'}
                  </span>
                </div>

                {currentGateway?.updated_at && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Última atualização
                    </span>
                    <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                      {new Date(currentGateway.updated_at).toLocaleDateString(
                        'pt-BR'
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Next Steps */}
            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-4">
                📋 Próximos Passos
              </h3>

              <ol className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
                <li>
                  <span className="font-medium">1. Adicione credenciais:</span>{' '}
                  Insira seu Access Token do Mercado Pago acima
                </li>
                <li>
                  <span className="font-medium">2. Teste a integração:</span>{' '}
                  Acesse{' '}
                  <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-xs">
                    /api/test/payment-gateway
                  </code>
                </li>
                <li>
                  <span className="font-medium">3. Configure webhook:</span> Vá
                  para Mercado Pago Dashboard e ative notificações
                </li>
                <li>
                  <span className="font-medium">4. Teste pagamento:</span> Faça
                  uma compra de teste em seu catálogo público
                </li>
              </ol>
            </div>

            {/* Test Button */}
            <div className="flex gap-3">
              <Link href="/api/test/payment-gateway" target="_blank">
                <Button className="bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200">
                  🧪 Testar Gateway
                </Button>
              </Link>

              <Link
                href="https://www.mercadopago.com.br/developers/panel/app"
                target="_blank"
              >
                <Button variant="outline">🔗 Abrir Mercado Pago</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
