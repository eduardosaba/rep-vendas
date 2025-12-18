'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  applyThemeColors,
  applyDefaultTheme,
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SECONDARY_COLOR,
} from '@/lib/theme';

/**
 * ThemeRegistry - Sistema Centralizado de Cores
 *
 * Este componente é a ÚNICA fonte de verdade para aplicar cores no sistema.
 *
 * Funcionamento:
 * 1. Carrega as cores do banco de dados (tabela 'settings')
 * 2. Aplica as cores via CSS variables usando applyThemeColors()
 * 3. Se não houver cores configuradas, usa os valores padrão
 *
 * As cores são aplicadas em :root via CSS variables:
 * - --primary: Cor primária do sistema
 * - --primary-foreground: Cor de contraste para texto sobre primária
 * - --secondary: Cor secundária do sistema
 * - --secondary-foreground: Cor de contraste para texto sobre secundária
 * - --header-bg: Cor de fundo do header
 */
export default function ThemeRegistry() {
  const supabase = createClient();

  useEffect(() => {
    const loadAndApplyTheme = async () => {
      try {
        // 1. Verifica se há usuário logado
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          // Se não houver usuário, aplica tema padrão
          applyDefaultTheme();
          return;
        }

        // 2. Busca configurações do usuário no banco
        const { data: settings } = await supabase
          .from('settings')
          .select('primary_color, secondary_color, header_background_color')
          .eq('user_id', user.id)
          .maybeSingle();

        // 3. Aplica as cores (usa padrão se não configurado)
        applyThemeColors({
          primary: settings?.primary_color || DEFAULT_PRIMARY_COLOR,
          secondary: settings?.secondary_color || DEFAULT_SECONDARY_COLOR,
          headerBg: settings?.header_background_color,
        });
      } catch {
        // Em caso de erro, aplica tema padrão silenciosamente
        applyDefaultTheme();
      }
    };

    loadAndApplyTheme();
  }, [supabase]);

  return null;
}

/**
 * Função utilitária para atualizar cores em tempo real
 * Pode ser chamada da página de settings quando o usuário altera cores
 */
export function updateThemeColors(colors: {
  primary?: string;
  secondary?: string;
  headerBg?: string;
}) {
  applyThemeColors(colors);
}
