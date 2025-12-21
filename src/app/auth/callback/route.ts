import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // O seu cliente server-side

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // Se houver um parâmetro "next", usamos para redirecionar depois (ex: /dashboard)
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const ensureSupabaseEnv = () => {
      if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ) {
        console.error(
          'Faltam variáveis de ambiente Supabase: NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY'
        );
        throw new Error(
          'Configuração inválida: verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY'
        );
      }
    };

    ensureSupabaseEnv();
    const supabase = await createClient();
    const { data: exchangeData, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      // Tenta obter o id do usuário da sessão criada
      const userId = exchangeData?.session?.user?.id;

      if (userId) {
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('role, onboarding_completed')
            .eq('id', userId)
            .maybeSingle();

          const onboardingCompleted = profileData?.onboarding_completed;
          const role = profileData?.role;

          // Se não completou o onboarding, vai para /onboarding
          if (!onboardingCompleted) {
            return NextResponse.redirect(`${origin}/onboarding`);
          }

          // Se for master e já completou onboarding, vai para /admin
          if (role === 'master') {
            return NextResponse.redirect(`${origin}/admin`);
          }

          // Caso padrão: dashboard
          return NextResponse.redirect(`${origin}/dashboard`);
        } catch (err) {
          console.error('Erro ao buscar perfil após OAuth:', err);
          // Em caso de falha, redireciona para dashboard como fallback
          return NextResponse.redirect(`${origin}/dashboard`);
        }
      }
    }
  }

  // Se der erro, volta para o login com mensagem
  return NextResponse.redirect(
    `${origin}/login?message=Erro ao autenticar com Google`
  );
}
