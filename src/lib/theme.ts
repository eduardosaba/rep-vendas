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
    // When self-hosting fonts we intentionally avoid adding external
    // preconnects to Google Fonts (fonts.googleapis.com / fonts.gstatic.com)
    // to prevent accidental external requests in restricted networks.

    // If there is no external import URL for this font (self-hosted),
    // just apply the family immediately and skip injecting an external link.
    if (!selectedFont.import) {
      try {
        body.style.fontFamily = selectedFont.family;
      } catch (e) {
        console.warn('applyDashboardFont: failed to apply self-hosted font-family', e);
      }
      return;
    }

    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.crossOrigin = 'anonymous';
    link.href = selectedFont.import;
    // Only apply the font-family after verifying the font actually loaded
    link.onload = async () => {
      try {
        const loaded = await waitForFontLoad(selectedFont.family, 3000);
        if (loaded) {
          body.style.fontFamily = selectedFont.family;
        } else {
          console.warn(`applyDashboardFont: font ${selectedFont.family} failed to load within timeout`);
          try {
            link.remove();
          } catch (e) {}
        }
      } catch (e) {
        console.warn('applyDashboardFont: failed while waiting for font load', e);
        try {
          link.remove();
        } catch (er) {}
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
 * Waits for a font family to be available via the Font Loading API.
 * Returns true if loaded within timeoutMs, false otherwise.
 */
async function waitForFontLoad(fontFamily: string, timeoutMs = 3000) {
  if (typeof document === 'undefined' || !(document as any).fonts) return false;

  const fontFaceSet = (document as any).fonts as FontFaceSet;

  // Try a few common weights to increase chance of detecting availability
  const weights = ['400', '700'];
  const loadPromises = weights.map((w) => fontFaceSet.load(`${w} 16px "${fontFamily}"`));

  try {
    await Promise.race([
      Promise.all(loadPromises),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
    ]);
    // Double-check with check()
    return fontFaceSet.check(`16px "${fontFamily}"`);
  } catch (e) {
    return false;
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
