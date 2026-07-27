import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { approveCreditOverride } from '@/actions/commercial/finance-approval'
import { OrderStatus } from '@/domain/orders/constants'
import Link from 'next/link'

export default async function FilaAprovacoesPage() {
  const supabase = await createClient()

  // 1. Resolve Multi-tenancy corporativo
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, company_id, role')
    .eq('id', user?.id || '')
    .single()

  if (!profile || !['admin', 'master', 'financeiro'].includes(profile.role)) {
    return <div className="p-8 text-slate-500">Acesso restrito à diretoria financeira.</div>
  }

  const tenantId = profile.organization_id || profile.company_id

  // 2. Captura ordens retidas na trava de limite de crédito ou inadimplência
  let query = supabase
    .from('orders')
    .select(`
      id, total_value, created_at, notes, status,
      clients (store_name, name, phone)
    `)
    .eq('status', OrderStatus.WAITING_FINANCE)

  if (tenantId) {
    // Adapter de tenant: suporte ao company_id (legado verificado)
    query = query.eq('company_id', tenantId)
  }

  const { data: blockedOrders } = await query.order('created_at', { ascending: true })

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <header>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/distribuidora/financeiro" className="hover:underline">Financeiro</Link>
          <span>•</span>
          <span className="text-slate-900 font-medium">Fila de Aprovações</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mt-2">Mesas de Análise de Risco</h1>
        <p className="text-sm text-slate-500">Liberte ou cancele pedidos travados automaticamente por estouro de limite de crédito ou inadimplência comercial.</p>
      </header>

      {/* Grid de Ordens Retidas */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="p-4 bg-rose-50/50 border-b border-rose-100 flex items-center justify-between">
          <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">⚠️ Pedidos Sob Suspeita de Crédito / Bloqueados</span>
          <span className="bg-rose-100 text-rose-800 text-xs px-2.5 py-0.5 rounded-full font-bold">{blockedOrders?.length || 0} pendentes</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b">
                <th className="p-4">Pedido</th>
                <th className="p-4">Ótica Cliente</th>
                <th className="p-4">Motivo da Retenção / Notas</th>
                <th className="p-4">Valor Retido</th>
                <th className="p-4 text-right">Ações de Diretoria</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
              {blockedOrders && blockedOrders.length > 0 ? (
                blockedOrders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="p-4 font-mono text-xs">
                      <div className="font-bold text-slate-800">#{order.id.substring(0, 8).toUpperCase()}</div>
                      <div className="text-[10px] text-slate-400">{new Date(order.created_at).toLocaleDateString('pt-BR')}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-900">{order.clients?.store_name || 'Ótica Geral'}</div>
                      <div className="text-xs text-slate-400">📞 {order.clients?.phone || 'Sem contato'}</div>
                    </td>
                    <td className="p-4 max-w-xs">
                      <p className="text-xs text-rose-700 bg-rose-50/50 p-2 rounded border border-rose-100/60 leading-relaxed max-h-24 overflow-y-auto">
                        {order.notes || 'Estouro de limite rotativo padrão do cliente.'}
                      </p>
                    </td>
                    <td className="p-4 font-black text-slate-900">
                      {parseFloat(order.total_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="p-4 text-right space-x-2 whitespace-nowrap">
                      {/* Form de Rejeição / Cancelamento */}
                      <form action={async () => {
                        'use server'
                        await approveCreditOverride(order.id, 'REJECT')
                      }} className="inline-block">
                        <button type="submit" className="border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-700 bg-white text-xs font-semibold py-1.5 px-3 rounded-lg shadow-sm transition-colors">
                          ❌ Cancelar
                        </button>
                      </form>

                      {/* Form de Liberação / Override */}
                      <form action={async () => {
                        'use server'
                        await approveCreditOverride(order.id, 'APPROVE')
                      }} className="inline-block">
                        <button type="submit" className="bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold py-1.5 px-3 rounded-lg shadow-sm transition-colors">
                          ⚡ Liberar Pedido
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400 text-sm">
                    Parabéns! Fila de análise limpa. Nenhum pedido retido por risco de crédito.
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
