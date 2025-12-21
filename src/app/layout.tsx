import type { Metadata } from 'next';
// import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/Toaster';
import { ThemeProvider } from '@/providers/theme-provider';
import ThemeRegistry from '@/components/ThemeRegistry';

// const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'RepVendas SaaS',
  description: 'Sistema de Catálogo e Pedidos',
  // REMOVIDO: icons: { ... }
  // O Next.js vai ler automaticamente o src/app/favicon.ico
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="antialiased bg-gray-50 dark:bg-slate-950 font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* ThemeRegistry carrega e aplica cores do banco de dados */}
          <ThemeRegistry />
          {children}
          {/* Nosso Toaster customizado com branding */}
          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
