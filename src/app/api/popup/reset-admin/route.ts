import { NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const popupId = body?.popupId || body?.popup_id;
    if (!popupId)
      return NextResponse.json({ success: false, error: 'popupId required' }, { status: 400 });

    const supabase = await createRouteSupabase();
    const { data: userData } = await supabase.auth.getUser();
    const user = (userData || {}).user;
    if (!user) return NextResponse.json({ success: false, error: 'not_authenticated' }, { status: 401 });

    // Validação: somente usuários com role 'master' podem executar este reset
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileErr) {
      console.error('profile lookup error', profileErr);
      return NextResponse.json({ success: false, error: 'Erro ao verificar perfil' }, { status: 500 });
    }

    if (profile?.role !== 'master') {
      return NextResponse.json({ success: false, error: 'Acesso negado: requer role master' }, { status: 403 });
    }

    // Executa o delete apenas para o popup solicitado
    const { error } = await supabase.from('popup_logs').delete().eq('popup_id', String(popupId));
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('popup reset-admin error', e);
    return NextResponse.json({ success: false, error: String(e?.message || e) }, { status: 500 });
  }
}
