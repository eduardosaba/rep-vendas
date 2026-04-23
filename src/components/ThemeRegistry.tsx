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
        // Detect public catalog path (legacy: /v/slug) or new nested: /catalogo/{companySlug}/{repSlug}
        const pathParts = pathname?.split('/') || [];
        const isLegacyPublicCatalog = pathParts[1] === 'v';
        const isNestedCatalog = pathParts[1] === 'catalogo' && !!pathParts[2];

        // Prefer using next-themes API to set theme instead of touching classList
        if (isLegacyPublicCatalog) {
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

        // 1. Visitante (Catálogo Virtual) - prioriza tema público e evita chamadas
        // de settings/profiles em contexto público (podem falhar por RLS).
        if (isLegacyPublicCatalog) {
          const catalogSlug = pathParts[2];
          if (catalogSlug) {
              const { data: publicCatalog } = await supabase
              .from('public_catalogs')
              .select('primary_color, secondary_color, font_family, font_url')
              .eq('catalog_slug', catalogSlug)
              .maybeSingle();

              if (publicCatalog) {
              applyThemeColors({
                primary: publicCatalog.primary_color,
                secondary: publicCatalog.secondary_color,
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
        }

        // If nested catalog path (/catalogo/{slug}/{repSlug}), use public_catalogs
        // as source of theme tokens (companies may not have font columns).
        if (isNestedCatalog) {
          const slug = pathParts[2];
          try {
            const { data: publicCatalog } = await supabase
              .from('public_catalogs')
              .select('primary_color, secondary_color, font_family, font_url')
              .eq('catalog_slug', slug)
              .maybeSingle();

            if (publicCatalog) {
              applyThemeColors({
                primary: (publicCatalog as any).primary_color,
                secondary: (publicCatalog as any).secondary_color,
              });

              if ((publicCatalog as any).font_family) {
                try {
                  if ((publicCatalog as any).font_url) {
                    const id = `rv-font-${btoa((publicCatalog as any).font_family).replace(/=/g, '')}`;
                    if (!document.getElementById(id)) {
                      const style = document.createElement('style');
                      style.id = id;
                      style.innerHTML = `@font-face { font-family: '${(publicCatalog as any).font_family}'; src: url('${(publicCatalog as any).font_url}') format('woff2'); font-weight: 400 700; font-style: normal; font-display: swap; }`;
                      document.head.appendChild(style);
                    }
                  }
                  document.documentElement.style.setProperty('--rv-font', (publicCatalog as any).font_family);
                } catch (e) {
                  // ignore
                }
              }

              return;
            }
          } catch (e) {
            // ignore fetch errors and continue
          }
        }

        // 2. Verifica se há usuário logado (Contexto Dashboard/Admin)
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
            .select('primary_color, secondary_color, header_background_color, header_text_color, header_icon_bg_color, header_icon_color, font_family, font_url')
            .eq('user_id', user.id)
            .maybeSingle();

          if (settings) {
            applyThemeColors({
              primary: settings.primary_color || DEFAULT_PRIMARY_COLOR,
              secondary: settings.secondary_color || DEFAULT_SECONDARY_COLOR,
              headerBg: settings.header_background_color,
              headerText: (settings as any).header_text_color,
              headerIconBg: (settings as any).header_icon_bg_color,
              headerIconColor: (settings as any).header_icon_color,
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

            // Not registering service worker or auto-configuring notifications here.
            // Notification setup is performed explicitly via the Notifications CTA component.

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
