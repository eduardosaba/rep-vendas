import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient(); //

    // Troca o código pela sessão. O 'setAll' no server.ts gravará os cookies.
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, onboarding_completed')
            .eq('id', user.id)
            .maybeSingle();

          // Lógica de redirecionamento baseada no perfil
          let targetPath = next;
          if (profile?.role === 'master') {
            targetPath = '/admin';
          } else if (!profile?.onboarding_completed) {
            targetPath = '/onboarding';
          }

          return NextResponse.redirect(`${origin}${targetPath}`);
        }
      } catch (err) {
        console.error('[auth/callback] erro ao processar perfil:', err);
      }
    }
  }

  // Retorno em caso de erro
  return NextResponse.redirect(`${origin}/login?message=Erro ao autenticar`);
}
