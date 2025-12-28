import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    // 1. Tenta ler o corpo como JSON
    const body = await req.json();
    const { email, password } = body;

    // Log para você ver no terminal se os dados chegaram
    console.log('Tentativa de login para:', email);

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Por favor, preencha e-mail e senha.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 2. Autenticação
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: 'E-mail ou senha incorretos' },
        { status: 401 }
      );
    }

    // 3. Redirecionamento baseado no perfil
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle();

    const redirectTo = profile?.role === 'master' ? '/admin' : '/dashboard';

    return NextResponse.json({ success: true, redirectTo });
  } catch (err: any) {
    console.error('ERRO INTERNO NO LOGIN:', err.message);
    return NextResponse.json(
      { error: 'Erro ao processar login' },
      { status: 500 }
    );
  }
}
