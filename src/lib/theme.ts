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

  // Build all variable assignments first, then apply in one atomic cssText write
  const primaryColor = colors.primary || DEFAULT_PRIMARY_COLOR;
  const primaryRgb = hexToRgb(primaryColor);
  const primaryContrast = getContrastColor(primaryColor);

  const secondaryColor = colors.secondary || DEFAULT_SECONDARY_COLOR;
  const secondaryRgb = hexToRgb(secondaryColor);
  const secondaryContrast = getContrastColor(secondaryColor);

  const vars: string[] = [];
  vars.push(`--primary: ${primaryColor}`);
  vars.push(`--primary-rgb: ${primaryRgb}`);
  vars.push(`--primary-foreground: ${primaryContrast}`);

  vars.push(`--secondary: ${secondaryColor}`);
  vars.push(`--secondary-rgb: ${secondaryRgb}`);
  vars.push(`--secondary-foreground: ${secondaryContrast}`);

  if (colors.headerBg) {
    const headerRgb = hexToRgb(colors.headerBg);
    vars.push(`--header-bg: ${colors.headerBg}`);
    vars.push(`--header-bg-rgb: ${headerRgb}`);
  }

  // Apply all variables in a single assignment to reduce layout jumps
  const existing = root.style.cssText || '';
  const appended = vars.join('; ');
  root.style.cssText = `${existing}; ${appended}`;
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
