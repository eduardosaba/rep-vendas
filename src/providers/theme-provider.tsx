'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

// Usamos React.ComponentProps para extrair a tipagem automaticamente do componente
// Isso evita erros se a biblioteca mudar o nome da interface no futuro
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider attribute="class" {...props}>
      {children}
    </NextThemesProvider>
  );
}
