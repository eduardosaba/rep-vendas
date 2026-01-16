import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

type Body = {
  userId: string;
  canBeSource?: boolean;
  userCategory?: string;
};

export async function POST(req: Request) {
  try {
    const body: Body = await req.json();
    if (!body?.userId) {
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

    const updates: any = {};
    if (typeof body.canBeSource === 'boolean')
      updates.can_be_clone_source = body.canBeSource;
    if (typeof body.userCategory === 'string')
      updates.user_category = body.userCategory;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', body.userId)
      .select()
      .maybeSingle();
    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('set-clone-source error', err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
