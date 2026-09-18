/**
 * Formata o preço do produto conforme a regra de negócio canônica:
 * - Se `price` for maior que 0: sempre exibe o valor formatado em BRL (ex: "R$ 150,00").
 * - Se `price` for <= 0 ou nulo/indefinido: retorna "Sob consulta" (a não ser que `priceOnRequest === false` explicitamente).
 */
export function formatProductPrice(
  price: number | null | undefined,
  priceOnRequest?: boolean | null
): string {
  const numPrice = typeof price === 'number' ? price : Number(price ?? 0);

  if (numPrice <= 0) {
    if (priceOnRequest === false) {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(0);
    }
    return 'Sob consulta';
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numPrice);
}
