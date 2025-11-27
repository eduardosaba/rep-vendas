import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  // Apenas delega para a função utilitária que lida com os cookies do Supabase
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Corresponde a todos os caminhos de requisição exceto:
     * 1. /_next/static (arquivos estáticos)
     * 2. /_next/image (arquivos de otimização de imagem)
     * 3. /favicon.ico (ícone do navegador)
     * 4. Imagens e arquivos estáticos públicos
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
