import { NextResponse } from 'next/server';
import createClient from '@/lib/supabaseServer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;
    if (!email || !password) {
      return NextResponse.json(
        { type: 'error', text: 'Email e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { type: 'error', text: error.message || 'Erro ao autenticar.' },
        { status: 401 }
      );
    }

    if (data?.user) {
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle();

        const role = profileData?.role;
        const redirect = role === 'master' ? '/admin' : '/dashboard';
        return NextResponse.json({
          type: 'success',
          text: 'Autenticado com sucesso',
          redirect,
        });
      } catch (err) {
        return NextResponse.json({
          type: 'success',
          text: 'Autenticado com sucesso',
          redirect: '/dashboard',
        });
      }
    }

    return NextResponse.json({
      type: 'success',
      text: 'Autenticado com sucesso',
      redirect: '/dashboard',
    });
  } catch (err) {
    return NextResponse.json(
      { type: 'error', text: (err as Error)?.message || 'Erro inesperado' },
      { status: 500 }
    );
  }
}
