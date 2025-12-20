// Converte Hex para RGB e decide se a cor é "Clara" ou "Escura"
// Se for Clara -> Retorna Preto (para o texto)
// Se for Escura -> Retorna Branco (para o texto)

export function getContrastColor(hexColor: string): string {
  // Remove o # se tiver
  const hex = hexColor.replace('#', '');

  // Converte para RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Fórmula de luminosidade (padrão W3C)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;

  // Se luminosidade >= 128, a cor é clara. Retorne texto escuro.
  // Senão, retorne texto claro.
  return yiq >= 128 ? '#0f172a' : '#ffffff'; // Slate-900 ou White
}

// Opcional: Função para clarear uma cor (útil para Hover em Dark Mode)
export function adjustBrightness(hex: string, percent: number) {
  // Lógica para clarear/escurecer hex se necessário...
  // Por simplicidade, vamos focar no contraste primeiro.
  return hex;
}
