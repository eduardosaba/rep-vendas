import { normalizeProductKey } from './normalize-product-key';

export function normalizeBrand(brand: string | null | undefined): string {
  return normalizeProductKey(brand);
}
