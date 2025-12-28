import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/Toaster';
import { ThemeProvider } from '@/providers/theme-provider';
import ThemeRegistry from '@/components/ThemeRegistry';
import { NetworkStatusIndicator } from '@/components/NetworkStatusIndicator';
import PresenceProvider from '@/lib/presence';

export const metadata: Metadata = {
  title: 'RepVendas SaaS',
  description: 'Sistema de Catálogo e Pedidos',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/icon-192.png',
    apple: '/apple.webp',
  },
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
          defaultTheme="light" // Inicia como claro
          enableSystem={false} // Ignora a preferência do sistema operacional
        >
          {/* O ThemeRegistry aplicará as cores específicas do dono do catálogo */}
          <ThemeRegistry />
          <PresenceProvider>{children}</PresenceProvider>
          <Toaster position="top-right" />
          <NetworkStatusIndicator />
        </ThemeProvider>
      </body>
    </html>
  );
}
