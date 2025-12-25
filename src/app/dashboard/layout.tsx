import type { Metadata } from 'next';
import '../globals.css';
import { Toaster } from '@/components/ui/Toaster';
import { ThemeProvider } from '@/providers/theme-provider';
import ThemeRegistry from '@/components/ThemeRegistry';
import { Suspense } from 'react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="antialiased bg-white font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          forcedTheme="light"
        >
          {/* O ThemeRegistry deve ser leve. Se ele busca dados do banco, use Suspense */}
          <Suspense fallback={<div className="h-screen w-screen bg-white" />}>
            <ThemeRegistry />
          </Suspense>

          <main className="min-h-screen">{children}</main>

          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
