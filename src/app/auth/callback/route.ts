import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // O seu cliente server-side

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // Se houver um parâmetro "next", usamos para redirecionar depois (ex: /dashboard)
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
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
