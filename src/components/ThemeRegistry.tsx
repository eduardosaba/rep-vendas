'use client';

import { useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
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

  useEffect(() => {
    const loadAndApplyTheme = async () => {
      try {
        // Remove a classe 'dark' do HTML para garantir fundo claro no catálogo
        document.documentElement.classList.remove('dark');

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
            applyThemeColors({
              primary: settings.primary_color || DEFAULT_PRIMARY_COLOR,
              secondary: settings.secondary_color || DEFAULT_SECONDARY_COLOR,
              headerBg: settings.header_background_color,
            });
            return;
          }
        }

        /**
         * 2. Lógica para Visitante (Catálogo Virtual)
         * Identifica o slug pela URL (ex: repvendas.com.br/v/clinica-exemplo)
         */
        const pathParts = pathname?.split('/') || [];
        // Se a rota for /v/[slug], o slug estará na posição 2
        const catalogSlug = pathParts[1] === 'v' ? pathParts[2] : null;

        if (catalogSlug) {
          // Busca cores na tabela pública para visitantes
          const { data: publicCatalog } = await supabase
            .from('public_catalogs')
            .select('primary_color, secondary_color, header_background_color')
            .eq('slug', catalogSlug)
            .maybeSingle();

          if (publicCatalog) {
            applyThemeColors({
              primary: publicCatalog.primary_color,
              secondary: publicCatalog.secondary_color,
              headerBg: publicCatalog.header_background_color,
            });
            return;
          }
        }

        // 3. Fallback: Tema padrão do sistema
        applyDefaultTheme();
      } catch (err) {
        console.warn('[ThemeRegistry] Erro ao carregar tema:', err);
        applyDefaultTheme();
      }
    };

    loadAndApplyTheme();
  }, [supabase, pathname]);

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
