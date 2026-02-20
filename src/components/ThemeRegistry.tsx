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
    if (typeof resolvedTheme === 'undefined') return;

    const loadAndApplyTheme = async () => {
      try {
        // Detect public catalog path (ex: /v/slug)
        const pathParts = pathname?.split('/') || [];
        const isPublicCatalog = pathParts[1] === 'v';

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
                  document.documentElement.style.setProperty('--rv-font', platform.font_family);
                } catch (e) {
                  // ignore font injection errors
                }
                // If a platform font is set, treat it as highest priority for font only (do not return)
              }
            } catch (e) {
              // ignore platform settings load errors
            }

            const disableAuto =
              typeof window !== 'undefined' &&
              typeof window.localStorage?.getItem === 'function' &&
              window.localStorage.getItem('rv_disable_auto_theme') === '1';

            // Aguarda resolvedTheme para evitar alternância imediata durante reidratação.
            if (typeof resolvedTheme === 'undefined' || resolvedTheme === null) {
              // resolvedTheme ainda não disponível — não força tema
            } else if (!disableAuto && resolvedTheme !== 'light') {
              setTheme('light'); // force light theme for public catalogs
            } else if (disableAuto) {
              // auto-theme disabled
            }
          } catch (e) {
            // ignore if next-themes not ready
          }
        }

        // 1. Verifica se há usuário logado (Contexto Dashboard/Admin)
        let user: any = null;
        try {
          const userPromise = supabase.auth.getUser();
          const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('supabase.getUser timeout')), 5000)
          );
          const res: any = await Promise.race([userPromise, timeout]);
          if (res && res.data && res.data.user) user = res.data.user;
        } catch (e) {
          // ignore getUser errors
        }

        if (user) {
          const { data: settings } = await supabase
            .from('settings')
            .select('primary_color, secondary_color, header_background_color, font_family, font_url')
            .eq('user_id', user.id)
            .maybeSingle();

          if (settings) {
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
                document.documentElement.style.setProperty('--rv-font', settings.font_family);
              } catch (e) {
                // ignore font injection errors
              }
            }

            // Register service worker and configure push notifications for logged user
            try {
              if (typeof window !== 'undefined') {
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.register('/firebase-messaging-sw.js').then(() => null).catch(() => null);
                }
                try {
                  setupNotifications(user.id as string);
                } catch (e) {
                  // ignore
                }
              }
            } catch (e) {
              // ignore
            }

            return;
          }
        }

        // 2. Visitante (Catálogo Virtual)
        const catalogSlug = pathParts[1] === 'v' ? pathParts[2] : null;

        if (catalogSlug) {
          const { data: publicCatalog } = await supabase
            .from('public_catalogs')
            .select('primary_color, secondary_color, header_background_color, font_family, font_url')
            .eq('catalog_slug', catalogSlug)
            .maybeSingle();

          if (publicCatalog) {
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
                document.documentElement.style.setProperty('--rv-font', publicCatalog.font_family);
              } catch (e) {
                // ignore
              }
            }

            return;
          }
        }

        // 3. Fallback
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
