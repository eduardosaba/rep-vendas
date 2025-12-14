'use client';
import { useCallback } from 'react';
import { useTheme as useNextTheme } from 'next-themes';

export function useTheme() {
  const { theme, setTheme, systemTheme } = useNextTheme();

  const toggle = useCallback(() => {
    const current =
      theme === 'dark' || (theme === 'system' && systemTheme === 'dark');
    setTheme(current ? 'light' : 'dark');
  }, [theme, systemTheme, setTheme]);

  return {
    theme,
    systemTheme,
    setTheme,
    toggleTheme: toggle,
  };
}

export default useTheme;
