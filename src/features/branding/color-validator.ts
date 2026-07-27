/**
 * Sanitiza valores de cor, garantindo que sejam HEX válidos, 
 * protegendo o <style> no SSR de injeções de código ou erros.
 */
export function safeColor(value: string | undefined | null, fallback: string): string {
  const hexRegex = /^#[0-9A-F]{6}$/i
  return value && hexRegex.test(value) ? value : fallback
}
