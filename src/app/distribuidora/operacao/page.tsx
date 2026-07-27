import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BusinessPermission } from '@/domain/auth/permissions'
import { PickingStatus, PickList } from '@/domain/fulfillment/types'
import Link from 'next/link'

export default async function OperacaoLogisticaPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id, permissions, role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const hasPermission = (profile.permissions || []).includes(BusinessPermission.VIEW_FULFILLMENT)
  if (!hasPermission && profile.role !== 'master') {
    return <div className="p-8 text-center text-red-600">Acesso negado à Operação Logística.</div>
  }

  // Fetch active pick lists
  const { data: pickListsData } = await supabase
    .from('pick_lists')
    .select('*, items:pick_list_items(quantity_requested, quantity_picked), operator:profiles!assigned_to(full_name)')
    .eq('organization_id', profile.organization_id)
    .in('status', ['CREATED', 'ASSIGNED', 'PICKING', 'CHECKING', 'BLOCKED'])
    .order('created_at', { ascending: true })

  const pickLists = pickListsData || []

  const columnNovos = pickLists.filter((p: any) => p.status === PickingStatus.CREATED)
  const columnSeparando = pickLists.filter((p: any) => [PickingStatus.ASSIGNED, PickingStatus.PICKING].includes(p.status as PickingStatus))
  const columnConferencia = pickLists.filter((p: any) => p.status === PickingStatus.CHECKING)
  const columnBloqueados = pickLists.filter((p: any) => p.status === PickingStatus.BLOCKED)

  const renderCard = (pl: any) => {
    const totalItems = pl.items?.reduce((acc: number, curr: any) => acc + curr.quantity_requested, 0) || 0
    const pickedItems = pl.items?.reduce((acc: number, curr: any) => acc + curr.quantity_picked, 0) || 0
    const progress = totalItems > 0 ? Math.round((pickedItems / totalItems) * 100) : 0

    return (
      <div key={pl.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-3 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-2">
          <span className="text-sm font-bold text-gray-900">Pedido #{pl.order_id.split('-')[0]}</span>
          {pl.status === 'BLOCKED' && <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded">Divergência</span>}
        </div>
        
        <div className="text-sm text-gray-500 mb-3">
          {totalItems} itens no total
        </div>

        {pl.operator && (
          <div className="text-xs text-gray-600 mb-2 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            {pl.operator.full_name}
          </div>
        )}

        {(pl.status === 'PICKING' || pl.status === 'CHECKING') && (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
            <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
        )}

        <div className="mt-3">
           {/* Placeholder para Link da Tela de Operação */}
           <Link href={`/distribuidora/operacao/${pl.id}`} className="text-indigo-600 text-sm font-medium hover:text-indigo-800">
             Abrir Separação &rarr;
           </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-64px)] flex flex-col">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operação Logística (WMS)</h1>
          <p className="text-gray-500 text-sm">Fila de separação e conferência de pedidos</p>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="flex space-x-6 min-w-max h-full pb-4">
          
          {/* COLUNA NOVOS */}
          <div className="w-80 flex flex-col bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-700">NOVOS</h2>
              <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">{columnNovos.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {columnNovos.map(renderCard)}
            </div>
          </div>

          {/* COLUNA EM SEPARAÇÃO */}
          <div className="w-80 flex flex-col bg-indigo-50 rounded-xl p-4 border border-indigo-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-indigo-900">EM SEPARAÇÃO</h2>
              <span className="bg-indigo-200 text-indigo-800 text-xs font-bold px-2 py-1 rounded-full">{columnSeparando.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {columnSeparando.map(renderCard)}
            </div>
          </div>

          {/* COLUNA CONFERÊNCIA */}
          <div className="w-80 flex flex-col bg-yellow-50 rounded-xl p-4 border border-yellow-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-yellow-900">CONFERÊNCIA</h2>
              <span className="bg-yellow-200 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full">{columnConferencia.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {columnConferencia.map(renderCard)}
            </div>
          </div>

          {/* COLUNA BLOQUEADOS */}
          <div className="w-80 flex flex-col bg-red-50 rounded-xl p-4 border border-red-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-red-900">BLOQUEADOS (Divergência)</h2>
              <span className="bg-red-200 text-red-800 text-xs font-bold px-2 py-1 rounded-full">{columnBloqueados.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {columnBloqueados.map(renderCard)}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
