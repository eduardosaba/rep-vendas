import { getContrastColor, hexToRgb } from './colors';
import { SYSTEM_FONTS } from './fonts';

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

  // Apply variables using setProperty to avoid overwriting unrelated inline styles
  vars.forEach((v) => {
    const [name, value] = v.split(':').map((s) => s.trim());
    if (name && value !== undefined) {
      root.style.setProperty(name, value);
    }
  });
}

/**
 * Aplica a fonte ao dashboard via body font-family.
 * IMPORTANTE: Esta função aplica a fonte APENAS ao dashboard (preview).
 * A fonte do CATÁLOGO é aplicada pelo componente Storefront.
 */
export function applyDashboardFont(fontName: string | null) {
  if (typeof window === 'undefined') return;

  const body = document.body;

  if (!fontName) {
    // Remove font-family customizada, volta ao padrão do sistema
    body.style.fontFamily = '';
    return;
  }

  const selectedFont = SYSTEM_FONTS.find((f) => f.name === fontName);
  if (!selectedFont) {
    console.warn(`Fonte "${fontName}" não encontrada em SYSTEM_FONTS`);
    return;
  }

  // Carrega a fonte via Google Fonts se ainda não foi carregada
  const linkId = `font-${fontName.replace(/\s+/g, '-')}`;
  if (!document.getElementById(linkId)) {
    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = selectedFont.import;
    document.head.appendChild(link);
  }

  // Aplica a font-family ao body
  body.style.fontFamily = selectedFont.family;
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
