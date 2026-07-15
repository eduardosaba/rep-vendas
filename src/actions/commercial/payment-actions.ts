'use server';

import { deserializeAndDecrypt } from '@/lib/encryption';
import { createClient } from '@/lib/supabase/server'; // Escopo com RLS do usuário logado
import { createClient as createAdminClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Instância administrativa para interrogar gateways e injetar o ledger inicial bypassando RLS
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CreatePreferenceInput {
  orderId: string;
  companyId: string;
}

export async function createMercadoPagoPreference({
  orderId,
  companyId,
}: CreatePreferenceInput) {
  try {
    const supabase = await createClient();

    // 1. SEGURANÇA: Autenticação e validação estrita de Tenant (Anti-Spoofing)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Sessão inválida ou expirada.');

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.company_id !== companyId) {
      throw new Error(
        'Acesso negado. Violação de barreira Multi-Tenant detectada.'
      );
    }

    // 2. MÁQUINA DE ESTADOS: Validação de elegibilidade do pedido local
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, total_value, payment_reference')
      .eq('id', orderId)
      .eq('company_id', companyId)
      .single();

    if (orderError || !order)
      throw new Error('Pedido não localizado no sistema.');

    // Aceita o estado 'pending' ou reaproveita um 'pending_payment' ainda não concluído
    if (!['pending', 'pending_payment'].includes(order.status)) {
      throw new Error(
        `Este pedido não pode receber pagamentos. Estado atual: ${order.status}`
      );
    }

    if (!order.total_value || order.total_value <= 0) {
      throw new Error(
        'Valor nominal do pedido inválido para transação comercial.'
      );
    }

    // 3. DEFESA DE CONCORRÊNCIA: Reaproveita preferência ativa se o cliente deu duplo clique
    const { data: existingTx } = await supabase
      .from('payment_transactions')
      .select('id, provider_preference_id, provider_preference_response')
      .eq('order_id', orderId)
      .eq('status', 'pending')
      .eq('is_active', true)
      .maybeSingle();

    if (
      existingTx?.provider_preference_id &&
      existingTx.provider_preference_response
    ) {
      const resp = existingTx.provider_preference_response as any;
      return {
        success: true,
        initPoint: resp.init_point,
        preferenceId: existingTx.provider_preference_id,
        reused: true,
      };
    }

    // 4. INFRAESTRUTURA: Recuperação e Descriptografia do Gateway da Ótica
    const { data: gateway, error: gatewayError } = await supabaseAdmin
      .from('payment_gateways')
      .select('id, provider, api_key_encrypted')
      .eq('company_id', companyId)
      .eq('provider', 'mercadopago')
      .eq('is_active', true)
      .single();

    if (gatewayError || !gateway?.api_key_encrypted) {
      throw new Error(
        'Módulo de checkout online Mercado Pago indisponível para esta ótica.'
      );
    }

    // Decodifica o Buffer único Base64 (IV + AuthTag + Ciphertext)
    const accessToken = deserializeAndDecrypt(gateway.api_key_encrypted);

    // 5. GATILHO EXTERNO: Handshake e Idempotência com o Mercado Pago usando Hash do ID do pedido
    const idempotencyKey = crypto
      .createHash('sha256')
      .update(orderId)
      .digest('hex');

    const mpClient = new MercadoPagoConfig({ accessToken });
    const preferenceClient = new Preference(mpClient);

    const preference = await preferenceClient.create({
      body: {
        items: [
          {
            id: orderId,
            title: `Pedido de Óptica #${orderId.slice(0, 8).toUpperCase()}`,
            quantity: 1,
            unit_price: order.total_value / 100, // Transforma centavos inteiros (banco) para decimal (API)
            currency_id: 'BRL',
          },
        ],
        external_reference: orderId,
        metadata: {
          company_id: companyId,
          order_id: orderId,
          source: 'repvendas',
          environment: process.env.NODE_ENV || 'production',
        },
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/payment-result?status=success`,
          failure: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/payment-result?status=failure`,
          pending: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/payment-result?status=pending`,
        },
        auto_return: 'approved',
      },
    });

    if (!preference.id || !preference.init_point) {
      throw new Error(
        'Falha crítica na comunicação com o provedor: init_point ausente.'
      );
    }

    // 6. REDUÇÃO DE DADOS: Guardamos apenas o sumário curado no banco (evita inchaço JSONB)
    const minimalResponse = {
      preference_id: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
      created_at: new Date().toISOString(),
    };

    // 7. TRANSAÇÃO ATÔMICA: Executa a RPC no PostgreSQL (Garantia de consistência sem rollback manual)
    const { data: rpcSuccess, error: rpcError } = await supabaseAdmin.rpc(
      'confirm_payment_preference',
      {
        p_order_id: orderId,
        p_company_id: companyId,
        p_gateway_id: gateway.id,
        p_provider: gateway.provider,
        p_preference_id: preference.id,
        p_amount_cents: order.total_value,
        p_idempotency_key: idempotencyKey,
        p_minimal_response: minimalResponse,
      }
    );

    if (rpcError || !rpcSuccess) {
      throw new Error(
        rpcError?.message ||
          'Falha ao consolidar transação e linkar chaves de redundância no banco.'
      );
    }

    return {
      success: true,
      initPoint: preference.init_point,
      preferenceId: preference.id,
      reused: false,
    };
  } catch (error: any) {
    console.error(`[Fintech Core Action Exception]: ${error.message}`);
    return {
      success: false,
      error: error.message || 'Erro inesperado ao instanciar o checkout.',
    };
  }
}
