import React from 'react'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { dispatchContextOrder, deliverContextOrder } from '@/actions/commercial/orders-shipping'

interface PageProps {
  searchParams: {
    tab?: string
  }
}

export default async function ExpedicaoPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const activeTab = searchParams.tab || 'Faturado' // Faturado (Aguardando Separação), Despachado, Entregue

  // 1. Resolve Multi-tenancy
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, company_id, role')
    .eq('id', user?.id || '')
    .single()

  if (!profile) return <div className="p-8 text-slate-500">Acesso negado.</div>

  const isCorporate = ['admin', 'master', 'operador'].includes(profile.role)
  const tenantId = profile.organization_id || profile.company_id

  // 2. Busca ordens dentro da esteira logística
  let query = supabase
    .from('orders')
    .select('id, status, total_value, tracking_code, item_count, faturado_at, despachado_at, clients(store_name, name)')

  if (isCorporate && tenantId) {
    // Compatibilidade com legado via company_id
    query = query.eq('company_id', tenantId)
  } else {
    query = query.eq('user_id', user?.id || '')
  }

  // Filtra de acordo com a aba da esteira
  query = query.eq('status', activeTab)

  const { data: orders } = await query.order('updated_at', { ascending: false })

  // 3. Counts para as abas informativas
  let countsQuery = supabase.from('orders').select('status')
  if (isCorporate && tenantId) countsQuery = countsQuery.eq('company_id', tenantId)
  else countsQuery = countsQuery.eq('user_id', user?.id || '')
  
  const { data: allStatuses } = await countsQuery
  const countAguardando = allStatuses?.filter(o => o.status === 'Faturado').length || 0
  const countDespachados = allStatuses?.filter(o => o.status === 'Despachado').length || 0
  const countEntregues = allStatuses?.filter(o => o.status === 'Entregue').length || 0

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Esteira de Expedição</h1>
        <p className="text-sm text-slate-500">Controle o empacotamento, emissão de códigos de rastreio e acompanhamento de rotas logísticas.</p>
      </header>

      {/* Abas de Navegação / Fases da Esteira */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        {[
          { id: 'Faturado', label: '📦 Aguardando Separação', count: countAguardando },
          { id: 'Despachado', label: '🚚 Em Trânsito / Despachados', count: countDespachados },
          { id: 'Entregue', label: '✅ Entregues', count: countEntregues }
        ].map(tab => (
          <Link
            key={tab.id}
            href={`/distribuidora/expedicao?tab=${tab.id}`}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === tab.id 
                ? 'border-slate-900 text-slate-950' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.label}
            <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
              {tab.count}
            </span>
          </Link>
        ))}
      </div>

      {/* Fila Operacional */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="p-4">Pedido / Data</th>
                <th className="p-4">Ótica Destinatária</th>
                <th className="p-4 text-center">Peças</th>
                <th className="p-4">Valor Ordem</th>
                {activeTab !== 'Faturado' && <th className="p-4">Rastreamento</th>}
                <th className="p-4 text-right">Operação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
              {orders && orders.length > 0 ? (
                orders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-slate-50/40 transition-colors group">
                    <td className="p-4 font-mono text-xs">
                      <div className="font-bold text-slate-700">#{order.id.substring(0, 8).toUpperCase()}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(order.faturado_at || order.despachado_at || Date.now()).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-800">{order.clients?.store_name || 'Consumidor (Sem Cadastro)'}</div>
                      <div className="text-[11px] text-slate-400">{order.clients?.name}</div>
                    </td>
                    <td className="p-4 text-center font-medium">{order.item_count || 0} un</td>
                    <td className="p-4 font-bold text-slate-900">
                      {parseFloat(order.total_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    {activeTab !== 'Faturado' && (
                      <td className="p-4 font-mono text-xs text-slate-600">
                        <span className="bg-blue-50 text-blue-800 px-2.5 py-1 rounded-md border border-blue-200 font-bold">{order.tracking_code || 'N/A'}</span>
                      </td>
                    )}
                    <td className="p-4 text-right">
                      {activeTab === 'Faturado' && (
                        <form action={async (formData) => {
                          'use server'
                          const tracking = formData.get('tracking') as string
                          await dispatchContextOrder({ orderId: order.id, trackingCode: tracking })
                        }} className="flex items-center justify-end gap-2">
                          <input 
                            type="text" 
                            name="tracking"
                            required
                            placeholder="Cód. Rastreio (Ex: SEDEX)"
                            className="border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-slate-400 w-40 font-mono transition-colors"
                          />
                          <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white text-xs px-4 py-2 rounded-lg font-bold transition-all shadow-sm">
                            🚚 Despachar
                          </button>
                        </form>
                      )}

                      {activeTab === 'Despachado' && (
                        <form action={async () => {
                          'use server'
                          await deliverContextOrder(order.id)
                        }}>
                          <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2 rounded-lg font-bold transition-all shadow-sm">
                            ✓ Confirmar Entrega
                          </button>
                        </form>
                      )}

                      {activeTab === 'Entregue' && (
                        <span className="text-xs bg-slate-100 text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg font-medium">
                          Arquivado no Histórico
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400 text-sm">
                    Nenhuma ordem localizada nesta fase da esteira de expedição.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
