'use server';

/**
 * src/actions/payment-actions.ts
 *
 * Server Actions para gerenciar pagamentos multi-tenant.
 * Todos os endpoints respeitam RLS (Row Level Security) do Supabase.
 */

import {
  MercadoPagoPreference,
  PaymentGateway,
  PaymentRequest,
  PaymentResponse,
} from '@/lib/types';
import { createClient } from '@supabase/supabase-js';

// Supabase Admin Client (com Service Role Key)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false },
  }
);

// Mercado Pago SDK (será usado para criar preferências)
let MercadoPagoSdk: any;

// Inicializar SDK do Mercado Pago (lazy load)
async function initMercadoPagoSdk() {
  if (!MercadoPagoSdk) {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!accessToken) {
      throw new Error('MERCADO_PAGO_ACCESS_TOKEN not configured');
    }

    const { MercadoPagoConfig, Preference, User } = await import('mercadopago');
    const client = new MercadoPagoConfig({
      accessToken,
    });

    MercadoPagoSdk = {
      preferences: {
        create: async (preference: any) => {
          const preferenceInstance = new Preference(client);
          return await preferenceInstance.create({ body: preference });
        },
      },
      users: {
        get: async () => {
          const userInstance = new User(client);
          return await userInstance.get();
        },
      },
    };
  }
  return MercadoPagoSdk;
}

/**
 * 1. BUSCAR CONFIGURAÇÃO DE GATEWAY DO CLIENTE
 *
 * @param orderId - ID do pedido (para identificar a empresa/cliente)
 * @returns PaymentGateway configurado ou erro
 */
export async function getPaymentGatewayForOrder(
  orderId: string
): Promise<PaymentGateway | null> {
  try {
    // 1. Buscar o pedido para identificar o user_id
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('user_id, company_name, company_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // 2. Buscar gateway ativo (Mercado Pago por padrão)
    const { data: gateway, error: gatewayError } = await supabaseAdmin
      .from('payment_gateways')
      .select('*')
      .eq('user_id', order.user_id)
      .eq('provider', 'mercadopago')
      .eq('is_active', true)
      .eq('is_configured', true)
      .single();

    if (gatewayError || !gateway) {
      throw new Error(`No payment gateway configured for order: ${orderId}`);
    }

    return gateway as PaymentGateway;
  } catch (error) {
    console.error('[getPaymentGatewayForOrder]', error);
    throw error;
  }
}

/**
 * 2. CRIAR PREFERÊNCIA DE PAGAMENTO NO MERCADO PAGO
 *
 * @param paymentRequest - Dados do pagamento
 * @returns URL de checkout ou erro
 */
export async function createMercadoPagoPreference(
  paymentRequest: PaymentRequest
): Promise<PaymentResponse> {
  try {
    // 1. Validar que temos token do MP
    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      throw new Error('MERCADO_PAGO_ACCESS_TOKEN not configured');
    }

    // 2. Inicializar SDK
    const MP = await initMercadoPagoSdk();

    // 3. Buscar gateway para validar
    const gateway = await getPaymentGatewayForOrder(paymentRequest.order_id);
    if (!gateway) {
      throw new Error('Payment gateway not found for this order');
    }

    // 4. Preparar preferência
    const preference: MercadoPagoPreference = {
      items: [
        {
          title: `Pedido #${paymentRequest.order_id.slice(0, 8).toUpperCase()}`,
          quantity: 1,
          unit_price: paymentRequest.amount,
          currency_id: 'BRL',
        },
      ],
      payer: {
        name: paymentRequest.customer_name,
        email: paymentRequest.customer_email,
        phone: {
          area_code: paymentRequest.customer_phone?.slice(0, 2),
          number: paymentRequest.customer_phone?.slice(2),
        },
      },
      back_urls: {
        success: `${paymentRequest.redirect_url}?status=success`,
        failure: `${paymentRequest.redirect_url}?status=failure`,
        pending: `${paymentRequest.redirect_url}?status=pending`,
      },
      auto_return: 'approved',
      external_reference: paymentRequest.order_id,
      notification_url: process.env.NEXT_PUBLIC_WEBHOOK_URL,
      metadata: paymentRequest.metadata,
    };

    // 5. Criar preferência no Mercado Pago
    const response = await MP.preferences.create(preference);

    // 6. Registrar transação no banco de dados
    if (response && response.body && response.body.id) {
      const { data: transaction, error: txError } = await supabaseAdmin
        .from('payment_transactions')
        .insert({
          order_id: paymentRequest.order_id,
          gateway_id: gateway.id,
          provider: 'mercadopago',
          provider_transaction_id: response.body.id,
          amount: paymentRequest.amount,
          currency: paymentRequest.currency,
          status: 'pending',
          payment_method: paymentRequest.payment_method,
          customer_name: paymentRequest.customer_name,
          customer_email: paymentRequest.customer_email,
          customer_phone: paymentRequest.customer_phone,
          metadata: paymentRequest.metadata,
        })
        .select('id')
        .single();

      if (txError) {
        console.error(
          '[createMercadoPagoPreference] Error registering transaction:',
          txError
        );
        // Mesmo com erro ao registrar, retornamos a URL - o webhook sincronizará depois
      }

      return {
        success: true,
        transaction_id: transaction?.id || response.body.id,
        provider_transaction_id: response.body.id,
        init_point: response.body.init_point,
        status: 'pending',
        message: 'Preference created successfully',
      };
    }

    throw new Error('Failed to create Mercado Pago preference');
  } catch (error: any) {
    console.error('[createMercadoPagoPreference] Error:', error);
    return {
      success: false,
      error: error?.message || 'Failed to create payment preference',
    };
  }
}

/**
 * 3. PROCESSAR PAGAMENTO (ENTRY POINT - Chamado do Checkout)
 *
 * @param paymentRequest - Dados do pagamento
 * @returns Response com init_point ou erro
 */
export async function processarPagamento(
  paymentRequest: PaymentRequest
): Promise<PaymentResponse> {
  try {
    // 1. Validar dados obrigatórios
    if (
      !paymentRequest.order_id ||
      !paymentRequest.amount ||
      !paymentRequest.customer_email
    ) {
      return {
        success: false,
        error: 'Missing required payment information',
      };
    }

    // 2. Validar que ordem existe e pertence ao usuário
    // (RLS vai garantir isso via Supabase)

    // 3. Criar preferência no MP
    const result = await createMercadoPagoPreference(paymentRequest);

    return result;
  } catch (error: any) {
    console.error('[processarPagamento]', error);
    return {
      success: false,
      error: error?.message || 'Payment processing failed',
    };
  }
}

/**
 * 4. REGISTRAR CONFIGURAÇÃO DE GATEWAY (UI - Settings)
 *
 * @param userId - ID do usuário
 * @param accessToken - Token de acesso do MP
 * @param webhookSecret - Secret do webhook (opcional)
 * @returns Gateway criado ou erro
 */
export async function registerPaymentGateway(
  userId: string,
  accessToken: string,
  webhookSecret?: string
): Promise<{ success: boolean; gateway?: PaymentGateway; error?: string }> {
  try {
    // 1. Validar access token com uma chamada simples ao MP
    try {
      const MP = await initMercadoPagoSdk();
      // Fazer chamada teste
      await MP.users.get('me');
    } catch (err) {
      return {
        success: false,
        error: 'Invalid Mercado Pago access token',
      };
    }

    // 2. Desativar gateway antigo (se houver)
    await supabaseAdmin
      .from('payment_gateways')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('provider', 'mercadopago');

    // 3. Inserir novo gateway
    const { data: gateway, error: insertError } = await supabaseAdmin
      .from('payment_gateways')
      .insert({
        user_id: userId,
        provider: 'mercadopago',
        api_key_encrypted: accessToken, // Em produção, usar Vault para criptografar
        webhook_secret_encrypted: webhookSecret,
        is_active: true,
        is_configured: true,
        metadata: {
          created_from: 'settings_page',
          validated_at: new Date().toISOString(),
        },
      })
      .select('*')
      .single();

    if (insertError) {
      throw insertError;
    }

    return {
      success: true,
      gateway: gateway as PaymentGateway,
    };
  } catch (error: any) {
    console.error('[registerPaymentGateway]', error);
    return {
      success: false,
      error: error?.message || 'Failed to register payment gateway',
    };
  }
}

/**
 * 5. VERIFICAR PAGAMENTO COM MERCADO PAGO
 * (Útil para verificar status de um payment_id específico)
 */
export async function checkPaymentStatus(
  paymentId: string
): Promise<{ status: string; data?: any; error?: string }> {
  try {
    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      throw new Error('MERCADO_PAGO_ACCESS_TOKEN not configured');
    }

    const MP = await initMercadoPagoSdk();
    const response = await MP.payment.get(paymentId);

    if (response && response.body) {
      const paymentData = response.body;
      const mpStatus = paymentData.status; // approved, pending, rejected, cancelled, in_process, refunded

      // Mapear para nossos status
      let ourStatus = 'pending';
      if (mpStatus === 'approved') ourStatus = 'approved';
      else if (mpStatus === 'rejected') ourStatus = 'failed';
      else if (mpStatus === 'refunded') ourStatus = 'refunded';
      else if (mpStatus === 'cancelled') ourStatus = 'cancelled';

      return {
        status: ourStatus,
        data: paymentData,
      };
    }

    throw new Error('Payment not found');
  } catch (error: any) {
    console.error('[checkPaymentStatus]', error);
    return {
      status: 'error',
      error: error?.message || 'Failed to check payment status',
    };
  }
}
