import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: 'not_authenticated' }, { status: 401 });

    // get company_id from profile
    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).maybeSingle();
    const companyId = (profile as any)?.company_id;
    if (!companyId) return NextResponse.json({ success: false, error: 'no_company' }, { status: 400 });

    const { data, error } = await supabase.from('commissions').select(`*, profiles:profiles(id, full_name), orders:orders(id, display_id, total)`).eq('company_id', companyId).order('created_at', { ascending: false }).limit(200);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || String(e) }, { status: 500 });
  }
}
