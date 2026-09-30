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

/**
 * Aplica máscara de telefone brasileiro:
 * - 11 dígitos (DDD + 9 dígitos): (XX) XXXXX-XXXX
 * - 10 dígitos (DDD + 8 dígitos): (XX) XXXX-XXXX
 * Trata números com ou sem DDI 55 (ex: +557599999999 -> (75) 9999-9999 ou (75) 99999-9999).
 * Trata também 0800 e números curtos.
 */
export function formatPhone(value?: string | null): string {
  if (!value) return '';
  const str = String(value).trim();
  const digits = str.replace(/\D/g, '');
  if (!digits) return str;

  // 0800
  if (digits.startsWith('0800')) {
    if (digits.length === 11) {
      return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    }
    return digits;
  }

  // Com DDI 55 (Brasil)
  if (digits.startsWith('55')) {
    const local = digits.slice(2);
    if (local.length === 11) {
      return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
    }
    if (local.length === 10) {
      return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
    }
    if (local.length === 9) {
      return `${local.slice(0, 5)}-${local.slice(5)}`;
    }
    if (local.length === 8) {
      return `${local.slice(0, 4)}-${local.slice(4)}`;
    }
  }

  // Sem DDI (DDD + Número)
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 9) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }

  return str;
}

