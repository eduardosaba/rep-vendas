import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { commissionId } = body;
    if (!commissionId) return NextResponse.json({ success: false, error: 'commissionId required' }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: 'not_authenticated' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('role, company_id').eq('id', user.id).maybeSingle();
    const role = (profile as any)?.role;
    if (!['admin_company', 'master'].includes(role)) return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 });

    const now = new Date().toISOString();
    const { error } = await supabase.from('commissions').update({ status: 'paid', paid_at: now }).eq('id', commissionId);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || String(e) }, { status: 500 });
  }
}
