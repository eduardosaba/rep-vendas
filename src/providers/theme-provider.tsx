'use client';

import * as React from 'react';

// Carrega `next-themes` dinamicamente no cliente para evitar dependências de chunk
// que podem falhar durante hot-reload ou builds incrementais.
export function ThemeProvider(props: any) {
  const { children, ...rest } = props;
  const [ThemeComp, setThemeComp] = React.useState<any>(null);

  React.useEffect(() => {
    let mounted = true;
    import('next-themes')
      .then((mod) => {
        if (mounted) setThemeComp(() => mod.ThemeProvider || mod.ThemeProvider);
      })
      .catch((err) => {
        console.error('Falha ao carregar next-themes dinamicamente', err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Enquanto o provider não estiver carregado, renderiza as children normalmente.
  if (!ThemeComp) return <>{children}</>;

  const Theme = ThemeComp;
  return (
    <Theme attribute="class" {...rest}>
      {children}
    </Theme>
  );
}
