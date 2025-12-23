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
        // Se o adapter não escreveu cookies, gravamos manualmente os tokens
        const res = NextResponse.json({
          type: 'success',
          text: 'Autenticado com sucesso',
          redirect,
        });

        try {
          const session = (data as any).session;
          if (session) {
            const accessToken = session.access_token;
            const refreshToken = session.refresh_token;
            const expiresIn = session.expires_in ?? null;

            const secure = process.env.NODE_ENV === 'production';
            const cookieOptions: any = {
              httpOnly: true,
              path: '/',
              sameSite: 'lax',
              secure,
            };

            if (typeof expiresIn === 'number') {
              cookieOptions.maxAge = Number(expiresIn);
              cookieOptions.expires = new Date(Date.now() + expiresIn * 1000);
            }

            if (accessToken) {
              res.cookies.set('sb-access-token', accessToken, cookieOptions);
              console.log('[api/login] set sb-access-token cookie');
            }
            if (refreshToken) {
              // refresh token usually long lived
              const refreshOpts = { ...cookieOptions, maxAge: cookieOptions.maxAge ? cookieOptions.maxAge * 24 : undefined };
              res.cookies.set('sb-refresh-token', refreshToken, refreshOpts);
              console.log('[api/login] set sb-refresh-token cookie');
            }
          }
        } catch (e) {
          console.warn('[api/login] manual cookie set failed', e);
        }

        // também tentamos copiar qualquer cookie do cookie store (fallback)
        try {
          const nextCookies = await cookies();
          nextCookies.getAll().forEach((c: any) => {
            if (c.options) res.cookies.set(c.name, c.value, c.options);
            else res.cookies.set(c.name, c.value);
          });
        } catch (e) {
          console.warn('[api/login] failed to copy cookie store to response', e);
        }

        return res;
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
