import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('company_id,organization_id').eq('id', userId).maybeSingle();
    let companyId = (profile as any)?.company_id || (profile as any)?.organization_id;
    if (!companyId) {
      const { data: comp } = await supabase
        .from('companies')
        .select('id')
        .or(`owner_user_id.eq.${userId},user_id.eq.${userId}`)
        .maybeSingle();
      companyId = comp?.id;
    }
    if (!companyId) return NextResponse.json({ success: false, error: 'Usuário não vinculado a uma empresa' }, { status: 403 });

    const { data, error } = await supabase.from('company_gallery').select('*').eq('company_id', companyId).order('order_index', { ascending: true }).limit(200);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}
