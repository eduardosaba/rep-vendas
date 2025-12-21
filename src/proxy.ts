import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 🚨 REGRA DE LIBERAÇÃO:
  // Se o link for do catálogo, deixa passar direto!
  // Retorna next() imediatamente e nem roda a verificação de sessão.
  if (path.startsWith('/catalogo')) {
    return NextResponse.next();
  }

  // Para todo o resto (Admin, Dashboard, etc), roda a verificação de login
  return await updateSession(request as any);
}

export const config = {
  matcher: [
    /*
     * Aplica essa regra em tudo, EXCETO arquivos estáticos e imagens
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
