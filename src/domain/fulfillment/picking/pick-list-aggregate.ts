import { PickList, PickingStatus, PickListException, PickListItem, PickingExceptionType } from '../types'
import { PickingStateMachine } from './picking-state-machine'
import { PickingPolicy } from './picking-policy'

export class PickListAggregate {
  private constructor(private state: PickList) {}

  static load(state: PickList): PickListAggregate {
    return new PickListAggregate(state)
  }

  // Métodos de alteração de estado (Ações)
  
  canBeAssigned(actorId: string): boolean {
    if (!this.state.locked_by) return true;
    if (this.state.locked_by === actorId) return true;
    
    // Lock expirado (30 minutos)
    if (this.state.locked_at) {
      const lockTime = new Date(this.state.locked_at).getTime()
      const now = new Date().getTime()
      if (now - lockTime > 30 * 60 * 1000) return true
    }
    
    return false;
  }

  assign(operatorId: string): void {
    PickingStateMachine.assertTransition(this.state.status, PickingStatus.ASSIGNED)
    
    if (!this.canBeAssigned(operatorId)) {
      throw new Error('Pick List já está sendo operada por outro estoquista.')
    }
    
    this.state.status = PickingStatus.ASSIGNED
    this.state.assigned_to = operatorId
    this.state.locked_by = operatorId
    this.state.locked_at = new Date().toISOString()
  }

  startPicking(): void {
    PickingStateMachine.assertTransition(this.state.status, PickingStatus.PICKING)
    
    this.state.status = PickingStatus.PICKING
  }

  confirmItem(productId: string, quantity: number, barcode?: string, requireBarcode?: boolean): void {
    // Pode conferir itens tanto no estágio de picking inicial quanto de revisão/checking
    if (this.state.status !== PickingStatus.PICKING && this.state.status !== PickingStatus.CHECKING) {
      throw new Error('Não é possível conferir itens neste status da separação.')
    }

    const item = this.state.items.find(i => i.product_id === productId)
    if (!item) {
      throw new Error('Produto não faz parte desta separação.')
    }

    if (requireBarcode) {
      if (!barcode || (item.barcode_snapshot && barcode !== item.barcode_snapshot)) {
         throw new Error('Código de barras inválido para este produto.')
      }
    }

    item.quantity_picked = quantity
    item.status = item.quantity_picked >= item.quantity_requested ? 'picked' : 'pending'
  }

  registerException(productId: string, type: PickingExceptionType, description: string, operatorId: string): void {
    if (this.state.status !== PickingStatus.PICKING && this.state.status !== PickingStatus.CHECKING) {
      throw new Error('Não é possível registrar divergências neste status.')
    }

    const exception: PickListException = {
      id: crypto.randomUUID(),
      product_id: productId,
      type,
      description,
      created_by: operatorId,
      status: 'pending'
    }

    if (!this.state.exceptions) {
      this.state.exceptions = []
    }
    this.state.exceptions.push(exception)
  }

  approveException(exceptionId: string, supervisorId: string): void {
    const exception = this.state.exceptions?.find(e => e.id === exceptionId)
    if (!exception) {
      throw new Error('Exceção não encontrada.')
    }

    if (exception.status !== 'pending') {
       throw new Error('Exceção já foi avaliada.')
    }

    exception.status = 'approved'
    exception.approved_by = supervisorId
    exception.approved_at = new Date().toISOString()
  }

  complete(): void {
    PickingStateMachine.assertTransition(this.state.status, PickingStatus.COMPLETED)

    if (!PickingPolicy.canComplete(this.state)) {
      throw new Error('Separação bloqueada. Existem itens pendentes sem exceção justificada.')
    }
    
    this.state.status = PickingStatus.COMPLETED
  }
  
  cancel(): void {
    PickingStateMachine.assertTransition(this.state.status, PickingStatus.CANCELLED)
    
    this.state.status = PickingStatus.CANCELLED
  }

  // Acessores
  getState(): PickList {
    // Retorna uma cópia do state
    return JSON.parse(JSON.stringify(this.state))
  }
}
