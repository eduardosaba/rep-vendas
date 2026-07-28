import { ShipmentStatus } from './types'

export class ShipmentStateMachine {
  private static readonly VALID_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
    [ShipmentStatus.WAITING]: [ShipmentStatus.READY, ShipmentStatus.FAILED],
    [ShipmentStatus.READY]: [ShipmentStatus.DISPATCHED, ShipmentStatus.FAILED],
    [ShipmentStatus.DISPATCHED]: [ShipmentStatus.IN_TRANSIT, ShipmentStatus.FAILED],
    [ShipmentStatus.IN_TRANSIT]: [ShipmentStatus.DELIVERED, ShipmentStatus.RETURNED, ShipmentStatus.FAILED],
    [ShipmentStatus.DELIVERED]: [],
    [ShipmentStatus.FAILED]: [ShipmentStatus.WAITING, ShipmentStatus.READY], // Pode tentar reenviar
    [ShipmentStatus.RETURNED]: []
  }

  static canTransition(current: ShipmentStatus, next: ShipmentStatus): boolean {
    return this.VALID_TRANSITIONS[current]?.includes(next) ?? false
  }

  static assertTransition(current: ShipmentStatus, next: ShipmentStatus): void {
    if (!this.canTransition(current, next)) {
      throw new Error(`Transição de expedição inválida de ${current} para ${next}`)
    }
  }
}
