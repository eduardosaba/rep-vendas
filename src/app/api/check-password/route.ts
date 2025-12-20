import { cookies } from 'next/headers';
import { createRouteSupabase } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { passwordAttempt, userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'ID do catálogo inválido.' },
        { status: 400 }
      );
    }

    const nextCookies = await cookies();
    const supabase = createRouteSupabase(() => nextCookies);

    // Resiliência: usar .maybeSingle() para não quebrar se não houver settings
    const { data: settings, error } = await supabase
      .from('settings')
      .select('catalog_price_password')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar settings:', error);
      return NextResponse.json(
        { success: false, message: 'Erro ao verificar configurações.' },
        { status: 500 }
      );
    }

    // Fallback para senha padrão se não houver configuração
    const correctPassword = settings?.catalog_price_password || '12345';

    if (passwordAttempt === correctPassword) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, message: 'Senha incorreta.' },
        { status: 401 }
      );
    }
  } catch (err) {
    console.error('Erro na API check-password:', err);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
