import { createClient } from '@/lib/supabase/server'
import { 
  OperatorPickingMetrics, 
  OrganizationEfficiencyMetrics, 
  StockExceptionMetrics, 
  SLAMetrics 
} from './types'

export class OperationalAnalytics {
  
  static async getOperatorRanking(organizationId: string): Promise<OperatorPickingMetrics[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('operator_picking_metrics')
      .select('*')
      .eq('organization_id', organizationId)
      .order('completed_orders', { ascending: false })

    if (error) throw error
    return data as OperatorPickingMetrics[]
  }

  static async getDailyEfficiency(organizationId: string): Promise<OrganizationEfficiencyMetrics> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('organization_efficiency_metrics')
      .select('*')
      .eq('organization_id', organizationId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data as OrganizationEfficiencyMetrics || {
      organization_id: organizationId,
      total_pick_lists: 0,
      items_requested: 0,
      items_picked: 0,
      items_with_exceptions: 0,
      efficiency_percentage: 100
    }
  }

  static async getTopExceptions(organizationId: string): Promise<StockExceptionMetrics[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('stock_exception_metrics')
      .select('*')
      .eq('organization_id', organizationId)
      .limit(5)

    if (error) throw error
    return data as StockExceptionMetrics[]
  }

  static async getSLA(organizationId: string): Promise<SLAMetrics> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('sla_metrics')
      .select('*')
      .eq('organization_id', organizationId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data as SLAMetrics || {
      organization_id: organizationId,
      target_pick_time_minutes: 45,
      organization_average_time: 0,
      sla_compliance_percent: 100
    }
  }
}
