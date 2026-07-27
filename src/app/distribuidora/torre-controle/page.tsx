import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BusinessPermission } from '@/domain/auth/permissions'
import { OperationalAnalytics } from '@/domain/analytics/operational-metrics'
import { PerformanceScoreCalculator } from '@/domain/analytics/performance-score'
import { SLAPolicy } from '@/domain/analytics/sla-policy'

export default async function ControlTowerPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id, permissions, role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const hasPermission = (profile.permissions || []).includes(BusinessPermission.VIEW_OPERATIONAL_ANALYTICS)
  if (!hasPermission && profile.role !== 'master') {
    return <div className="p-8 text-center text-red-600">Acesso negado à Torre de Controle.</div>
  }

  const orgId = profile.organization_id

  // Fetch Metrics from Domain
  const efficiency = await OperationalAnalytics.getDailyEfficiency(orgId)
  const sla = await OperationalAnalytics.getSLA(orgId)
  const topExceptions = await OperationalAnalytics.getTopExceptions(orgId)
  const operatorMetrics = await OperationalAnalytics.getOperatorRanking(orgId)

  // Fetch Current Operation Live Status directly for Card 1
  const { data: pickLists } = await supabase
    .from('pick_lists')
    .select('status')
    .eq('organization_id', orgId)
    .in('status', ['CREATED', 'ASSIGNED', 'PICKING', 'CHECKING', 'BLOCKED'])

  const activeOperation = {
    total: pickLists?.length || 0,
    blocked: pickLists?.filter((p: any) => p.status === 'BLOCKED').length || 0,
    inProgress: pickLists?.filter((p: any) => ['ASSIGNED', 'PICKING', 'CHECKING'].includes(p.status)).length || 0
  }

  const slaPolicy = SLAPolicy.evaluate(sla)

  // Calculate scores for ranking
  const operatorScores = operatorMetrics.map(op => {
    // Para simplificar no MVP, a taxa de erro global da org afeta, mas idealmente seria por operador.
    // Usaremos a eficiência geral da org invertida como erro para ilustrar, ou 0 se não tivermos a granularidade ainda.
    const errorRate = 1 - (efficiency.efficiency_percentage / 100) 
    return {
      name: op.operator_name || 'Operador Desconhecido',
      ...PerformanceScoreCalculator.calculate(
        op.operator_id, 
        op.average_picking_time_minutes, 
        sla.target_pick_time_minutes, 
        errorRate
      ),
      orders: op.completed_orders
    }
  }).sort((a, b) => b.finalScore - a.finalScore)

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Torre de Controle</h1>
        <p className="text-gray-500 mt-1">Inteligência Logística e Desempenho Operacional</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Card 1: Operação Hoje */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Operação Agora</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Fila Total Ativa</span>
              <span className="text-2xl font-bold text-gray-900">{activeOperation.total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Em Andamento</span>
              <span className="text-xl font-bold text-indigo-600">{activeOperation.inProgress}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
              <span className="text-gray-600 font-medium">Bloqueados</span>
              <span className={`text-xl font-bold ${activeOperation.blocked > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {activeOperation.blocked}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: SLA & Tempos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">SLA (Separação)</h2>
          <div className="text-3xl font-black text-gray-900 mb-1">
            {sla.organization_average_time.toFixed(1)} <span className="text-lg font-normal text-gray-500">min</span>
          </div>
          <div className="text-sm text-gray-500 mb-4">Meta: {sla.target_pick_time_minutes} min</div>
          
          <div className={`p-3 rounded-md text-sm font-medium ${
            slaPolicy.status === 'HEALTHY' ? 'bg-green-100 text-green-800' :
            slaPolicy.status === 'WARNING' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {slaPolicy.message}
          </div>
        </div>

        {/* Card 3: Alertas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Alertas Críticos</h2>
          <div className="space-y-3">
            {topExceptions.length > 0 ? topExceptions.map((ex, i) => (
              <div key={i} className="flex items-center text-sm">
                <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                <span className="text-gray-700 flex-1 truncate">{ex.product_name || ex.product_id}</span>
                <span className="font-bold text-red-600">{ex.occurrences}x</span>
              </div>
            )) : (
              <div className="text-green-600 text-sm font-medium flex items-center">
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                Nenhuma ruptura recorrente detectada.
              </div>
            )}
            {activeOperation.blocked > 0 && (
              <div className="flex items-center text-sm pt-2 border-t border-gray-100">
                <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                <span className="text-red-700 font-medium">Temos pedidos parados aguardando aprovação.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ranking Operacional */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Ranking Operacional da Equipe</h2>
          <p className="text-sm text-gray-500">Performance balanceada (Velocidade x Precisão)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-200 text-sm text-gray-500">
                <th className="p-4 font-semibold">Posição</th>
                <th className="p-4 font-semibold">Operador</th>
                <th className="p-4 font-semibold">Pedidos Separados</th>
                <th className="p-4 font-semibold">Score de Velocidade</th>
                <th className="p-4 font-semibold">Score Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {operatorScores.map((score, index) => (
                <tr key={score.operatorId} className="hover:bg-gray-50">
                  <td className="p-4">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`}
                  </td>
                  <td className="p-4 font-medium text-gray-900">{score.name}</td>
                  <td className="p-4 text-gray-600">{score.orders}</td>
                  <td className="p-4">
                    <div className="flex items-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                        <div className={`h-2 rounded-full ${score.speedScore >= 90 ? 'bg-green-500' : score.speedScore >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(score.speedScore, 100)}%` }}></div>
                      </div>
                      <span className="text-sm text-gray-600">{score.speedScore}</span>
                    </div>
                  </td>
                  <td className="p-4 font-bold text-indigo-600">{score.finalScore}</td>
                </tr>
              ))}
              {operatorScores.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">Nenhum dado de produtividade disponível.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
