import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();

    // Troca o código pela sessão
    const { data: exchangeData, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError && exchangeData?.session?.user) {
      const user = exchangeData.session.user;

      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role, onboarding_completed')
          .eq('id', user.id)
          .maybeSingle();

        const onboardingCompleted = profileData?.onboarding_completed;
        const role = profileData?.role;

        let targetPath = '/dashboard';
        if (!onboardingCompleted) targetPath = '/onboarding';
        else if (role === 'master') targetPath = '/admin';

        // --- CORREÇÃO PARA NEXT.JS 15 ---
        const redirectUrl = new URL(targetPath, request.url);
        const redirectResponse = NextResponse.redirect(redirectUrl);

        // Forçamos a leitura da sessão atual para garantir que o adapter de cookies execute
        await supabase.auth.getSession();

        // COPIA COOKIES: lê os cookies atuais (pode ter sido setado pelo client do supabase)
        try {
          const cookieStore = await cookies();
          cookieStore.getAll().forEach((c) => {
            // c: { name, value }
            redirectResponse.cookies.set(c.name, c.value);
          });
        } catch (e) {
          // se falhar, apenas prosseguimos com o redirect
          console.warn('[auth/callback] failed copying cookies to redirect', e);
        }

        return redirectResponse;
      } catch (err) {
        return NextResponse.redirect(`${origin}/dashboard`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?message=Erro ao autenticar`);
}
