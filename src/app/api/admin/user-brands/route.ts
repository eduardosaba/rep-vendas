import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    // auth check
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    // only admin/master allowed
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (!profile || !['admin', 'master'].includes(profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // use service client to bypass RLS
    const service = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data, error } = await service.from('products').select('brand').eq('user_id', userId).not('brand', 'is', null);
    if (error) throw error;

    const brands = Array.from(new Set((data || []).map((r: any) => r.brand).filter(Boolean)));
    return NextResponse.json({ brands });
  } catch (err: any) {
    console.error('user-brands error', err);
    return NextResponse.json({ error: err.message || 'Erro' }, { status: 500 });
  }
}
