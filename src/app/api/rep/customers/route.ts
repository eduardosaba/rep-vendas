import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get('q') || '';
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).maybeSingle();
    const cid = (profile as any)?.company_id;
    if (!cid) return NextResponse.json({ success: true, data: [] });

    let query = supabase.from('customers').select('id, name, document, phone, email').eq('company_id', cid).limit(20).order('name');
    if (q && q.trim().length > 0) {
      const t = q.trim();
      query = query.or(`name.ilike.%${t}%,document.ilike.%${t}%,phone.ilike.%${t}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ success: true, data: data || [] });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 });
  }
}
