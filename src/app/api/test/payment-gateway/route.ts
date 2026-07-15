/**
 * src/app/api/test/payment-gateway/route.ts
 *
 * Endpoint de teste para validar configuração de pagamento
 * Acesse: http://localhost:3000/api/test/payment-gateway
 *
 * Retorna:
 * - Status da configuração do gateway
 * - Dados do usuário autenticado
 * - Teste de conexão com Mercado Pago (se configurado)
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Validar autenticação
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Não autenticado',
          message: 'Por favor, faça login primeiro',
        },
        { status: 401 }
      );
    }

    // 2. Buscar gateway de pagamento
    const { data: gateway, error: gatewayError } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'mercadopago')
      .eq('is_active', true)
      .maybeSingle();

    if (gatewayError) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Database error',
          details: gatewayError.message,
        },
        { status: 500 }
      );
    }

    // 3. Se não tem gateway configurado
    if (!gateway) {
      return NextResponse.json({
        ok: true,
        configured: false,
        user: {
          id: user.id,
          email: user.email,
        },
        message: 'Nenhum gateway de pagamento configurado para este usuário',
        next_steps: [
          '1. Acesse /dashboard/settings/payment',
          '2. Clique em "Adicionar / Atualizar Credenciais"',
          '3. Cole seu Access Token do Mercado Pago',
          '4. Clique em "Salvar Credenciais"',
        ],
      });
    }

    // 4. Se tem gateway, validar com Mercado Pago
    let mpValidation = {
      status: 'unknown',
      message: 'Validation not attempted',
    };

    if (gateway?.api_key_encrypted && process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      try {
        // Testar conexão com API do MP
        const mpResponse = await fetch(
          'https://api.mercadopago.com/v1/users/me',
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${gateway.api_key_encrypted}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (mpResponse.ok) {
          const mpUser = await mpResponse.json();
          mpValidation = {
            status: 'valid',
            message: 'Token is valid and working ✅',
          };
        } else if (mpResponse.status === 401) {
          mpValidation = {
            status: 'invalid',
            message: 'Token is invalid or expired ❌',
          };
        } else {
          mpValidation = {
            status: 'error',
            message: `API returned status ${mpResponse.status}`,
          };
        }
      } catch (error: any) {
        mpValidation = {
          status: 'error',
          message: `Connection error: ${error.message}`,
        };
      }
    }

    // 5. Retornar status completo
    return NextResponse.json({
      ok: true,
      configured: true,
      user: {
        id: user.id,
        email: user.email,
      },
      gateway: {
        id: gateway.id,
        provider: gateway.provider,
        is_active: gateway.is_active,
        is_configured: gateway.is_configured,
        created_at: gateway.created_at,
        updated_at: gateway.updated_at,
        has_api_key: !!gateway.api_key_encrypted,
        has_webhook_secret: !!gateway.webhook_secret_encrypted,
      },
      mercado_pago_validation: mpValidation,
      checklist: {
        '✅ Gateway exists': true,
        '✅ Gateway is active': gateway.is_active,
        '✅ Gateway is configured': gateway.is_configured,
        [mpValidation.status === 'valid'
          ? '✅ Mercado Pago token is valid'
          : '❌ Mercado Pago token is invalid']: true,
      },
      next_steps: [
        mpValidation.status === 'valid'
          ? 'Token is valid! You can now accept payments ✅'
          : 'Please update your Mercado Pago token',
        'Configure webhook in Mercado Pago Dashboard',
        'Test a payment in your public catalog',
      ],
    });
  } catch (error: any) {
    console.error('[PaymentGatewayTest] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/test/payment-gateway
 *
 * Response Examples:
 *
 * 1. Not Authenticated:
 * {
 *   "ok": false,
 *   "error": "Não autenticado",
 *   "message": "Por favor, faça login primeiro"
 * }
 *
 * 2. Not Configured:
 * {
 *   "ok": true,
 *   "configured": false,
 *   "user": { "id": "user-123", "email": "user@example.com" },
 *   "message": "Nenhum gateway de pagamento configurado para este usuário",
 *   "next_steps": [...]
 * }
 *
 * 3. Configured & Valid:
 * {
 *   "ok": true,
 *   "configured": true,
 *   "user": { "id": "user-123", "email": "user@example.com" },
 *   "gateway": {
 *     "id": "gateway-123",
 *     "provider": "mercadopago",
 *     "is_active": true,
 *     "is_configured": true,
 *     "has_api_key": true,
 *     "has_webhook_secret": false
 *   },
 *   "mercado_pago_validation": {
 *     "status": "valid",
 *     "message": "Token is valid and working ✅"
 *   },
 *   "checklist": {
 *     "✅ Gateway exists": true,
 *     "✅ Gateway is active": true,
 *     "✅ Gateway is configured": true,
 *     "✅ Mercado Pago token is valid": true
 *   }
 * }
 */
