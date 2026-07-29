import { createClient } from '@/lib/supabase/server'
import { OrganizationSettings, DEFAULT_ORGANIZATION_SETTINGS } from './organization-settings'
import { FeatureKey } from '@/domain/organizations/features'

export class FeatureService {
  /**
   * Carrega as configurações de uma organização. Cria um registro padrão caso não exista.
   */
  static async getSettings(organizationId: string): Promise<OrganizationSettings> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('organization_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .single()

    if (error || !data) {
      const defaultSettings = DEFAULT_ORGANIZATION_SETTINGS(organizationId)
      
      const { data: inserted, error: insertError } = await supabase
        .from('organization_settings')
        .insert(defaultSettings)
        .select('*')
        .single()

      if (insertError || !inserted) {
        console.warn(`[FeatureService] Falha ao criar settings padrão para org ${organizationId}:`, insertError)
        return {
          ...defaultSettings,
          id: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as OrganizationSettings
      }

      return inserted as OrganizationSettings
    }

    // Garante que features_config está parseado corretamente caso venha como string
    let parsedConfig = data.features_config
    if (typeof parsedConfig === 'string') {
      try {
        parsedConfig = JSON.parse(parsedConfig)
      } catch (err) {
        console.error('[FeatureService] Erro ao parsear features_config:', err)
      }
    }

    return {
      ...data,
      features_config: parsedConfig || data.features_config
    } as OrganizationSettings
  }

  /**
   * Atualiza as configurações de uma organização.
   */
  static async updateSettings(
    organizationId: string,
    settings: Partial<OrganizationSettings>
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    const updateData = { ...settings }
    delete updateData.id
    delete updateData.organization_id
    delete updateData.created_at
    updateData.updated_at = new Date().toISOString()

    const { error } = await supabase
      .from('organization_settings')
      .update(updateData)
      .eq('organization_id', organizationId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  }

  /**
   * Verifica se uma feature flag do plano (tier) está habilitada na organização.
   */
  static async isTierFeatureEnabled(organizationId: string, featureKey: FeatureKey): Promise<boolean> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('organization_features')
      .select('enabled')
      .eq('organization_id', organizationId)
      .eq('feature_key', featureKey)
      .single()

    if (error || !data) {
      return false
    }

    return data.enabled
  }

  /**
   * Retorna o modo fiscal configurado para a organização.
   */
  static async getFiscalMode(organizationId: string): Promise<'manual' | 'assisted' | 'automatic'> {
    const settings = await this.getSettings(organizationId)
    const mode = settings.fiscal_mode || 'manual'
    return mode.toLowerCase() as 'manual' | 'assisted' | 'automatic'
  }

  /**
   * Verifica se deve criar a Invoice automaticamente ao finalizar o Picking.
   * Depende tanto da feature flag do plano quanto da regra da distribuidora.
   */
  static async isAutoCreateInvoiceEnabled(organizationId: string): Promise<boolean> {
    const isFeatureActive = await this.isTierFeatureEnabled(organizationId, FeatureKey.AUTO_INVOICE)
    if (!isFeatureActive) return false

    const settings = await this.getSettings(organizationId)
    return settings.auto_create_invoice_on_picking_completed ?? true
  }

  /**
   * Verifica se deve criar o Shipment automaticamente ao emitir a Nota Fiscal.
   * Depende tanto da feature flag do plano quanto da regra da distribuidora.
   */
  static async isAutoCreateShipmentEnabled(organizationId: string): Promise<boolean> {
    const isFeatureActive = await this.isTierFeatureEnabled(organizationId, FeatureKey.SHIPPING)
    if (!isFeatureActive) return false

    const settings = await this.getSettings(organizationId)
    return settings.auto_create_shipment_on_invoice_issued ?? true
  }
}
