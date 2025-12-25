/**
 * src/lib/colors.ts
 * Utilitários para manipulação de cores e acessibilidade (WCAG 2.1).
 */

export function getContrastColor(hexColor: string): string {
  if (!hexColor) return '#ffffff';

  // 1. Limpeza e normalização do Hex
  const hex = hexColor.replace('#', '');

  // Suporte para hex curto (ex: #f00 -> #ff0000)
  const fullHex =
    hex.length === 3
      ? hex
          .split('')
          .map((char) => char + char)
          .join('')
      : hex;

  // 2. Converte para RGB (0-255)
  const r8 = parseInt(fullHex.substring(0, 2), 16);
  const g8 = parseInt(fullHex.substring(2, 4), 16);
  const b8 = parseInt(fullHex.substring(4, 6), 16);

  /**
   * 3. Cálculo de Luminância Relativa (Padrão WCAG)
   * Primeiro, convertemos os valores sRGB para valores lineares (Gamma Correction).
   */
  const a = [r8, g8, b8].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  // Fórmula oficial da WCAG para luminância relativa:
  const luminance = 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];

  /**
   * 4. Determinação do contraste
   * O limiar padrão de 0.179 na luminância relativa garante o melhor contraste
   * entre texto branco (#ffffff) e o texto escuro do seu tema (#0f172a).
   */
  return luminance > 0.179 ? '#0f172a' : '#ffffff';
}

/**
 * Converte Hex para string RGB separada por espaços.
 * Útil para aplicar transparência em variáveis CSS: rgba(var(--primary-rgb), 0.5).
 */
export function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0 0 0';

  return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`;
}
