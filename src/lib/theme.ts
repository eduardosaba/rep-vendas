import { getContrastColor, hexToRgb } from './colors';

export const DEFAULT_PRIMARY_COLOR = '#b9722e';
export const DEFAULT_SECONDARY_COLOR = '#0d1b2c';
export const DEFAULT_HEADER_BG_COLOR = '#ffffff';

export interface ThemeColors {
  primary: string;
  secondary: string;
  headerBg?: string;
}

/**
 * Aplica as cores do tema ao documento HTML via CSS Variables.
 */
export function applyThemeColors(colors: Partial<ThemeColors>) {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;

  // --- COR PRIMÁRIA ---
  const primaryColor = colors.primary || DEFAULT_PRIMARY_COLOR;
  root.style.setProperty('--primary', primaryColor);

  // Gera a variável RGB para permitir opacidade: rgba(var(--primary-rgb), 0.5)
  const primaryRgb = hexToRgb(primaryColor);
  root.style.setProperty('--primary-rgb', primaryRgb);

  const primaryContrast = getContrastColor(primaryColor);
  root.style.setProperty('--primary-foreground', primaryContrast);

  // --- COR SECUNDÁRIA ---
  const secondaryColor = colors.secondary || DEFAULT_SECONDARY_COLOR;
  root.style.setProperty('--secondary', secondaryColor);

  // Também geramos para a secundária para manter a consistência
  const secondaryRgb = hexToRgb(secondaryColor);
  root.style.setProperty('--secondary-rgb', secondaryRgb);

  const secondaryContrast = getContrastColor(secondaryColor);
  root.style.setProperty('--secondary-foreground', secondaryContrast);

  // --- HEADER ---
  if (colors.headerBg) {
    root.style.setProperty('--header-bg', colors.headerBg);
    const headerRgb = hexToRgb(colors.headerBg);
    root.style.setProperty('--header-bg-rgb', headerRgb);
  }
}

/**
 * Restaura o tema para os valores padrão do RepVendas.
 */
export function applyDefaultTheme() {
  applyThemeColors({
    primary: DEFAULT_PRIMARY_COLOR,
    secondary: DEFAULT_SECONDARY_COLOR,
    headerBg: DEFAULT_HEADER_BG_COLOR,
  });
}
