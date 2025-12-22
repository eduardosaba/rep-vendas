import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: any[]) {
          try {
            console.log(
              '[middleware] setAll cookiesToSet=',
              JSON.stringify(cookiesToSet)
            );
          } catch (e) {
            console.log(
              '[middleware] setAll cookiesToSet (unable to stringify)'
            );
          }

          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  try {
    console.log('[middleware] path=', path);
    console.log(
      '[middleware] request.cookies=',
      JSON.stringify(request.cookies.getAll())
    );
    console.log('[middleware] auth.getUser=', JSON.stringify(user || null));
  } catch (e) {
    console.log('[middleware] logging failed');
  }

  if (user && (path === '/login' || path === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (
    !user &&
    (path.startsWith('/dashboard') ||
      path.startsWith('/admin') ||
      path.startsWith('/onboarding'))
  ) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return supabaseResponse;
}
