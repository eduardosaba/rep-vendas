import React from 'react'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FileText, Clock, CheckCircle2, DollarSign } from 'lucide-react'

interface PageProps {
  searchParams: {
    status?: string
    q?: string
  }
}

export default async function FilaPedidosPage({ searchParams }: PageProps) {
  const supabase = await createClient()

  // 1. Resolve a sessão e o perfil do operador logado
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <div className="p-8 text-slate-500">Sessão expirada.</div>

  // Inclui company_id para legado, organization_id para novo
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, company_id, role, name')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return <div className="p-8 text-slate-500">Perfil comercial não localizado.</div>
  }

  // Identifica o escopo corporativo
  const isCorporate = ['admin', 'master', 'operador'].includes(profile.role)
  const statusFilter = searchParams.status || 'all'

  // 2. Monta a query com Joins baseados na auditoria real
  let ordersQuery = supabase
    .from('orders')
    .select(`
      id,
      status,
      total_value,
      created_at,
      client_id,
      company_id,
      user_id,
      client_name_guest,
      clients (id, name, phone, cpf_cnpj)
    `)

  // Filtro de isolamento de dados (Multi-tenancy)
  if (isCorporate) {
    // Adapter de tenant: suporte tanto para company_id quanto organization_id
    const tenantId = profile.organization_id || profile.company_id
    if (tenantId) {
      // Como o banco real tem company_id em orders, filtramos por ele. 
      // Se tivéssemos organization_id lá, faríamos um OR.
      ordersQuery = ordersQuery.eq('company_id', tenantId)
    }
  } else {
    // Representante individual
    ordersQuery = ordersQuery.eq('user_id', user.id)
  }

  // Aplicação do filtro por estado
  if (statusFilter !== 'all') {
    ordersQuery = ordersQuery.eq('status', statusFilter)
  }

  const { data: orders } = await ordersQuery.order('created_at', { ascending: false })

  // 3. Agregações analíticas rápidas de tela
  const totalOrders = orders?.length || 0
  const totalRevenue = orders?.filter(o => o.status !== 'Cancelado' && o.status !== 'Cancelled').reduce((acc, o) => acc + (parseFloat(o.total_value as any) || 0), 0) || 0
  const pendingOrders = orders?.filter(o => ['Pendente', 'PENDING', 'Em Análise', 'Aguardando'].includes(o.status)).length || 0

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Fila de Pedidos B2B</h1>
          <p className="text-sm text-slate-500">
            {isCorporate 
              ? 'Central de faturamento: gerencie vendas e monitore a operação.' 
              : 'Meus blocos de pedidos emitidos.'}
          </p>
        </div>
      </header>

      {/* Cards Analíticos de Venda */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/60 shadow-sm flex gap-4 items-center">
          <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-lg flex items-center justify-center shrink-0">
             <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Volume</p>
            <p className="text-xl font-bold text-slate-800 mt-0.5">{totalOrders}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/60 shadow-sm flex gap-4 items-center">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
             <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Pendentes</p>
            <p className="text-xl font-bold text-slate-800 mt-0.5">{pendingOrders}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/60 shadow-sm flex gap-4 items-center">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
             <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Prontos</p>
            <p className="text-xl font-bold text-slate-800 mt-0.5">{totalOrders - pendingOrders}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/60 shadow-sm flex gap-4 items-center">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
             <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Faturamento</p>
            <p className="text-xl font-bold text-slate-800 mt-0.5">
              {totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      </div>

      {/* Filtros por URL */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex gap-2 overflow-x-auto">
        {['all', 'Pendente', 'Aprovado', 'Faturado', 'Cancelado'].map((status) => {
          const isActive = statusFilter === status
          return (
            <Link
              key={status}
              href={`/distribuidora/pedidos?status=${status}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                isActive ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {status === 'all' ? 'Ver Todos' : status}
            </Link>
          )
        })}
      </div>

      {/* Tabela de Ordens do Banco */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="p-4">Data</th>
                <th className="p-4">Pedido</th>
                <th className="p-4">Cliente / Ótica</th>
                <th className="p-4">Valor Total</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
              {orders && orders.length > 0 ? (
                orders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="p-4 text-xs text-slate-500 font-mono">
                      {new Date(order.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-4 font-mono text-xs font-bold text-slate-700">
                      #{order.id.substring(0, 8).toUpperCase()}
                    </td>
                    <td className="p-4">
                      {/* Tratativa cuidadosa com clientes cadastrados ou guest */}
                      <div className="font-bold text-slate-800">
                        {order.clients?.name || order.client_name_guest || 'Consumidor (Sem Cadastro)'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {order.clients?.cpf_cnpj ? `CNPJ/CPF: ${order.clients.cpf_cnpj}` : 'CNPJ/CPF Não Informado'}
                      </div>
                    </td>
                    <td className="p-4 font-bold text-slate-900">
                      {parseFloat(order.total_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                        order.status === 'Pendente' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                        order.status === 'Aprovado' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                        order.status === 'Faturado' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                        order.status === 'Cancelado' ? 'bg-rose-100 text-rose-700 border-rose-200' :
                        'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {order.status || 'Pendente'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/distribuidora/pedidos/detalhes/${order.id}`}
                        className="text-slate-600 hover:text-blue-600 font-medium text-xs border border-slate-200 bg-white rounded px-3 py-1.5 shadow-sm hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5"
                      >
                        Ver Detalhes
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400 text-sm">
                    Nenhum pedido localizado com os filtros atuais.
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
