import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { resolveCatalogScope } from '@/lib/catalog-scope'
import InventoryDashboard from '@/components/commercial/inventory/InventoryDashboard'
import { Package, Hash, AlertOctagon, TrendingDown } from 'lucide-react'

export default async function EstoquePage() {
  const supabase = await createClient()

  // 1. Autenticação e Perfil
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <div className="p-8 text-slate-500">Sessão expirada.</div>

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) return <div className="p-8 text-slate-500">Perfil não encontrado.</div>

  // 2. Resolve o Escopo de Catálogo
  const scope = resolveCatalogScope(profile, user)

  // 3. Busca o inventário unificado
  let query = supabase
    .from('products')
    .select('id, name, reference_code, brand, stock_quantity, min_stock_level, image_url, gallery_images, image_path, price, cost')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (scope.type === 'BUSINESS') {
    if (!scope.organizationId) return <div className="p-8 text-slate-500">Organização não definida.</div>
    query = query.eq('organization_id', scope.organizationId)
  } else {
    query = query.eq('user_id', user.id)
  }

  const { data: products, error } = await query

  if (error || !products) {
    return <div className="p-8 text-rose-500">Erro ao carregar inventário: {error?.message}</div>
  }

  // 4. Cálculos para o Dashboard Superior
  const totalSkus = products.length
  const totalItems = products.reduce((acc, p) => acc + (p.stock_quantity || 0), 0)
  const totalValue = products.reduce((acc, p) => acc + ((p.stock_quantity || 0) * (p.cost || p.price || 0)), 0)
  const lowStock = products.filter(p => (p.stock_quantity || 0) > 0 && (p.stock_quantity || 0) <= (p.min_stock_level || 5)).length
  const outOfStock = products.filter(p => (p.stock_quantity || 0) <= 0).length

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Estoque Master</h1>
          <p className="text-sm text-slate-500">Gerenciamento logístico e movimentações de saldo.</p>
        </div>
      </header>
      
      {/* Cards Superiores */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/60 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <Hash className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de SKUs</p>
            <p className="text-xl font-bold text-slate-800 mt-0.5">{totalSkus}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/60 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estoque Total (Un)</p>
            <p className="text-xl font-bold text-slate-800 mt-0.5">{totalItems.toLocaleString('pt-BR')}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/60 shadow-sm flex items-center gap-4">
           <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
             <span className="font-bold font-mono">R$</span>
           </div>
           <div>
             <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Valor em Estoque</p>
             <p className="text-xl font-bold text-slate-800 mt-0.5">{totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</p>
           </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-rose-100 shadow-sm flex items-center gap-4 bg-gradient-to-r from-rose-50/50 to-white">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center shrink-0">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider text-rose-700">Ruptura / Crítico</p>
            <p className="text-xl font-bold text-rose-900 mt-0.5">
              {outOfStock} <span className="text-sm font-medium text-rose-600">vazios</span>
            </p>
          </div>
        </div>
      </div>

      <InventoryDashboard products={products} />
    </div>
  )
}
