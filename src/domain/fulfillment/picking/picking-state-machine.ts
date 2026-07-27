import { PickingStatus } from '../types'

export class PickingStateMachine {
  private static readonly VALID_TRANSITIONS: Record<PickingStatus, PickingStatus[]> = {
    [PickingStatus.CREATED]: [PickingStatus.ASSIGNED, PickingStatus.CANCELLED],
    [PickingStatus.ASSIGNED]: [PickingStatus.PICKING, PickingStatus.CANCELLED, PickingStatus.CREATED], // Volta pra CREATED se desalocar
    [PickingStatus.PICKING]: [PickingStatus.CHECKING, PickingStatus.BLOCKED, PickingStatus.CANCELLED],
    [PickingStatus.CHECKING]: [PickingStatus.COMPLETED, PickingStatus.PICKING, PickingStatus.BLOCKED], // Volta pra PICKING se faltar algo
    [PickingStatus.COMPLETED]: [],
    [PickingStatus.BLOCKED]: [PickingStatus.PICKING, PickingStatus.CANCELLED],
    [PickingStatus.CANCELLED]: []
  }

  static canTransition(current: PickingStatus, target: PickingStatus): boolean {
    const allowed = this.VALID_TRANSITIONS[current]
    return allowed ? allowed.includes(target) : false
  }

  static assertTransition(current: PickingStatus, target: PickingStatus): void {
    if (!this.canTransition(current, target)) {
      throw new Error(`Transição de picking inválida: ${current} -> ${target}`)
    }
  }
}
