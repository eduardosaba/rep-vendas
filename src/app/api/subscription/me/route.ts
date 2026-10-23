import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGatewayConfig } from '@/lib/payments/config';
import { resolveSubscriptionAccess } from '@/lib/auth/subscription-rules';
import { AVAILABLE_PLANS } from '@/app/dashboard/fatura/actions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuário não autenticado.' },
        { status: 401 }
      );
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
      getGatewayConfig().catch(() => ({
        isConfigured: false,
        activeProvider: 'asaas' as const,
      })),
    ]);

    const profile = profileRes.data || null;
    const subscription = subRes.data || null;
    const access = resolveSubscriptionAccess(profile, subscription);

    return NextResponse.json({
      success: true,
      profile,
      subscription,
      access,
      isGatewayConfigured: gatewayConfig.isConfigured,
      activeProvider: gatewayConfig.activeProvider,
      plans: AVAILABLE_PLANS,
    });
  } catch (err: any) {
    console.error('Erro em /api/subscription/me:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Erro ao carregar dados da assinatura.',
      },
      { status: 500 }
    );
  }
}
