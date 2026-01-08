import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // Se houver um 'next' nos params, usamos para o redirecionamento, senão vamos para o dashboard
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    
    // 1. Troca o código temporário por uma sessão real de usuário
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user) {
      // 2. Opcional: Verificar o perfil para redirecionar Master vs Representante
      // Como é um login social, garantimos que o perfil exista
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();

      // Se for master, forçamos o redirecionamento para o admin
      const finalRedirect = profile?.role === 'master' ? '/admin' : next;

      return NextResponse.redirect(`${origin}${finalRedirect}`);
    }
  }

  // Em caso de erro, mandamos o usuário de volta para o login com uma mensagem
  return NextResponse.redirect(`${origin}/login?error=auth-code-error`);
}