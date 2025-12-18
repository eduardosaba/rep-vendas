import { getContrastColor } from './colors';

export const DEFAULT_PRIMARY_COLOR = '#b9722e';
export const DEFAULT_SECONDARY_COLOR = '#0d1b2c';
export const DEFAULT_HEADER_BG_COLOR = '#ffffff';

export interface ThemeColors {
  primary: string;
  secondary: string;
  headerBg?: string;
}

export function applyThemeColors(colors: Partial<ThemeColors>) {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;

  const primaryColor = colors.primary || DEFAULT_PRIMARY_COLOR;
  root.style.setProperty('--primary', primaryColor);
  const primaryContrast = getContrastColor(primaryColor);
  root.style.setProperty('--primary-foreground', primaryContrast);

  const secondaryColor = colors.secondary || DEFAULT_SECONDARY_COLOR;
  root.style.setProperty('--secondary', secondaryColor);
  const secondaryContrast = getContrastColor(secondaryColor);
  root.style.setProperty('--secondary-foreground', secondaryContrast);

  if (colors.headerBg) {
    root.style.setProperty('--header-bg', colors.headerBg);
  }
}

export function applyDefaultTheme() {
  applyThemeColors({
    primary: DEFAULT_PRIMARY_COLOR,
    secondary: DEFAULT_SECONDARY_COLOR,
    headerBg: DEFAULT_HEADER_BG_COLOR,
  });
}
