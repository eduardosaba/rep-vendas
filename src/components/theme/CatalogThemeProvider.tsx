'use client';

import React from 'react';

type CatalogThemeProviderProps = {
  cssVars: React.CSSProperties;
  fontFamily?: string | null;
  children: React.ReactNode;
};

export default function CatalogThemeProvider({
  cssVars,
  fontFamily,
  children,
}: CatalogThemeProviderProps) {
  return (
    <div
      style={{ ...cssVars, ...(fontFamily ? { fontFamily } : {}) }}
      className="min-h-screen bg-gray-50 flex flex-col selection:bg-primary/20 selection:text-primary"
    >
      {children}
    </div>
  );
}
