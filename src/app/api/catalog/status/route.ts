import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

function getAdminSupabase() {
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!svc || !url) return null;
  return createSupabaseClient(String(url), String(svc));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = body?.userId;
    if (!userId) return NextResponse.json({ ok: false, error: 'Missing userId' }, { status: 400 });

    const admin = getAdminSupabase();
    if (!admin) return NextResponse.json({ ok: false, error: 'Service role not configured' }, { status: 500 });

    const { data: profile } = await admin.from('profiles').select('status, trial_ends_at').eq('id', userId).maybeSingle();

    const status = (profile as any)?.status || null;
    const trialEnds = (profile as any)?.trial_ends_at ? new Date((profile as any).trial_ends_at) : null;
    const now = new Date();
    const isTrialExpired = trialEnds ? now > trialEnds : false;

    const blocked = status === 'blocked' || (status === 'trial' && isTrialExpired);

    return NextResponse.json({ ok: true, blocked, status, trial_ends_at: profile?.trial_ends_at || null });
  } catch (e) {
    console.error('catalog/status error', e);
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 });
  }
}
