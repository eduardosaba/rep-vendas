import type { Metadata } from 'next';
import '../globals.css';
import { Toaster } from '@/components/ui/Toaster';
import { ThemeProvider } from '@/providers/theme-provider';
import ThemeRegistry from '@/components/ThemeRegistry';
import { Suspense } from 'react';
import Sidebar from '@/components/Sidebar';

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

          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1">{children}</main>
          </div>

          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
