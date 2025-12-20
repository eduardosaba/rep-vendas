export function formatDocument(doc?: string | null): string | null {
  if (!doc) return null;
  const digits = String(doc).replace(/\D/g, '');
  if (digits.length === 11) {
    // CPF: 000.000.000-00
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (digits.length === 14) {
    // CNPJ: 00.000.000/0000-00
    return digits.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      '$1.$2.$3/$4-$5'
    );
  }
  return doc;
}
