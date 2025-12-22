import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
        const redirectResponse = NextResponse.redirect(
          `${origin}${targetPath}`
        );

        // Forçamos a leitura da sessão atual para garantir que os cookies existam
        await supabase.auth.getSession();

        // IMPORTANTE: Como criamos o cliente com cookies(), o Supabase já tentou
        // setar os cookies. No redirecionamento, precisamos garantir que eles viajem.
        // Se o seu middleware já faz isso, este é um reforço de segurança.
        return redirectResponse;
      } catch (err) {
        return NextResponse.redirect(`${origin}/dashboard`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?message=Erro ao autenticar`);
}
