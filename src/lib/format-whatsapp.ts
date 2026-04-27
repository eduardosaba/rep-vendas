export function formatWhatsAppDigits(input?: string | null): string {
  if (!input) return '';
  const digits = String(input).replace(/\D/g, '');
  if (!digits) return '';
  // If already starts with country code 55, return as-is
  if (digits.startsWith('55')) return digits;
  // If length looks like local (DDD+number) 10 or 11, prepend 55
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  // Otherwise return cleaned digits (best-effort)
  return digits;
}

export function makeWhatsAppUrl(phone?: string | null, message?: string) {
  const digits = formatWhatsAppDigits(phone);
  if (!digits) return '';
  const txt = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${digits}${txt}`;
}

export default makeWhatsAppUrl;

export function makeWhatsAppShareUrl(message?: string) {
  const txt = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${txt}`;
}
