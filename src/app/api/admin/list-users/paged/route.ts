import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const page = Number(url.searchParams.get('page') || '1');
    const limit = Number(url.searchParams.get('limit') || '25');
    const from = (Math.max(1, page) - 1) * limit;
    const to = from + limit - 1;

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

    const { data, error, count } = await supabase
      .from('profiles')
      .select(
        'id, full_name, email, created_at, can_be_clone_source, user_category',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    const meta = {
      totalCount: count || 0,
      page,
      limit,
      totalPages: count ? Math.max(1, Math.ceil(count / limit)) : 1,
    };

    return NextResponse.json({ data: data || [], meta });
  } catch (err: any) {
    console.error('list-users-paged error', err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
