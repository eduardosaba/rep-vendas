export type NormalizationRule =
  | 'trim'
  | 'uppercase'
  | 'lowercase'
  | 'remove_accents'
  | 'remove_hyphens'
  | 'remove_dots'
  | 'remove_invisible'
  | 'remove_spaces'
  | 'remove_slashes'
  | 'alphanumeric_only';

export interface NormalizationConfig {
  rules: NormalizationRule[];
}

export const DEFAULT_NORMALIZATION_CONFIG: NormalizationConfig = {
  rules: ['trim', 'uppercase', 'alphanumeric_only'],
};

export function normalizeProductKey(
  value: string | null | undefined,
  config: NormalizationConfig = DEFAULT_NORMALIZATION_CONFIG
): string {
  if (value === null || value === undefined) return '';
  let str = String(value)
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ')
    .replace(/\s+/g, ' ');

  for (const rule of config.rules) {
    switch (rule) {
      case 'trim':
        str = str.trim();
        break;
      case 'uppercase':
        str = str.toUpperCase();
        break;
      case 'lowercase':
        str = str.toLowerCase();
        break;
      case 'remove_accents':
        str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        break;
      case 'remove_hyphens':
        str = str.replace(/-/g, '');
        break;
      case 'remove_dots':
        str = str.replace(/\./g, '');
        break;
      case 'remove_invisible':
        str = str.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ');
        break;
      case 'remove_spaces':
        str = str.replace(/\s+/g, '');
        break;
      case 'remove_slashes':
        str = str.replace(/[\/\\]/g, '');
        break;
      case 'alphanumeric_only':
        str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '');
        break;
    }
  }

  return str;
}

export function buildProductLookupKey(
  brand: string | null | undefined,
  referenceCode: string | null | undefined,
  config: NormalizationConfig = DEFAULT_NORMALIZATION_CONFIG
): string {
  const normBrand = normalizeProductKey(brand, config);
  const normRef = normalizeProductKey(referenceCode, config);
  if (!normBrand || !normRef) return '';
  return `${normBrand}|${normRef}`;
}
