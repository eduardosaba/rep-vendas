import { getContrastColor, hexToRgb } from './colors';
import { SYSTEM_FONTS } from './fonts';

export const DEFAULT_PRIMARY_COLOR = '#b9722e';
export const DEFAULT_SECONDARY_COLOR = '#0d1b2c';
export const DEFAULT_HEADER_BG_COLOR = '#ffffff';

export interface ThemeColors {
  primary: string;
  secondary: string;
  headerBg?: string;
  headerText?: string;
  headerIconBg?: string;
  headerIconColor?: string;
}

/**
 * Aplica as cores do tema ao documento HTML via CSS Variables.
 */
export function applyThemeColors(colors: Partial<ThemeColors>) {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;

  const vars: string[] = [];

  if (typeof colors.primary !== 'undefined' && colors.primary !== null) {
    const primaryColor = colors.primary;
    const primaryRgb = hexToRgb(primaryColor);
    const primaryContrast = getContrastColor(primaryColor);

    vars.push(`--primary: ${primaryColor}`);
    vars.push(`--primary-rgb: ${primaryRgb}`);
    vars.push(`--primary-foreground: ${primaryContrast}`);
  }

  if (typeof colors.secondary !== 'undefined' && colors.secondary !== null) {
    const secondaryColor = colors.secondary;
    const secondaryRgb = hexToRgb(secondaryColor);
    const secondaryContrast = getContrastColor(secondaryColor);

    vars.push(`--secondary: ${secondaryColor}`);
    vars.push(`--secondary-rgb: ${secondaryRgb}`);
    vars.push(`--secondary-foreground: ${secondaryContrast}`);
  }

  if (colors.headerBg) {
    const headerRgb = hexToRgb(colors.headerBg);

    vars.push(`--header-bg: ${colors.headerBg}`);
    vars.push(`--header-bg-rgb: ${headerRgb}`);
  }

  if (colors.headerText) {
    vars.push(`--header-text: ${colors.headerText}`);
  }

  if (colors.headerIconBg) {
    vars.push(`--header-icon-bg: ${colors.headerIconBg}`);
  }

  if (colors.headerIconColor) {
    vars.push(`--header-icon-color: ${colors.headerIconColor}`);
  }

  vars.forEach((variable) => {
    const [name, ...valueParts] = variable.split(':');
    const value = valueParts.join(':').trim();

    if (name && value !== undefined) {
      root.style.setProperty(name.trim(), value);
    }
  });
}

/**
 * Aplica a fonte ao dashboard via body font-family.
 * IMPORTANTE: Esta função aplica a fonte APENAS ao dashboard/preview.
 * A fonte do CATÁLOGO é aplicada pelo componente Storefront.
 */
export function applyDashboardFont(fontName: string | null) {
  if (typeof window === 'undefined') return;

  const body = document.body;

  if (!fontName) {
    body.style.fontFamily = '';
    return;
  }

  const selectedFont = SYSTEM_FONTS.find((font) => font.name === fontName);

  if (!selectedFont) {
    console.warn(`Fonte "${fontName}" não encontrada em SYSTEM_FONTS`);
    return;
  }

  const stylesheetUrl = selectedFont.stylesheetUrl || null;

  if (!stylesheetUrl) {
    try {
      body.style.fontFamily = selectedFont.family;
    } catch (error) {
      console.warn(
        'applyDashboardFont: failed to apply local/system font-family',
        error
      );
    }

    return;
  }

  const linkId = `font-${fontName.replace(/\s+/g, '-')}`;

  if (!document.getElementById(linkId)) {
    const link = document.createElement('link');

    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = stylesheetUrl;

    link.onload = async () => {
      try {
        const loaded = await waitForFontLoad(selectedFont.family, 3000);

        if (loaded) {
          body.style.fontFamily = selectedFont.family;
        } else {
          console.warn(
            `applyDashboardFont: font ${selectedFont.family} failed to load within timeout`
          );

          try {
            link.remove();
          } catch {
            // ignore
          }
        }
      } catch (error) {
        console.warn(
          'applyDashboardFont: failed while waiting for font load',
          error
        );

        try {
          link.remove();
        } catch {
          // ignore
        }
      }
    };

    link.onerror = () => {
      console.warn(
        `applyDashboardFont: failed to load font ${fontName} from ${stylesheetUrl}`
      );

      try {
        link.remove();
      } catch {
        // ignore
      }
    };

    document.head.appendChild(link);
  } else {
    try {
      body.style.fontFamily = selectedFont.family;
    } catch (error) {
      console.warn('applyDashboardFont: apply fallback failed', error);
    }
  }
}

/**
 * Espera a fonte ficar disponível usando Font Loading API.
 */
async function waitForFontLoad(fontFamily: string, timeoutMs = 3000) {
  if (typeof document === 'undefined' || !(document as any).fonts) {
    return false;
  }

  const fontFaceSet = (document as any).fonts as FontFaceSet;

  const primaryFamily = fontFamily.split(',')[0]?.replace(/["']/g, '').trim();

  if (!primaryFamily) {
    return false;
  }

  const weights = ['400', '700'];

  const loadPromises = weights.map((weight) =>
    fontFaceSet.load(`${weight} 16px "${primaryFamily}"`)
  );

  try {
    await Promise.race([
      Promise.all(loadPromises),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), timeoutMs)
      ),
    ]);

    return fontFaceSet.check(`16px "${primaryFamily}"`);
  } catch {
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
