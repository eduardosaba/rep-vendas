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

        // Construímos a resposta e, caso o adapter não tenha gravado cookies,
        // escrevemos manualmente os tokens retornados pela sessão.
        const res = NextResponse.json({
          type: 'success',
          text: 'Autenticado com sucesso',
          redirect,
        });

        // debug: registrar cookies que vamos definir no response
        const __debugCookies: Array<any> = [];

        try {
          const session = (data as any).session;
          if (session) {
            const accessToken = session.access_token;
            const refreshToken = session.refresh_token;
            const expiresIn = session.expires_in ?? null;

            const isProd = process.env.NODE_ENV === 'production';
            // TODO: REMOVE BEFORE DEPLOY - allows local testing without __Secure- cookie names
            const skipSecure = process.env.SKIP_SECURE_COOKIES === '1';
            const useSecure = isProd && !skipSecure;
            const cookieOptions: any = {
              httpOnly: true,
              path: '/',
              sameSite: 'lax',
              secure: useSecure,
            };

            if (isProd) {
              // domain-wide cookie for production
              cookieOptions.domain = '.repvendas.com.br';
            }

            if (typeof expiresIn === 'number') {
              cookieOptions.maxAge = Number(expiresIn);
              cookieOptions.expires = new Date(Date.now() + expiresIn * 1000);
            }

            const accessName = useSecure
              ? '__Secure-sb-access-token'
              : 'sb-access-token';
            const refreshName = useSecure
              ? '__Secure-sb-refresh-token'
              : 'sb-refresh-token';

            if (accessToken) {
              res.cookies.set(accessName, accessToken, cookieOptions);
              __debugCookies.push({
                name: accessName,
                value: accessToken,
                options: cookieOptions,
              });
              console.log('[api/login] set', accessName, 'cookie');
            }
            if (refreshToken) {
              const refreshOpts = { ...cookieOptions };
              res.cookies.set(refreshName, refreshToken, refreshOpts);
              __debugCookies.push({
                name: refreshName,
                value: refreshToken,
                options: refreshOpts,
              });
              console.log('[api/login] set', refreshName, 'cookie');
            }
          }
        } catch (e) {
          console.warn('[api/login] manual cookie set failed', e);
        }

        // fallback: copiar do cookie store se houver algo
        try {
          const nextCookies = await cookies();
          nextCookies.getAll().forEach((c: any) => {
            if (c.options) {
              res.cookies.set(c.name, c.value, c.options);
              __debugCookies.push({
                name: c.name,
                value: c.value,
                options: c.options,
              });
            } else {
              res.cookies.set(c.name, c.value);
              __debugCookies.push({
                name: c.name,
                value: c.value,
                options: null,
              });
            }
          });
        } catch (e) {
          console.warn(
            '[api/login] failed to copy cookie store to response',
            e
          );
        }

        try {
          console.log(
            '[api/login] response cookies:',
            JSON.stringify(__debugCookies)
          );
        } catch (e) {
          console.log(
            '[api/login] response cookies (stringify failed)',
            __debugCookies
          );
        }

        // debug: log all response headers (incl. set-cookie)
        try {
          const hdrs: Array<[string, string]> = Array.from(
            // @ts-ignore nextResponse headers
            (res.headers as any).entries()
          );
          console.log('[api/login] response headers:', JSON.stringify(hdrs));
        } catch (e) {
          console.log('[api/login] could not stringify response headers', e);
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
