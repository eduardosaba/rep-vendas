'use client';
import * as React from 'react';
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // For Tailwind CSS dark mode via `class`, set attribute to "class".
  return (
    <NextThemesProvider attribute="class" {...props}>
      {children}
    </NextThemesProvider>
  );
}
