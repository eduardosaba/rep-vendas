import { SLAMetrics } from './types'

export class SLAPolicy {
  static evaluate(metrics: SLAMetrics): { status: 'CRITICAL' | 'WARNING' | 'HEALTHY', message: string } {
    if (metrics.sla_compliance_percent >= 95) {
      return { status: 'HEALTHY', message: 'Operação dentro da meta.' }
    }
    
    if (metrics.sla_compliance_percent >= 80) {
      return { status: 'WARNING', message: 'Operação próxima do limite da meta.' }
    }

    return { status: 'CRITICAL', message: 'Tempo médio de separação excedendo a meta.' }
  }
}
