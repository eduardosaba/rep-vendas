export function normalizeBrand(brand: string | null | undefined): string {
  if (!brand) return "";
  // Remove special characters, multiple spaces, and convert to uppercase for standardized matching
  return brand
    .trim()
    .replace(/[^a-zA-Z0-9À-ÿ\s]/g, "")
    .replace(/\s+/g, " ")
    .toUpperCase();
}
