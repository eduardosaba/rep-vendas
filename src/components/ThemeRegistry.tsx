'use client';

import { useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { createClient } from '@/lib/supabase/client';
import {
  applyThemeColors,
  applyDefaultTheme,
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SECONDARY_COLOR,
} from '@/lib/theme';
import { setupNotifications } from '@/lib/setupNotifications';
import { isNextRedirect } from '@/lib/isNextRedirect';

export default function ThemeRegistry() {
  const supabase = useMemo(() => createClient(), []);
  const pathname = usePathname();
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    // Aguarda o resolvedTheme do next-themes para evitar condições de corrida
    if (typeof resolvedTheme === 'undefined') {
      console.debug('[ThemeRegistry] aguardando resolvedTheme...');
      return;
    }

    const loadAndApplyTheme = async () => {
      try {
        // Detect public catalog path (ex: /v/slug)
        const pathParts = pathname?.split('/') || [];
        const isPublicCatalog = pathParts[1] === 'v';

        console.debug(
          '[ThemeRegistry] pathname=',
          pathname,
          'isPublicCatalog=',
          isPublicCatalog
        );

        // Prefer using next-themes API to set theme instead of touching classList
        if (isPublicCatalog) {
          try {
            // 0. Checa configurações globais da plataforma (system-wide)
            try {
              const { data: platform } = await supabase
                .from('platform_settings')
                .select('font_family, font_url')
                .eq('id', 1)
                .maybeSingle();

              if (platform && platform.font_family) {
                // inject @font-face if url provided
                try {
                  if (platform.font_url) {
                    const id = `rv-platform-font-${btoa(platform.font_family).replace(/=/g, '')}`;
                    if (!document.getElementById(id)) {
                      const style = document.createElement('style');
                      style.id = id;
                      style.innerHTML = `@font-face { font-family: '${platform.font_family}'; src: url('${platform.font_url}') format('woff2'); font-weight: 400 700; font-style: normal; font-display: swap; }`;
                      document.head.appendChild(style);
                    }
                  }
                  document.documentElement.style.setProperty(
                    '--rv-font',
                    platform.font_family
                  );
                } catch (e) {
                  console.debug(
                    '[ThemeRegistry] failed to apply platform font',
                    e
                  );
                }
                // If a platform font is set, treat it as highest priority for font only (do not return)
              }
            } catch (e) {
              console.debug(
                '[ThemeRegistry] could not load platform_settings',
                e
              );
            }

            const disableAuto =
              typeof window !== 'undefined' &&
              localStorage.getItem('rv_disable_auto_theme') === '1';

            console.debug(
              '[ThemeRegistry] current theme=',
              theme,
              'resolvedTheme=',
              resolvedTheme,
              'localStorage.theme=',
              typeof window !== 'undefined'
                ? localStorage.getItem('theme')
                : null,
              'disableAuto=',
              disableAuto
            );

            // Aguarda resolvedTheme para evitar alternância imediata durante reidratação.
            if (
              typeof resolvedTheme === 'undefined' ||
              resolvedTheme === null
            ) {
              console.debug(
                '[ThemeRegistry] resolvedTheme não está pronto — pulando lógica de forçar tema'
              );
            } else if (!disableAuto && resolvedTheme !== 'light') {
              console.debug(
                '[ThemeRegistry] forcing light theme for public catalog (resolved)'
              );
              setTheme('light'); // force light theme for public catalogs
            } else if (disableAuto) {
              console.debug(
                '[ThemeRegistry] auto-theme disabled by localStorage(rv_disable_auto_theme)'
              );
            }
          } catch (e) {
            // ignore if next-themes not ready
            console.debug('[ThemeRegistry] setTheme(light) failed', e);
          }
        }

        // 1. Verifica se há usuário logado (Contexto Dashboard/Admin)
        let user: any = null;
        try {
          const userPromise = supabase.auth.getUser();
          const timeout = new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('supabase.getUser timeout')),
              5000
            )
          );
          const res: any = await Promise.race([userPromise, timeout]);
          if (res && res.data && res.data.user) user = res.data.user;
        } catch (e) {
          console.debug('[ThemeRegistry] supabase.auth.getUser failed', e);
        }

        if (user) {
          const { data: settings } = await supabase
            .from('settings')
            .select(
              'primary_color, secondary_color, header_background_color, font_family, font_url'
            )
            .eq('user_id', user.id)
            .maybeSingle();

          if (settings) {
            console.debug(
              '[ThemeRegistry] applying theme from settings',
              settings
            );
            applyThemeColors({
              primary: settings.primary_color || DEFAULT_PRIMARY_COLOR,
              secondary: settings.secondary_color || DEFAULT_SECONDARY_COLOR,
              headerBg: settings.header_background_color,
            });

            // Apply global font if present
            if (settings.font_family) {
              try {
                // If a font_url is provided, inject @font-face once
                if (settings.font_url) {
                  const id = `rv-font-${btoa(settings.font_family).replace(/=/g, '')}`;
                  if (!document.getElementById(id)) {
                    const style = document.createElement('style');
                    style.id = id;
                    style.innerHTML = `@font-face { font-family: '${settings.font_family}'; src: url('${settings.font_url}') format('woff2'); font-weight: 400 700; font-style: normal; font-display: swap; }`;
                    document.head.appendChild(style);
                  }
                }
                document.documentElement.style.setProperty(
                  '--rv-font',
                  settings.font_family
                );
              } catch (e) {
                console.debug(
                  '[ThemeRegistry] failed to apply font from settings',
                  e
                );
              }
            }

            // Register service worker and configure push notifications for logged user
            try {
              if (typeof window !== 'undefined') {
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker
                    .register('/firebase-messaging-sw.js')
                    .then((reg) => console.debug('[SW] registered', reg.scope))
                    .catch((err) => console.debug('[SW] register failed', err));
                }
                try {
                  setupNotifications(user.id as string);
                } catch (e) {
                  console.debug('[ThemeRegistry] setupNotifications failed', e);
                }
              }
            } catch (e) {
              console.debug('[ThemeRegistry] notification setup error', e);
            }

            return;
          }
        }

        // 2. Visitante (Catálogo Virtual)
        const catalogSlug = pathParts[1] === 'v' ? pathParts[2] : null;

        if (catalogSlug) {
          const { data: publicCatalog } = await supabase
            .from('public_catalogs')
            .select(
              'primary_color, secondary_color, header_background_color, font_family, font_url'
            )
            .eq('catalog_slug', catalogSlug)
            .maybeSingle();

          if (publicCatalog) {
            console.debug(
              '[ThemeRegistry] applying theme from publicCatalog',
              publicCatalog
            );
            applyThemeColors({
              primary: publicCatalog.primary_color,
              secondary: publicCatalog.secondary_color,
              headerBg: publicCatalog.header_background_color,
            });

            if (publicCatalog.font_family) {
              try {
                if (publicCatalog.font_url) {
                  const id = `rv-font-${btoa(publicCatalog.font_family).replace(/=/g, '')}`;
                  if (!document.getElementById(id)) {
                    const style = document.createElement('style');
                    style.id = id;
                    style.innerHTML = `@font-face { font-family: '${publicCatalog.font_family}'; src: url('${publicCatalog.font_url}') format('woff2'); font-weight: 400 700; font-style: normal; font-display: swap; }`;
                    document.head.appendChild(style);
                  }
                }
                document.documentElement.style.setProperty(
                  '--rv-font',
                  publicCatalog.font_family
                );
              } catch (e) {
                console.debug(
                  '[ThemeRegistry] failed to apply font from publicCatalog',
                  e
                );
              }
            }

            return;
          }
        }

        // 3. Fallback
        console.debug('[ThemeRegistry] applying default theme');
        applyDefaultTheme();
      } catch (err: unknown) {
        const isNetworkError =
          err &&
          typeof err === 'object' &&
          'message' in err &&
          (err.message as string).toLowerCase().includes('fetch');
        if (!isNetworkError) {
          console.warn('[ThemeRegistry] Erro ao carregar tema:', err);
        }
        applyDefaultTheme();
      }
    };

    loadAndApplyTheme();
  }, [supabase, pathname, setTheme, resolvedTheme]);

  return null;
}

// Note: moved `updateThemeColors` to `src/lib/theme.ts` to avoid exporting
// values from a component file (which can trigger Fast Refresh full reloads).
