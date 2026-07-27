'use client'

import React, { useEffect, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { billContextOrder } from '@/actions/commercial/orders-billing'
import Link from 'next/link'
import { ArrowLeft, Package, Clock, CreditCard, Building2, User, Phone, FileText } from 'lucide-react'

export default function DetalhesPedidoPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = (params?.id as string) || ''

  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [userRole, setUserRole] = useState<string>('user')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadOrderData() {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (prof) setUserRole(prof.role)
      }
      
      // 1. Carrega a cabeceira do pedido e o cliente associado
      const { data: orderData } = await supabase
        .from('orders')
        .select(`
          id, status, total_value, created_at, payment_method, notes, faturado_at, client_name_guest, client_phone_guest, client_cnpj_guest, client_email_guest,
          clients (name, phone, cpf_cnpj, email)
        `)
        .eq('id', orderId)
        .single()

      // 2. Carrega o mix de produtos contidos no pedido
      const { data: itemsData } = await supabase
        .from('order_items')
        .select('id, product_name, product_reference, quantity, unit_price, total_price, brand, image_url, external_image_url')
        .eq('order_id', orderId)

      if (orderData) setOrder(orderData)
      if (itemsData) setItems(itemsData)
      setLoading(false)
    }

    if (orderId) loadOrderData()
  }, [orderId])

  const handleBillOrder = () => {
    if (!window.confirm('Confirma o faturamento desta ordem? O status mudará para Faturado e o saldo de peças sairá do estoque automaticamente.')) return
    setError(null)

    startTransition(async () => {
      const result = await billContextOrder(orderId)
      if (result.success) {
        alert('Pedido faturado e integrado ao estoque com sucesso! 🚀')
        router.push('/distribuidora/pedidos')
        router.refresh()
      } else {
        setError(result.error || null)
      }
    })
  }

  if (loading) return (
    <div className="p-8 max-w-5xl mx-auto flex justify-center items-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
    </div>
  )
  
  if (!order) return <div className="p-8 text-center text-sm text-slate-500">Pedido não encontrado.</div>

  const clientName = order.clients?.name || order.client_name_guest || 'Consumidor (Sem Cadastro)'
  const clientDocument = order.clients?.cpf_cnpj || order.client_cnpj_guest || 'Não Informado'
  const clientPhone = order.clients?.phone || order.client_phone_guest || 'Não Informado'
  const clientEmail = order.clients?.email || order.client_email_guest || 'Não Informado'

  const isCorporate = ['admin', 'master', 'operador'].includes(userRole)
  const canBill = isCorporate && order.status === 'Pendente'

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <header className="flex justify-between items-start border-b border-slate-200 pb-6">
        <div>
          <Link href="/distribuidora/pedidos" className="text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors inline-flex items-center gap-1.5 mb-3">
            <ArrowLeft className="w-4 h-4" /> Voltar para a fila
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800">Pedido #{order.id.substring(0, 8).toUpperCase()}</h1>
            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
              order.status === 'Pendente' ? 'bg-amber-100 text-amber-700 border-amber-200' :
              order.status === 'Aprovado' ? 'bg-blue-100 text-blue-700 border-blue-200' :
              order.status === 'Faturado' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
              order.status === 'Cancelado' ? 'bg-rose-100 text-rose-700 border-rose-200' :
              'bg-slate-100 text-slate-500 border-slate-200'
            }`}>
              {order.status || 'Pendente'}
            </span>
          </div>
          <p className="text-sm text-slate-500 font-mono mt-2 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" /> 
            Emitido em: {new Date(order.created_at).toLocaleString('pt-BR')}
          </p>
        </div>

        {canBill && (
          <button
            onClick={handleBillOrder}
            disabled={isPending}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-sm py-2.5 px-5 rounded-lg shadow-sm transition-all"
          >
            {isPending ? 'Processando...' : 'Autorizar e Faturar'}
          </button>
        )}
      </header>

      {error && <div className="p-3 bg-rose-50 text-rose-800 text-sm rounded-lg border border-rose-100">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lado Esquerdo: Itens e Mix do Pedido */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center gap-2">
              <Package className="w-5 h-5 text-slate-400" />
              <h2 className="font-bold text-sm text-slate-700 uppercase tracking-wider">Mix de Produtos Comprados</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase bg-slate-50/30">
                    <th className="p-4">Produto</th>
                    <th className="p-4 text-center">Qtd</th>
                    <th className="p-4 text-right">Unitário</th>
                    <th className="p-4 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/40">
                      <td className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded flex-shrink-0 p-1">
                           {(item.image_url || item.external_image_url) ? (
                             <img src={item.image_url || item.external_image_url} alt={item.product_name} className="w-full h-full object-contain" />
                           ) : (
                             <div className="w-full h-full bg-slate-100 rounded flex items-center justify-center">
                               <Package className="w-4 h-4 text-slate-300" />
                             </div>
                           )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{item.product_name}</div>
                          <div className="font-mono text-xs text-slate-500 mt-0.5">{item.product_reference || 'Ref N/A'} • {item.brand || 'Marca N/A'}</div>
                        </div>
                      </td>
                      <td className="p-4 text-center font-bold text-slate-900">{item.quantity} un</td>
                      <td className="p-4 text-right text-slate-500">
                        {parseFloat(item.unit_price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="p-4 text-right font-bold text-slate-900">
                        {parseFloat(item.total_price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {order.notes && (
            <div className="bg-amber-50/50 p-5 rounded-xl border border-amber-200 text-sm text-amber-900 flex gap-3">
              <div className="bg-amber-100 text-amber-600 rounded p-2 flex-shrink-0 h-fit">
                 <FileText className="w-5 h-5" />
              </div>
              <div>
                <strong className="block text-amber-800 mb-1">Observações da Venda:</strong>
                <p className="text-amber-700 leading-relaxed">{order.notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Lado Direito: Dados da Ótica Compradora e Condições */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200/60 shadow-sm space-y-6">
            
            <div>
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Cliente / Ótica
              </h3>
              <p className="text-base font-bold text-slate-800">{clientName}</p>
              <div className="mt-3 space-y-2 text-sm">
                <p className="flex items-center gap-2 text-slate-600">
                   <User className="w-4 h-4 text-slate-400" /> <span className="font-mono text-xs">{clientDocument}</span>
                </p>
                <p className="flex items-center gap-2 text-slate-600">
                   <Phone className="w-4 h-4 text-slate-400" /> <span>{clientPhone}</span>
                </p>
              </div>
            </div>

            <hr className="border-slate-100" />

            <div>
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Condições Comerciais
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Pagamento:</span>
                  <span className="font-semibold text-slate-700 uppercase font-mono text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                    {order.payment_method || 'Não Info'}
                  </span>
                </div>
                {order.faturado_at && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Faturado em:</span>
                    <span className="font-medium text-slate-700 font-mono text-xs">
                      {new Date(order.faturado_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <hr className="border-slate-100" />

            <div className="pt-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Valor Líquido Total</p>
              <p className="text-3xl font-black text-slate-900">
                {parseFloat(order.total_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
