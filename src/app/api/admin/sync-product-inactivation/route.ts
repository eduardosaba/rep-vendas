import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)
      return NextResponse.json(
        { error: 'Server not configured' },
        { status: 500 }
      );

    const supabase = createServiceClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token)
      return NextResponse.json({ error: 'Missing auth' }, { status: 401 });

    const { data: userResp } = await supabase.auth.getUser(token as any);
    const user = userResp?.user;
    if (!user)
      return NextResponse.json({ error: 'Invalid auth' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    const role = profile?.role || null;
    if (role !== 'master' && role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { templateProductId } = body || {};
    if (!templateProductId)
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    const { data, error } = await supabase.rpc('sync_product_inactivation', {
      p_template_product_id: templateProductId,
    });
    if (error) throw error;

    // data may be returned as array or scalar depending on function; normalize
    const affected =
      data && typeof data === 'object' && '0' in data ? data[0] : data;

    // Record activity log (best-effort)
    try {
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        action_type: 'PROPAGATE_INACTIVATION',
        description: `Propagated inactivation for template product ${templateProductId}`,
        metadata: { templateProductId, affected },
      });
    } catch (logErr) {
      console.warn(
        'Failed to write activity log for propagate inactivation',
        logErr
      );
    }

    return NextResponse.json({ ok: true, affected });
  } catch (err: any) {
    console.error('sync-product-inactivation error', err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
