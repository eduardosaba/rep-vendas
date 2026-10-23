import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { resolveSubscriptionAccess } from '@/lib/auth/subscription-rules';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          ok: false,
          profile: null,
          subscription: null,
          access: {
            status: 'UNKNOWN',
            isAllowed: false,
            isBlocked: true,
            inGracePeriod: false,
            daysRemainingOrOverdue: 0,
            reason: 'Usuário não autenticado.',
            expiryDate: null,
          },
          error: 'unauthenticated',
        },
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        }
      );
    }

    const [profileRes, subRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, email, status, trial_ends_at, role, company_id, can_manage_catalog, is_active, created_at')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('subscriptions')
        .select('status, price, plan_name, current_period_end')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    if (profileRes.error) {
      return NextResponse.json(
        {
          ok: false,
          profile: null,
          subscription: null,
          access: null,
          error: profileRes.error.message,
        },
        {
          status: 500,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        }
      );
    }

    const profile = profileRes.data || null;
    const subscription = subRes.data || null;
    const access = resolveSubscriptionAccess(profile, subscription);

    return NextResponse.json(
      {
        ok: true,
        profile,
        subscription,
        access,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error: any) {
    console.error('[api/profile/status] error:', error);

    return NextResponse.json(
      {
        ok: false,
        profile: null,
        subscription: null,
        access: null,
        error: error?.message || 'internal',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  }
}
