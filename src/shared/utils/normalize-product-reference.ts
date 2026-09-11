import { normalizeProductKey } from './normalize-product-key';

export function normalizeProductReference(reference: string | null | undefined): string {
  return normalizeProductKey(reference);
}
