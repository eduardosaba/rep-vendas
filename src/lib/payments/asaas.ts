/**
 * Cliente e Abstração Oficial do Gateway Asaas API v3
 * RepVendas — Motor de Assinaturas e Recorrência SaaS
 */

export type AsaasEnvironment = 'sandbox' | 'production';

export type AsaasBillingType = 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';

export type AsaasCycle =
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'SEMIANNUALLY'
  | 'YEARLY';

export interface AsaasCustomerInput {
  name: string;
  email: string;
  phone?: string | null;
  mobilePhone?: string | null;
  cpfCnpj?: string | null;
  postalCode?: string | null;
  address?: string | null;
  addressNumber?: string | null;
  externalReference?: string | null;
}

export interface AsaasSubscriptionInput {
  customer: string;
  billingType: AsaasBillingType;
  value: number;
  nextDueDate: string; // YYYY-MM-DD
  cycle: AsaasCycle;
  description?: string;
  externalReference?: string;
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo?: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    phone: string;
  };
}

export interface AsaasPaymentInput {
  customer: string;
  billingType: AsaasBillingType;
  value: number;
  dueDate: string; // YYYY-MM-DD
  description?: string;
  externalReference?: string;
}

export interface AsaasConfig {
  apiKey: string;
  environment: AsaasEnvironment;
  webhookSecret?: string;
}

export class AsaasClient {
  private apiKey: string;
  private environment: AsaasEnvironment;
  private baseUrl: string;

  constructor(config?: Partial<AsaasConfig>) {
    this.environment =
      config?.environment ||
      (process.env.ASAAS_ENVIRONMENT as AsaasEnvironment) ||
      'sandbox';

    this.apiKey =
      config?.apiKey ||
      process.env.ASAAS_API_KEY ||
      '';

    this.baseUrl =
      this.environment === 'production'
        ? 'https://api.asaas.com/v3'
        : 'https://sandbox.asaas.com/api/v3';
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${cleanEndpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      access_token: this.apiKey,
      User_Agent: 'RepVendas-SaaS/1.0',
      ...(options.headers as Record<string, string> || {}),
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const text = await response.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }

      if (!response.ok) {
        const errorMsg =
          data?.errors?.[0]?.description ||
          data?.message ||
          `Erro Asaas HTTP ${response.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`;
        return { ok: false, status: response.status, error: errorMsg, data };
      }

      return { ok: true, status: response.status, data };
    } catch (err: any) {
      return {
        ok: false,
        status: 500,
        error: `Falha de conexão com Asaas: ${err?.message || 'Erro de rede'}`,
      };
    }
  }

  /**
   * Testa a conectividade com a API do Asaas usando a credencial informada
   */
  async testConnection(): Promise<{
    success: boolean;
    environment: AsaasEnvironment;
    status: number;
    message: string;
    details?: any;
  }> {
    if (!this.apiKey) {
      return {
        success: false,
        environment: this.environment,
        status: 400,
        message: 'Chave de API do Asaas não informada.',
      };
    }

    // Consulta simples de clientes com limit=1 para verificar credenciais
    const res = await this.request('/customers?limit=1', { method: 'GET' });

    if (res.ok) {
      return {
        success: true,
        environment: this.environment,
        status: res.status,
        message: `Conexão bem-sucedida com Asaas (${this.environment.toUpperCase()})!`,
        details: res.data,
      };
    }

    return {
      success: false,
      environment: this.environment,
      status: res.status,
      message: res.error || 'Falha ao autenticar com Asaas.',
      details: res.data,
    };
  }

  /**
   * Cria um cliente no Asaas
   */
  async createCustomer(input: AsaasCustomerInput) {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  /**
   * Localiza cliente por externalReference (ID do usuário no RepVendas)
   */
  async findCustomerByExternalReference(extRef: string) {
    return this.request(`/customers?externalReference=${encodeURIComponent(extRef)}`, {
      method: 'GET',
    });
  }

  /**
   * Localiza cliente por email
   */
  async findCustomerByEmail(email: string) {
    return this.request(`/customers?email=${encodeURIComponent(email)}`, {
      method: 'GET',
    });
  }

  /**
   * Localiza cliente existente ou cria um novo
   */
  async findOrCreateCustomer(input: AsaasCustomerInput) {
    // 1. Tentar por externalReference se houver
    if (input.externalReference) {
      const byRef = await this.findCustomerByExternalReference(input.externalReference);
      if (byRef.ok && byRef.data?.data?.length > 0) {
        return { ok: true, status: 200, data: byRef.data.data[0] };
      }
    }

    // 2. Tentar por email
    if (input.email) {
      const byEmail = await this.findCustomerByEmail(input.email);
      if (byEmail.ok && byEmail.data?.data?.length > 0) {
        return { ok: true, status: 200, data: byEmail.data.data[0] };
      }
    }

    // 3. Criar novo cliente
    return this.createCustomer(input);
  }

  /**
   * Cria uma assinatura recorrente no Asaas
   */
  async createSubscription(input: AsaasSubscriptionInput) {
    return this.request('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  /**
   * Consulta os dados de uma assinatura existente
   */
  async getSubscription(id: string) {
    return this.request(`/subscriptions/${id}`, { method: 'GET' });
  }

  /**
   * Cancela uma assinatura no Asaas
   */
  async cancelSubscription(id: string) {
    return this.request(`/subscriptions/${id}`, { method: 'DELETE' });
  }

  /**
   * Consulta as cobranças filhas de uma assinatura
   */
  async getSubscriptionPayments(subscriptionId: string) {
    return this.request(`/subscriptions/${subscriptionId}/payments`, {
      method: 'GET',
    });
  }

  /**
   * Cria uma cobrança avulsa
   */
  async createPayment(input: AsaasPaymentInput) {
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  /**
   * Consulta cobrança avulsa por ID
   */
  async getPayment(paymentId: string) {
    return this.request(`/payments/${paymentId}`, { method: 'GET' });
  }

  /**
   * Obtém QR Code Pix para uma cobrança
   */
  async getPaymentPixQrCode(paymentId: string) {
    return this.request(`/payments/${paymentId}/pixQrCode`, { method: 'GET' });
  }
}

/**
 * Mascara strings confidenciais como chaves de API e segredos de webhook
 * Exemplo: $aact_YTU5YTE...3a9f
 */
export function maskSecret(secret?: string | null, visibleChars = 4): string {
  if (!secret) return '';
  const trimmed = secret.trim();
  if (trimmed.length <= visibleChars * 2) {
    return '••••••••';
  }
  const start = trimmed.substring(0, Math.min(6, visibleChars + 2));
  const end = trimmed.substring(trimmed.length - visibleChars);
  return `${start}••••••••${end}`;
}
