import { NetworkStatusIndicator } from '@/components/NetworkStatusIndicator';
import ThemeRegistry from '@/components/ThemeRegistry';
import { Toaster } from '@/components/ui/Toaster';
import PresenceProvider from '@/lib/presence';
import { ThemeProvider } from '@/providers/theme-provider';
import '@/styles/premium-menu.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

// Configure Inter font to be served locally by Next.js
const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '700', '900'],
  display: 'swap',
  variable: '--font-inter',
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://repvendas.com.br';

export const metadata: Metadata = {
  title: {
    default: 'RepVendas | Catálogo Digital B2B e Gestão de Pedidos',
    template: '%s | RepVendas',
  },
  description:
    'Plataforma completa para representantes comerciais e distribuidoras. Crie catálogos digitais interativos, compartilhe com seus clientes e receba pedidos organizados via WhatsApp.',
  keywords: [
    'catálogo digital',
    'catálogo virtual',
    'pedidos whatsapp',
    'representante comercial',
    'distribuidora b2b',
    'vendas b2b',
    'força de vendas',
    'tabela de preços digital',
  ],
  authors: [{ name: 'RepVendas', url: APP_URL }],
  creator: 'RepVendas',
  publisher: 'RepVendas',
  metadataBase: new URL(APP_URL),
  alternates: {
    canonical: './',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: 'RepVendas | Catálogo Digital B2B e Gestão de Pedidos',
    description:
      'Crie catálogos digitais profissionais, compartilhe produtos e receba pedidos organizados.',
    url: APP_URL,
    siteName: 'RepVendas',
    type: 'website',
    locale: 'pt_BR',
    images: [
      {
        url: `${APP_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'RepVendas - Catálogo Digital B2B e Gestão de Pedidos',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RepVendas | Catálogo Digital B2B e Gestão de Pedidos',
    description:
      'Crie catálogos digitais profissionais, compartilhe produtos e receba pedidos organizados.',
    images: [`${APP_URL}/og-image.png`],
  },
  icons: {
    icon: '/favicon.svg',
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
      <body
        className={`${inter.className} antialiased bg-gray-50 dark:bg-slate-950`}
      >
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
