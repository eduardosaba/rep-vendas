import { getContrastColor } from './colors';

// Cores padrão do RepVendas
export const DEFAULT_PRIMARY_COLOR = '#b9722e';
export const DEFAULT_SECONDARY_COLOR = '#0d1b2c';
export const DEFAULT_HEADER_BG_COLOR = '#ffffff';

export interface ThemeColors {
  primary: string;
  secondary: string;
  headerBg: string; // Removido opcional para facilitar o processamento interno
}

/**
 * Aplica as variáveis de cores no :root do documento.
 * Calcula automaticamente as cores de contraste para garantir legibilidade.
 */
export function applyThemeColors(colors: Partial<ThemeColors>) {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;

  // 1. Processar Cor Primária
  const primaryColor = colors.primary || DEFAULT_PRIMARY_COLOR;
  root.style.setProperty('--primary', primaryColor);
  root.style.setProperty(
    '--primary-foreground',
    getContrastColor(primaryColor)
  );

  // 2. Processar Cor Secundária
  const secondaryColor = colors.secondary || DEFAULT_SECONDARY_COLOR;
  root.style.setProperty('--secondary', secondaryColor);
  root.style.setProperty(
    '--secondary-foreground',
    getContrastColor(secondaryColor)
  );

  // 3. Processar Header (Fundo e Texto)
  const headerBgColor = colors.headerBg || DEFAULT_HEADER_BG_COLOR;
  root.style.setProperty('--header-bg', headerBgColor);

  // Adicionado: Contraste automático para o texto do Header
  // Isso evita que o menu suma se o usuário colocar um header preto ou azul escuro.
  root.style.setProperty('--header-text', getContrastColor(headerBgColor));
}

/**
 * Reseta o sistema para as cores de marca do RepVendas
 */
export function applyDefaultTheme() {
  applyThemeColors({
    primary: DEFAULT_PRIMARY_COLOR,
    secondary: DEFAULT_SECONDARY_COLOR,
    headerBg: DEFAULT_HEADER_BG_COLOR,
  });
}
