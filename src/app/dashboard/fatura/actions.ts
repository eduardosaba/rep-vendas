'use server';

import { createClient } from '@/lib/supabase/server';
import { getGatewayConfig, getAsaasClientFromConfig } from '@/lib/payments/config';
import type { AsaasCycle } from '@/lib/payments/asaas';
import { resolveSubscriptionAccess } from '@/lib/auth/subscription-rules';

export interface PlanOption {
  id: string;
  name: string;
  monthlyPrice: number;
  description: string;
  features: string[];
  recommended?: boolean;
}

export const AVAILABLE_PLANS: PlanOption[] = [
  {
    id: 'Fundador',
    name: 'Plano Fundador',
    monthlyPrice: 50.0,
    description: 'Acesso completo com preço vitalício exclusivo de lançamento.',
    features: [
      'Catálogo Virtual com link personalizado',
      'Até 5.000 armações cadastradas',
      'Controle de pedidos e WhatsApp integrado',
      'Gestão de clientes e tabelas de preços',
      'Suporte prioritário RepVendas',
    ],
    recommended: true,
  },
  {
    id: 'Premium',
    name: 'Plano Premium',
    monthlyPrice: 97.0,
    description: 'Para representantes com alto volume de produtos e marcas.',
    features: [
      'Tudo do Plano Fundador',
      'Até 15.000 armações cadastradas',
      'Multi-tabelas de preços com senha',
      'Exportação de relatórios avançados',
      'Banners e vitrine personalizada',
    ],
  },
  {
    id: 'Distribuidora',
    name: 'Plano Distribuidora',
    monthlyPrice: 149.9,
    description: 'Gestão completa de equipe de representantes e estoque master.',
    features: [
      'Tudo do Plano Premium',
      'Múltiplos representantes vinculados',
      'Estoque centralizado com baixa automática',
      'Comissionamento e relatórios de equipe',
      'Suporte VIP via WhatsApp',
    ],
  },
];

/**
 * Retorna os dados completos da assinatura do usuário logado
 */
export async function getSubscriptionManagementData() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Usuário não autenticado.' };
    }

    const [profileRes, subRes, gatewayConfig] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, email, role, status, trial_ends_at, is_active, created_at, company_id')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(),
      getGatewayConfig(),
    ]);

    const profile = profileRes.data || null;
    const subscription = subRes.data || null;
    const access = resolveSubscriptionAccess(profile, subscription);

    return {
      success: true,
      profile,
      subscription,
      access,
      isGatewayConfigured: gatewayConfig.isConfigured,
      activeProvider: gatewayConfig.activeProvider,
      plans: AVAILABLE_PLANS,
    };
  } catch (error: any) {
    console.error('[getSubscriptionManagementData] Erro:', error);
    return { success: false, error: error?.message || 'Erro ao carregar dados da assinatura.' };
  }
}

/**
 * Cancela a assinatura ativa do usuário no Asaas e no banco local
 */
export async function cancelarAssinaturaUsuario() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Usuário não autenticado.' };
    }

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id, asaas_subscription_id, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle();

    // Se houver ID de assinatura no Asaas, cancela no gateway
    if (sub?.asaas_subscription_id) {
      try {
        const asaas = await getAsaasClientFromConfig();
        await asaas.cancelSubscription(sub.asaas_subscription_id);
      } catch (asaasErr) {
        console.warn('[cancelarAssinaturaUsuario] Aviso ao cancelar no Asaas:', asaasErr);
      }
    }

    // Atualiza tabela local
    await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    return {
      success: true,
      message: 'Assinatura cancelada com sucesso. Seu acesso continuará ativo até o término do período vigente.',
      expiryDate: sub?.current_period_end || null,
    };
  } catch (error: any) {
    console.error('[cancelarAssinaturaUsuario] Erro:', error);
    return { success: false, error: error?.message || 'Erro ao cancelar assinatura.' };
  }
}

/**
 * Função de retrocompatibilidade para componentes legados que chamavam gerarLinkPagamento
 * Redireciona o usuário para a nova central de faturas e planos com Asaas
 */
export async function gerarLinkPagamento(_userData?: {
  id?: string;
  name?: string;
  email?: string;
  plan_id?: string;
}): Promise<string | null> {
  return '/dashboard/fatura';
}