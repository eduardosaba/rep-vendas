import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    // Tentamos ler a tabela `global_configs` se existir
    const { data, error } = await supabase
      .from('global_configs')
      .select(
        'font_family, font_url, allow_custom_fonts, plan_feature_matrix, allow_trial_unlock, allow_trial_checkout, allow_test_bypass'
      )
      .maybeSingle();

    if (error) {
      console.warn('global_config read error:', error.message || error);
    }

    const payload = {
      font_family: data?.font_family ?? null,
      font_url: data?.font_url ?? null,
      allow_custom_fonts:
        typeof data?.allow_custom_fonts === 'boolean'
          ? data.allow_custom_fonts
          : true,
      plan_feature_matrix: data?.plan_feature_matrix ?? null,
      allow_trial_unlock: !!data?.allow_trial_unlock,
      allow_trial_checkout: !!data?.allow_trial_checkout,
      allow_test_bypass: !!data?.allow_test_bypass,
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error('Error in /api/global_config:', err);
    return NextResponse.json({ font_family: null, allow_custom_fonts: true });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = await createClient();

    // Authorization: only allow users with role 'master' to modify global configs
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json(
          { ok: false, error: 'unauthenticated' },
          { status: 401 }
        );
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (!profile || profile.role !== 'master') {
        return NextResponse.json(
          { ok: false, error: 'forbidden' },
          { status: 403 }
        );
      }
    } catch (authErr) {
      console.error('global_config auth check failed', authErr);
      return NextResponse.json(
        { ok: false, error: 'auth_error' },
        { status: 500 }
      );
    }

    // Normalize fields we accept
    const payload: any = {};
    if (typeof body.allow_custom_fonts === 'boolean')
      payload.allow_custom_fonts = body.allow_custom_fonts;
    if (typeof body.font_family === 'string')
      payload.font_family = body.font_family;
    if (typeof body.font_url === 'string') payload.font_url = body.font_url;

    if (
      body.plan_feature_matrix &&
      typeof body.plan_feature_matrix === 'object'
    ) {
      payload.plan_feature_matrix = body.plan_feature_matrix;
    }

    // Control tower flags
    if (typeof body.allow_trial_unlock === 'boolean')
      payload.allow_trial_unlock = body.allow_trial_unlock;
    if (typeof body.allow_trial_checkout === 'boolean')
      payload.allow_trial_checkout = body.allow_trial_checkout;
    if (typeof body.allow_test_bypass === 'boolean')
      payload.allow_test_bypass = body.allow_test_bypass;

    // Upsert into global_configs
    const { error } = await supabase
      .from('global_configs')
      .upsert(payload, { onConflict: 'id' });
    if (error) {
      console.error('global_config upsert error', error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error in POST /api/global_config:', err);
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 });
  }
}
