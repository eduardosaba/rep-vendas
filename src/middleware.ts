import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// REMOVIDO: export const runtime = 'edge';

export async function middleware(request: NextRequest) {
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
