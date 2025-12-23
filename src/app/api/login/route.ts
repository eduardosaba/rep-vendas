import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
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
        // Força leitura da sessão para acionar o adapter de cookies do Supabase
        try {
          const sessionCheck = await supabase.auth.getSession();
          console.log(
            '[api/login] getSession result',
            JSON.stringify({ hasSession: !!sessionCheck?.data?.session })
          );
        } catch (e) {
          console.warn('[api/login] getSession failed', e);
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle();

        const role = profileData?.role;
        const redirect = role === 'master' ? '/admin' : '/dashboard';

        // Garante que quaisquer cookies gravados pelo adapter do Supabase
        // sejam copiados para a resposta que vamos retornar ao cliente.
        const nextCookies = await cookies();
        const res = NextResponse.json({
          type: 'success',
          text: 'Autenticado com sucesso',
          redirect,
        });

        try {
          nextCookies.getAll().forEach((c: any) => {
            // c pode conter name, value e options
            if (c.options) res.cookies.set(c.name, c.value, c.options);
            else res.cookies.set(c.name, c.value);
          });
        } catch (e) {
          // se algo falhar ao copiar cookies, continuamos sem bloquear o fluxo
          console.warn('[api/login] failed to copy cookies to response', e);
        }

        return res;
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
