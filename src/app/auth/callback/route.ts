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
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Login com sucesso, redireciona para o dashboard
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Se der erro, volta para o login com mensagem
  return NextResponse.redirect(
    `${origin}/login?message=Erro ao autenticar com Google`
  );
}
