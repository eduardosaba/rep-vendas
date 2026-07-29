export function normalizeProductReference(reference: string | null | undefined): string {
  if (!reference) return "";
  // Remove all non-alphanumeric characters and convert to uppercase
  return reference.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}
