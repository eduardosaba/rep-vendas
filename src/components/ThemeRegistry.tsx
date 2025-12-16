'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getContrastColor, hexToRgb } from '@/lib/colors';

export default function ThemeRegistry() {
  const supabase = createClient();
  useEffect(() => {
    const applyTheme = async () => {
      // 1. Pega usuário
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // 2. Busca configurações da tabela 'settings' com resiliência (.maybeSingle())
      const { data: settings } = await supabase
        .from('settings')
        .select('primary_color, secondary_color, header_background_color')
        .eq('user_id', user.id)
        .maybeSingle();

        const root = document.documentElement;

      // --- COR PRIMÁRIA (com fallback) ---
      const primaryColor = settings?.primary_color || '#4f46e5'; // Indigo-600 como padrão
      root.style.setProperty('--primary', primaryColor);
      const contrast = getContrastColor(primaryColor);
          root.style.setProperty('--primary-foreground', contrast);

      // --- COR SECUNDÁRIA (com fallback) ---
      if (settings?.secondary_color) {
          root.style.setProperty('--secondary', settings.secondary_color);
          const secContrast = getContrastColor(settings.secondary_color);
          root.style.setProperty('--secondary-foreground', secContrast);
      } else {
        // Fallback para cor secundária padrão
        root.style.setProperty('--secondary', '#64748b'); // Slate-500
        root.style.setProperty('--secondary-foreground', '#ffffff');
        }

        // --- HEADER ---
        // Aqui tem um truque: No modo escuro, talvez você queira ignorar o header branco
        // Mas se quiser forçar a escolha do usuário:
      if (settings?.header_background_color) {
          // Opcional: Só aplicar se não estiver no modo dark, ou aplicar sempre
          // root.style.setProperty('--header-bg', settings.header_background_color);
      }
    };

    applyTheme();
  }, []);

  return null;
}
