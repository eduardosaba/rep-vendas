import { createRouteSupabase } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const nextCookies = await cookies();
    const supabase = await createRouteSupabase(() => nextCookies);

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { version } = body || {};
    if (!version) {
      return NextResponse.json(
        { error: 'version is required' },
        { status: 400 }
      );
    }

    // Upsert marca que o usuário viu essa versão
    const payload = { user_id: user.id, version };
    const { error } = await supabase
      .from('user_update_views')
      .upsert(payload, { onConflict: 'user_id,version' });

    if (error) {
      console.error('Erro ao maracar seen-update:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('seen-update exception', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
