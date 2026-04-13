import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type GlobalConfigPayload = {
  font_family: string | null;
  font_url?: string | null;
  allow_custom_fonts: boolean;
  plan_feature_matrix: Record<string, any> | null;
  allow_trial_unlock: boolean;
  allow_trial_checkout: boolean;
  allow_test_bypass: boolean;
};

const DEFAULT_PAYLOAD: GlobalConfigPayload = {
  font_family: null,
  font_url: null,
  allow_custom_fonts: true,
  plan_feature_matrix: null,
  allow_trial_unlock: false,
  allow_trial_checkout: false,
  allow_test_bypass: false,
};

async function getGlobalConfigColumns(supabase: any): Promise<Set<string>> {
  try {
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'global_configs');

    if (error || !Array.isArray(data)) return new Set();
    return new Set(data.map((r: any) => String(r.column_name)));
  } catch {
    return new Set();
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const cols = await getGlobalConfigColumns(supabase);

    // Tabela ausente ou inacessível: retornamos defaults sem spam de erro.
    if (cols.size === 0) return NextResponse.json(DEFAULT_PAYLOAD);

    const selectCols = [
      'font_family',
      'font_url',
      'allow_custom_fonts',
      'allow_trial_unlock',
      'allow_trial_checkout',
      'allow_test_bypass',
    ];

    if (cols.has('plan_feature_matrix')) {
      selectCols.push('plan_feature_matrix');
    }

    const { data, error } = await supabase
      .from('global_configs')
      .select(selectCols.join(', '))
      .maybeSingle();

    if (error) {
      // Evita ruído quando a coluna não existe em bancos antigos.
      if (!String(error.message || '').includes('does not exist')) {
        console.warn('global_config read error:', error.message || error);
      }
    }

    const row: any = data || {};

    const payload = {
      font_family: row?.font_family ?? DEFAULT_PAYLOAD.font_family,
      font_url: row?.font_url ?? DEFAULT_PAYLOAD.font_url,
      allow_custom_fonts:
        typeof row?.allow_custom_fonts === 'boolean'
          ? row.allow_custom_fonts
          : DEFAULT_PAYLOAD.allow_custom_fonts,
      plan_feature_matrix: cols.has('plan_feature_matrix')
        ? row?.plan_feature_matrix ?? null
        : null,
      allow_trial_unlock: !!row?.allow_trial_unlock,
      allow_trial_checkout: !!row?.allow_trial_checkout,
      allow_test_bypass: !!row?.allow_test_bypass,
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
    const cols = await getGlobalConfigColumns(supabase);

    if (cols.size === 0) {
      return NextResponse.json({ ok: true, skipped: true });
    }

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
    if (cols.has('allow_custom_fonts') && typeof body.allow_custom_fonts === 'boolean')
      payload.allow_custom_fonts = body.allow_custom_fonts;
    if (cols.has('font_family') && typeof body.font_family === 'string')
      payload.font_family = body.font_family;
    if (cols.has('font_url') && typeof body.font_url === 'string') payload.font_url = body.font_url;

    if (
      cols.has('plan_feature_matrix') &&
      body.plan_feature_matrix &&
      typeof body.plan_feature_matrix === 'object'
    ) {
      payload.plan_feature_matrix = body.plan_feature_matrix;
    }

    // Control tower flags
    if (cols.has('allow_trial_unlock') && typeof body.allow_trial_unlock === 'boolean')
      payload.allow_trial_unlock = body.allow_trial_unlock;
    if (cols.has('allow_trial_checkout') && typeof body.allow_trial_checkout === 'boolean')
      payload.allow_trial_checkout = body.allow_trial_checkout;
    if (cols.has('allow_test_bypass') && typeof body.allow_test_bypass === 'boolean')
      payload.allow_test_bypass = body.allow_test_bypass;

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ ok: true, skipped: true });
    }

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
