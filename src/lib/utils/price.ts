/**
 * Formata o preço do produto conforme a regra de negócio canônica de `price_on_request`.
 * - Se `priceOnRequest === true`: retorna "Sob consulta".
 * - Se `priceOnRequest` for falso ou indefinido: retorna o valor numérico formatado em BRL (ex: "R$ 350,00").
 *   - Nota: Se price = 0 e priceOnRequest = false, retorna "R$ 0,00".
 */
export function formatProductPrice(
  price: number | null | undefined,
  priceOnRequest?: boolean | null
): string {
  if (priceOnRequest === true) {
    return 'Sob consulta';
  }
  const numPrice = typeof price === 'number' ? price : Number(price ?? 0);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numPrice);
}
