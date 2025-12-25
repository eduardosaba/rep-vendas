import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteSupabase } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const headerCookie = request.headers.get('cookie');
    const nextCookies = await cookies();
    const all = nextCookies.getAll().map((c: any) => ({
      name: c.name,
      value: c.value,
      options: c.options ?? null,
    }));

    // Cria um client Supabase usando o cookie store desta request
    // Garantimos await para que o resultado seja sempre um SupabaseClient (não Promise)
    const supabase = await createRouteSupabase(() => nextCookies);

    // Pede ao Supabase a sessão e o usuário — mascaramos tokens sensíveis
    let sessionRes: any = null;
    let userRes: any = null;
    try {
      sessionRes = await supabase.auth.getSession();
    } catch (e) {
      sessionRes = { error: e };
    }
    try {
      userRes = await supabase.auth.getUser();
    } catch (e) {
      userRes = { error: e };
    }

    const sessionInfo = {
      hasSession: !!sessionRes?.data?.session,
      expires_at: sessionRes?.data?.session?.expires_at ?? null,
      accessTokenPresent: !!sessionRes?.data?.session?.access_token,
    };

    const userInfo = userRes?.data?.user
      ? { id: userRes.data.user.id, email: userRes.data.user.email }
      : null;

    return NextResponse.json({
      headerCookie,
      nextCookies: all,
      session: sessionInfo,
      sessionError: sessionRes?.error ?? null,
      user: userInfo,
      userError: userRes?.error ?? null,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
