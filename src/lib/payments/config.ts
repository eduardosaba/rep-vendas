/**
 * Gerenciador de Configurações de Gateways de Pagamento do SaaS
 * Torre de Controle — RepVendas
 */

import { createClient } from '@supabase/supabase-js';
import { AsaasClient, AsaasConfig, AsaasEnvironment } from './asaas';

export interface SaaSGatewayConfig {
  activeProvider: 'asaas' | 'infinitepay';
  environment: AsaasEnvironment;
  asaasApiKey: string;
  asaasWebhookSecret: string;
  infinitepayHandle: string;
  isConfigured: boolean;
  lastTestedAt?: string | null;
  lastTestStatus?: 'success' | 'failed' | null;
  lastTestMessage?: string | null;
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Obtém a configuração ativa de gateway, combinando banco de dados com fallback de variáveis de ambiente
 */
export async function getGatewayConfig(): Promise<SaaSGatewayConfig> {
  // Valores padrão vindos de variáveis de ambiente (fallback seguro)
  const envConfig: SaaSGatewayConfig = {
    activeProvider: 'asaas',
    environment: (process.env.ASAAS_ENVIRONMENT as AsaasEnvironment) || 'sandbox',
    asaasApiKey: process.env.ASAAS_API_KEY || '',
    asaasWebhookSecret: process.env.ASAAS_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET || '',
    infinitepayHandle: 'repvendas',
    isConfigured: Boolean(process.env.ASAAS_API_KEY),
    lastTestedAt: null,
    lastTestStatus: null,
    lastTestMessage: null,
  };

  try {
    const admin = getSupabaseAdmin();
    if (admin) {
      // 1. Tentar ler da tabela saas_gateway_configs
      const { data: dbData, error } = await (admin as any)
        .from('saas_gateway_configs')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();

      if (!error && dbData) {
        return {
          activeProvider: dbData.active_provider || envConfig.activeProvider,
          environment: (dbData.environment as AsaasEnvironment) || envConfig.environment,
          asaasApiKey: dbData.asaas_api_key || envConfig.asaasApiKey,
          asaasWebhookSecret: dbData.asaas_webhook_secret || envConfig.asaasWebhookSecret,
          infinitepayHandle: dbData.infinitepay_handle || envConfig.infinitepayHandle,
          isConfigured: Boolean(dbData.asaas_api_key || envConfig.asaasApiKey),
          lastTestedAt: dbData.last_tested_at || null,
          lastTestStatus: dbData.last_test_status || null,
          lastTestMessage: dbData.last_test_message || null,
        };
      }
    }
  } catch (err) {
    // Se a tabela ainda não existir remotamente, o fallback de ambiente é mantido sem falhar
  }

  return envConfig;
}

/**
 * Salva a configuração de gateway no banco de dados
 */
export async function saveGatewayConfig(
  newConfig: Partial<SaaSGatewayConfig>
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return { success: false, error: 'Chaves de administrador do Supabase não configuradas no servidor.' };
    }

    const payload = {
      id: 'default',
      active_provider: newConfig.activeProvider || 'asaas',
      environment: newConfig.environment || 'sandbox',
      asaas_api_key: newConfig.asaasApiKey || '',
      asaas_webhook_secret: newConfig.asaasWebhookSecret || '',
      infinitepay_handle: newConfig.infinitepayHandle || 'repvendas',
      is_configured: Boolean(newConfig.asaasApiKey),
      last_tested_at: newConfig.lastTestedAt || null,
      last_test_status: newConfig.lastTestStatus || null,
      last_test_message: newConfig.lastTestMessage || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await (admin as any)
      .from('saas_gateway_configs')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      // Se a tabela não existir, podemos persistir em platform_settings ou retornar erro amigável
      return { success: false, error: `Falha ao salvar no banco: ${error.message}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro inesperado ao salvar configurações' };
  }
}

/**
 * Retorna uma instância do AsaasClient inicializada com a configuração vigente
 */
export async function getAsaasClientFromConfig(): Promise<AsaasClient> {
  const config = await getGatewayConfig();
  return new AsaasClient({
    apiKey: config.asaasApiKey,
    environment: config.environment,
    webhookSecret: config.asaasWebhookSecret,
  });
}
