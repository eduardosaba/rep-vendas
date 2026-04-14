import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
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

    let userId: string | null = null;
    if (token) {
      const { data: userResp } = await supabase.auth.getUser(token as any);
      userId = userResp?.user?.id || null;
    } else {
      // Fallback: allow same-origin cookie session (client fetch without bearer)
      const cookieClient = await createClient();
      const {
        data: { user },
      } = await cookieClient.auth.getUser();
      userId = user?.id || null;
    }

    if (!userId)
      return NextResponse.json({ error: 'Missing auth' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    const role = profile?.role || null;
    if (role !== 'master' && role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabase.rpc('get_ecosystem_summary');
    if (error) throw error;

    // rpc returns array with single row
    const result = Array.isArray(data) ? data[0] || {} : data || {};

    return NextResponse.json({ data: result });
  } catch (err: any) {
    console.error('ecosystem-summary error', err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
