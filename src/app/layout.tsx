import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/Toaster';
import { ThemeProvider } from '@/providers/theme-provider';
import ThemeRegistry from '@/components/ThemeRegistry';

export const metadata: Metadata = {
  title: 'RepVendas SaaS',
  description: 'Sistema de Catálogo e Pedidos',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="antialiased bg-white font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="light" // Inicia como claro
          enableSystem={false} // Ignora a preferência do sistema operacional
          forcedTheme="light" // Bloqueia qualquer tentativa de mudar para dark
        >
          {/* O ThemeRegistry aplicará as cores específicas do dono do catálogo */}
          <ThemeRegistry />
          {children}
          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
