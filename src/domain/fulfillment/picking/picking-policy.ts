import { PickList, PickingExceptionType } from '../types'

export class PickingPolicy {
  
  /**
   * Valida se uma Pick List pode ser completada.
   * Regra: Ou a quantidade separada bate com a solicitada (para todos os itens),
   * ou existe uma exceção validada para a quebra de estoque.
   */
  static canComplete(pickList: PickList): boolean {
    if (!pickList.items || pickList.items.length === 0) {
      return false
    }

    for (const item of pickList.items) {
      // Se a quantidade não bateu, deve haver uma exception justificada para este produto
      if (item.quantity_picked < item.quantity_requested) {
        const hasApprovedException = pickList.exceptions?.some(
          (ex) => ex.product_id === item.product_id && ex.type !== PickingExceptionType.OTHER && ex.status === 'approved'
        )
        if (!hasApprovedException) {
          return false
        }
      }
    }

    return true
  }

}
