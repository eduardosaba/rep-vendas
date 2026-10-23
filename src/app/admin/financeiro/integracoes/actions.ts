'use server';

import { createClient } from '@/lib/supabase/server';
import { isGlobalAdmin } from '@/lib/auth/roles';
import {
  getGatewayConfig,
  saveGatewayConfig,
  SaaSGatewayConfig,
} from '@/lib/payments/config';
import { AsaasClient, maskSecret } from '@/lib/payments/asaas';
import { revalidatePath } from 'next/cache';

async function requireMasterRole() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!isGlobalAdmin(profile?.role) && profile?.role !== 'master') {
    throw new Error('Acesso negado: Requer privilégios Master');
  }

  return user;
}

export async function getIntegrationsData() {
  await requireMasterRole();
  const config = await getGatewayConfig();

  return {
    success: true,
    data: {
      activeProvider: config.activeProvider,
      environment: config.environment,
      isConfigured: config.isConfigured,
      hasApiKey: Boolean(config.asaasApiKey),
      maskedApiKey: config.asaasApiKey ? maskSecret(config.asaasApiKey) : '',
      hasWebhookSecret: Boolean(config.asaasWebhookSecret),
      maskedWebhookSecret: config.asaasWebhookSecret
        ? maskSecret(config.asaasWebhookSecret)
        : '',
      infinitepayHandle: config.infinitepayHandle,
      lastTestedAt: config.lastTestedAt,
      lastTestStatus: config.lastTestStatus,
      lastTestMessage: config.lastTestMessage,
    },
  };
}

export async function saveIntegrationsData(formData: FormData) {
  try {
    await requireMasterRole();

    const currentConfig = await getGatewayConfig();

    const activeProvider = (formData.get('activeProvider') as any) || 'asaas';
    const environment = (formData.get('environment') as any) || 'sandbox';
    const newApiKey = (formData.get('asaasApiKey') as string)?.trim();
    const newWebhookSecret = (formData.get('asaasWebhookSecret') as string)?.trim();
    const infinitepayHandle = (formData.get('infinitepayHandle') as string)?.trim() || 'repvendas';

    // Se o usuário não digitou uma nova chave (ou deixou vazio e já tinha uma), preserva a atual
    const asaasApiKey = newApiKey ? newApiKey : currentConfig.asaasApiKey;
    const asaasWebhookSecret = newWebhookSecret ? newWebhookSecret : currentConfig.asaasWebhookSecret;

    const res = await saveGatewayConfig({
      activeProvider,
      environment,
      asaasApiKey,
      asaasWebhookSecret,
      infinitepayHandle,
      isConfigured: Boolean(asaasApiKey),
    });

    if (!res.success) throw new Error(res.error);

    revalidatePath('/admin/financeiro/integracoes');
    return { success: true, message: 'Configurações de integração salvas com sucesso!' };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Erro ao salvar configurações' };
  }
}

export async function testIntegrationsConnectivity(params?: {
  apiKey?: string;
  environment?: 'sandbox' | 'production';
}) {
  try {
    await requireMasterRole();

    const config = await getGatewayConfig();
    const keyToTest = params?.apiKey?.trim() || config.asaasApiKey;
    const envToTest = params?.environment || config.environment;

    if (!keyToTest) {
      return {
        success: false,
        error: 'Nenhuma chave de API fornecida para o teste.',
      };
    }

    const client = new AsaasClient({
      apiKey: keyToTest,
      environment: envToTest,
    });

    const result = await client.testConnection();

    // Salvar auditoria do teste
    await saveGatewayConfig({
      lastTestedAt: new Date().toISOString(),
      lastTestStatus: result.success ? 'success' : 'failed',
      lastTestMessage: result.message,
    });

    revalidatePath('/admin/financeiro/integracoes');

    return {
      success: result.success,
      status: result.status,
      environment: result.environment,
      message: result.message,
      details: result.details,
    };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Erro ao executar teste de conectividade' };
  }
}
