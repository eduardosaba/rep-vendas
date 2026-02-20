export function normalizePhone(value?: string | null): string {
  if (!value) return '';
  // Remove non-digits
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '';

  // If already has country code (starts with 55 and length reasonable), prefix with +
  if (typeof digits === 'string' && digits.length === 13 && digits.startsWith('55')) {
    return `+${digits}`;
  }

  // If length is 11 (DDD + 9 digits) assume Brazil and prefix +55
  if (digits.length === 11) {
    return `+55${digits}`;
  }

  // If length is 10 (DDD + 8 digits) assume Brazil
  if (digits.length === 10) {
    return `+55${digits}`;
  }

  // Fallback: if starts with country code without +, add +; otherwise try to return digits with +
  if (digits.length > 0) {
    if (typeof digits === 'string' && digits.startsWith('55')) return `+${digits}`;
    return `+${digits}`;
  }

  return '';
}
// named export only
