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

  // Carrega a fonte via Google Fonts se ainda não foi carregada.
  // Aplicamos `fontFamily` somente após o carregamento bem-sucedido.
  const linkId = `font-${fontName.replace(/\s+/g, '-')}`;
  if (!document.getElementById(linkId)) {
    // Add preconnects to improve reliability and avoid CORS issues
    try {
      if (!document.querySelector('link[rel="preconnect"][href="https://fonts.gstatic.com"]')) {
        const pc = document.createElement('link');
        pc.rel = 'preconnect';
        pc.href = 'https://fonts.gstatic.com';
        pc.crossOrigin = 'anonymous';
        document.head.appendChild(pc);
      }
      if (!document.querySelector('link[rel="preconnect"][href="https://fonts.googleapis.com"]')) {
        const pc2 = document.createElement('link');
        pc2.rel = 'preconnect';
        pc2.href = 'https://fonts.googleapis.com';
        document.head.appendChild(pc2);
      }
    } catch (e) {
      // non-fatal
    }

    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.crossOrigin = 'anonymous';
    link.href = selectedFont.import;
    link.onload = () => {
      try {
        body.style.fontFamily = selectedFont.family;
      } catch (e) {
        console.warn('applyDashboardFont: failed to apply font-family', e);
      }
    };
    link.onerror = () => {
      console.warn(`applyDashboardFont: failed to load font ${fontName} from ${selectedFont.import}`);
      try {
        link.remove();
      } catch (e) {}
    };
    document.head.appendChild(link);
  } else {
    // Already present — apply immediately (likely loaded)
    try {
      body.style.fontFamily = selectedFont.family;
    } catch (e) {
      console.warn('applyDashboardFont: apply fallback failed', e);
    }
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

/**
 * Helper exported so other modules can update theme colors without importing
 * a client component. Keeping this in `lib/theme` avoids Fast Refresh issues
 * caused by exporting values from React component files.
 */
export function updateThemeColors(colors: Partial<ThemeColors>) {
  applyThemeColors(colors);
}
