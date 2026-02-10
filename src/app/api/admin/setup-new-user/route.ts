import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

type Body = {
  sourceUserId?: string;
  targetUserId: string;
  brands: string[];
};

export async function POST(req: Request) {
  try {
    const body: Body = await req.json();

    if (!body?.targetUserId || !Array.isArray(body.brands)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server not configured' },
        { status: 500 }
      );
    }

    const supabase = createServiceClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    // Validate caller token and role
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token)
      return NextResponse.json({ error: 'Missing auth' }, { status: 401 });

    const { data: userResp, error: userErr } = await supabase.auth.getUser(
      token as any
    );
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

    // Call RPC to clone catalog by brand (Postgres function must exist)
    const sourceId = body.sourceUserId || user.id;

    // Optional: ensure source exists
    const { data: srcUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', sourceId)
      .maybeSingle();
    if (!srcUser) {
      return NextResponse.json(
        { error: 'Source user not found' },
        { status: 400 }
      );
    }

    // Try calling the RPC. Newer DB migrations use parameter names prefixed with 'p_'.
    // Attempt with the common names first, then retry with prefixed params if needed.
    let rpcResult: any = null;
    let rpcError: any = null;

    const tryRpc = async (params: Record<string, any>) => {
      try {
        const r = await supabase.rpc('clone_catalog_smart', params as any);
        return r;
      } catch (e) {
        return { data: null, error: e };
      }
    };

    // First attempt (legacy/common param names)
    ({ data: rpcResult, error: rpcError } = await tryRpc({
      source_user_id: sourceId,
      target_user_id: body.targetUserId,
      brands_to_copy: body.brands,
    }));

    // If error mentions ambiguous or parameter not found, retry with p_ prefixed names
    if (rpcError && /source_user_id|ambiguous|parameter/i.test(String(rpcError?.message || rpcError))) {
      ({ data: rpcResult, error: rpcError } = await tryRpc({
        p_source_user_id: sourceId,
        p_target_user_id: body.targetUserId,
        p_brands_to_copy: body.brands,
      }));
    }

    if (rpcError) throw rpcError;
    const data = rpcResult;

    try {
      const cookieStore = await cookies();
      const impersonateCookieName =
        process.env.IMPERSONATE_COOKIE_NAME || 'impersonate_user_id';
      const impersonatedId =
        cookieStore.get(impersonateCookieName)?.value || null;
      await supabase.from('activity_logs').insert({
        user_id: impersonatedId || user.id,
        impersonator_id: impersonatedId ? user.id : null,
        action_type: 'CLONE',
        description: `Clonagem executada: ${body.brands.join(', ')} de ${sourceId} para ${body.targetUserId}`,
        metadata: {
          source_user_id: sourceId,
          target_user_id: body.targetUserId,
          brands: body.brands,
          result: data,
        },
      });
    } catch (logErr) {
      console.warn('Failed to write activity log for setup-new-user', logErr);
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('setup-new-user error', err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
