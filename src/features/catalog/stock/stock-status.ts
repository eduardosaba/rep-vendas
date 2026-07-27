/**
 * Centraliza a inteligência de avaliação semântica do inventário.
 * Isola componentes de visualização contra mudanças futuras nas regras de alocação física.
 */
export function getStockStatus(stock: number, min: number): 'out' | 'critical' | 'available' {
  if (stock <= 0) {
    return 'out';
  }
  if (stock <= min) {
    return 'critical';
  }
  return 'available';
}
