/**
 * Sanitizador centralizado de URLs para CTA e Imagens do PageBuilder.
 * Evita a injeção de esquemas inseguros (ex: javascript:, vbscript:, data:text/html).
 */
export function sanitizeUrl(url: string | undefined | null, fallback = ''): string {
  if (!url || typeof url !== 'string') return fallback;

  const trimmed = url.trim();
  if (!trimmed) return fallback;

  // Permite caminhos relativos ou âncoras locais
  if (trimmed.startsWith('/') || trimmed.startsWith('#') || trimmed.startsWith('?')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed, 'https://dummy-base.local');
    const protocol = parsed.protocol.toLowerCase();

    // Bloqueia esquemas inseguros explicitamente
    if (['javascript:', 'vbscript:', 'data:'].includes(protocol)) {
      return fallback;
    }

    // Permite esquemas seguros
    if (['http:', 'https:', 'mailto:', 'tel:'].includes(protocol)) {
      return trimmed;
    }

    return fallback;
  } catch {
    // Se falhar o parse da URL mas for um caminho simples seguro sem dois pontos
    if (!trimmed.includes(':')) {
      return trimmed;
    }
    return fallback;
  }
}
