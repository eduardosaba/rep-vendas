// src/lib/colors.ts

export function getContrastColor(hexColor: string): string {
  if (!hexColor) return '#ffffff';

  // Remove o # se tiver
  const hex = hexColor.replace('#', '');

  // Converte para RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Fórmula de luminosidade (YIQ)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;

  // Se for maior que 128, a cor é clara (usa texto escuro)
  // Se for menor, a cor é escura (usa texto branco)
  return yiq >= 128 ? '#0f172a' : '#ffffff';
}

// Opcional: Função para converter Hex em RGB (para usar com transparência no CSS)
export function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
    : '0 0 0';
}
