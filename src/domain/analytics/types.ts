export interface OperatorPickingMetrics {
  operator_id: string
  operator_name: string
  organization_id: string
  total_orders: number
  average_picking_time_minutes: number
  completed_orders: number
}

export interface OrganizationEfficiencyMetrics {
  organization_id: string
  total_pick_lists: number
  items_requested: number
  items_picked: number
  items_with_exceptions: number
  efficiency_percentage: number
}

export interface StockExceptionMetrics {
  organization_id: string
  product_id: string
  product_name: string
  exception_type: string
  occurrences: number
}

export interface SLAMetrics {
  organization_id: string
  target_pick_time_minutes: number
  organization_average_time: number
  sla_compliance_percent: number
}

export interface PerformanceScoreResult {
  operatorId: string
  speedScore: number
  precisionScore: number
  finalScore: number
}
