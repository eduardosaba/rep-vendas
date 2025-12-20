import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 🔓 CATÁLOGO PÚBLICO: Libera totalmente sem verificar sessão
  if (path.startsWith('/catalogo')) {
    return NextResponse.next({ request });
  }

  // Delegar toda a lógica de cookies/sessão para o helper centralizado
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
