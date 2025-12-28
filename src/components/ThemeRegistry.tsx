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
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: settings } = await supabase
            .from('settings')
            .select('primary_color, secondary_color, header_background_color')
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
            return;
          }
        }

        // 2. Visitante (Catálogo Virtual)
        const catalogSlug = pathParts[1] === 'v' ? pathParts[2] : null;

        if (catalogSlug) {
          const { data: publicCatalog } = await supabase
            .from('public_catalogs')
            .select('primary_color, secondary_color, header_background_color')
            .eq('slug', catalogSlug)
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

// Export helper to update theme colors programmatically from other components
export function updateThemeColors(colors: {
  primary?: string;
  secondary?: string;
  headerBg?: string;
}) {
  applyThemeColors(colors);
}
