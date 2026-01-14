import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

type Body = {
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
    const { data, error } = await supabase.rpc('clone_catalog_by_brand', {
      source_user_id: user.id,
      target_user_id: body.targetUserId,
      brands_to_copy: body.brands,
    });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('setup-new-user error', err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
