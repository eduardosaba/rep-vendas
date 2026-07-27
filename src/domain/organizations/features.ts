import { createClient } from '@/lib/supabase/server'

export enum FeatureKey {
  PICKING = 'PICKING',
  OPERATIONAL_ANALYTICS = 'OPERATIONAL_ANALYTICS',
  AUTO_INVOICE = 'AUTO_INVOICE',
  FISCAL_ENGINE = 'FISCAL_ENGINE',
  SHIPPING = 'SHIPPING',
  TRACKING = 'TRACKING'
}

export class FeatureGovernance {
  /**
   * Verifica no banco de dados se uma feature específica está habilitada para a organização.
   */
  static async isFeatureEnabled(organizationId: string, featureKey: FeatureKey): Promise<boolean> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('organization_features')
      .select('enabled')
      .eq('organization_id', organizationId)
      .eq('feature_key', featureKey)
      .single()

    if (error || !data) {
      // Se não houver configuração, o padrão seguro é falso (desativado).
      return false
    }

    return data.enabled
  }

  /**
   * Bloqueia o fluxo caso a feature esteja inativa, disparando um erro.
   */
  static async assertFeatureEnabled(organizationId: string, featureKey: FeatureKey): Promise<void> {
    const enabled = await this.isFeatureEnabled(organizationId, featureKey)
    if (!enabled) {
      throw new Error(`Acesso negado: O módulo ${featureKey} está desativado para esta organização.`)
    }
  }
}
