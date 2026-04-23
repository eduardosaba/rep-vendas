import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', userId).maybeSingle();
    const companyId = (profile as any)?.company_id;
    if (!companyId) return NextResponse.json({ success: false, error: 'User not linked to company' }, { status: 403 });

    const { data, error } = await supabase.from('company_gallery').select('*').eq('company_id', companyId).order('order_index', { ascending: true }).limit(200);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}
