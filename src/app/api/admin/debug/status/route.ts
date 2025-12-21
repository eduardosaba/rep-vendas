import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { url: url ?? null, key: key ?? null };
}

export async function GET() {
  try {
    const envs = getSupabaseAdmin();
    const resp: any = {
      envs: { has_url: !!envs.url, has_service_role: !!envs.key },
    };

    if (envs.url && envs.key) {
      try {
        const supabase = createClient(envs.url, envs.key);
        const { data, error } = await supabase
          .from('plans')
          .select('id')
          .limit(1);
        if (error) {
          resp.plans = { accessible: false, error: error.message };
        } else {
          resp.plans = {
            accessible: true,
            count: (data && (data as any).length) || 0,
          };
        }
      } catch (err: any) {
        resp.plans = { accessible: false, error: err?.message || String(err) };
      }
    } else {
      resp.plans = { accessible: false, error: 'missing_env' };
    }

    return NextResponse.json(resp);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
