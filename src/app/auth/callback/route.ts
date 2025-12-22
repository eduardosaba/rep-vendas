import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { data: exchangeData, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    try {
      try {
        const cookieStore = await cookies();
        console.log(
          '[auth/callback] request.cookies=',
          JSON.stringify(cookieStore.getAll())
        );
      } catch (e) {
        console.log('[auth/callback] cookies logging failed');
      }
      console.log(
        '[auth/callback] exchangeError=',
        JSON.stringify(exchangeError || null)
      );
      console.log(
        '[auth/callback] exchangeData=',
        JSON.stringify(exchangeData || null)
      );
    } catch (e) {
      console.log('[auth/callback] logging failed');
    }

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

        // Redirecionamento baseado no perfil
        let targetPath = '/dashboard';
        if (!onboardingCompleted) targetPath = '/onboarding';
        else if (role === 'master') targetPath = '/admin';

        return NextResponse.redirect(`${origin}${targetPath}`);
      } catch (err) {
        return NextResponse.redirect(`${origin}/dashboard`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?message=Erro ao autenticar`);
}
