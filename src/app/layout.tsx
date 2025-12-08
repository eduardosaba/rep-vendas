import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // Seus estilos globais
// 1. Importar o componente Toaster que criamos
import { Toaster } from '@/components/ui/Toaster';
import {
  checkSupabaseEnv,
  checkSupabaseReachability,
  checkSupabaseAuth,
} from '@/lib/env';

// Checagem rápida de variáveis de ambiente durante o render inicial do layout
// Isso garante que, ao iniciar o servidor de desenvolvimento, mensagens
// claras aparecem no console caso faltem variáveis críticas.
checkSupabaseEnv();

// Fire-and-forget: testa reachability da URL do Supabase (HEAD com timeout)
// Não await para não bloquear o render do layout; é somente para logar avisos.
/* eslint-disable-next-line @typescript-eslint/no-floating-promises */
checkSupabaseReachability(3000);
/* eslint-disable-next-line @typescript-eslint/no-floating-promises */
checkSupabaseAuth(3000);

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'RepVendas - Sistema de Vendas',
  description:
    'Plataforma para representantes comerciais e catálogos digitais.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        {/* O conteúdo das páginas é renderizado aqui */}
        {children}

        {/* 2. O Toaster deve ficar aqui, fora do fluxo principal, 
            mas dentro do body para poder sobrepor o conteúdo */}
        <Toaster />
      </body>
    </html>
  );
}
