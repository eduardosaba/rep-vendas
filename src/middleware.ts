import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. ROTA PÚBLICA: CATÁLOGO
  // Se for qualquer rota começando com /catalogo, libera imediatamente.
  if (path.startsWith('/catalogo')) {
    return NextResponse.next();
  }

  // 2. ROTAS PÚBLICAS DO NEXT/SUPABASE
  // É importante liberar rotas de auth callback se houver
  if (
    path.startsWith('/auth') ||
    path.startsWith('/login') ||
    path.startsWith('/register')
  ) {
    return await updateSession(request); // Ainda roda updateSession para gerenciar cookies, mas não bloqueia
  }

  // 3. TODO O RESTO (Dashboard, Admin)
  // Verifica sessão e protege
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Aplica em tudo EXCETO:
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagens)
     * - favicon.ico (ícones)
     * - extensões de imagem (svg, png, jpg, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
