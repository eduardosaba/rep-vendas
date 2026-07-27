import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { getApplicationContext } from '@/core/context/application-context'
import { BrandCard } from '@/components/ui/brand/BrandCard'
import { BrandButton } from '@/components/ui/brand/BrandButton'
import { ProductAddButton } from '@/features/cart/components/ProductAddButton'
import { getStockStatus } from '@/features/catalog/stock/stock-status'
import Link from 'next/link'

interface PageProps {
  searchParams: {
    q?: string
    brand?: string
    stock?: string
  }
}

export default async function CatalogoDistributoraPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  
  const context = await getApplicationContext()
  if (!context) return null
  
  const tenantId = context.companyId || context.organizationId

  const search = searchParams.q || ''
  const selectedBrand = searchParams.brand || 'all'
  const stockFilter = searchParams.stock || 'all'

  let productQuery = supabase
    .from('products')
    .select('id, name, reference_code, brand, price, stock_quantity, min_stock_level, image_url, is_active')

  if (context.role !== 'superadmin' && tenantId) {
    productQuery = productQuery.or(`organization_id.eq.${tenantId},company_id.eq.${tenantId}`)
  }

  if (search) {
    productQuery = productQuery.or(`name.ilike.%${search}%,reference_code.ilike.%${search}%`)
  }
  if (selectedBrand !== 'all') {
    productQuery = productQuery.eq('brand', selectedBrand)
  }

  const { data: products } = await productQuery.order('brand', { ascending: true })

  const uniqueBrands = Array.from(new Set(products?.map(p => p.brand).filter(Boolean) || []))

  const filteredProducts = products?.filter(p => {
    const minLevel = p.min_stock_level || 5
    const stockStatus = getStockStatus(p.stock_quantity || 0, minLevel)
    
    if (stockFilter === 'critical') return stockStatus === 'critical'
    if (stockFilter === 'available') return stockStatus === 'available'
    return true
  }) || []

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 bg-[var(--brand-background)] text-[var(--brand-text)]">
      
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--brand-border)] pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Catálogo de Produtos</h1>
          <p className="text-sm text-slate-500">Gerencie o portfólio de grifes ópticas, verifique a disponibilidade de armações e monte pré-vendas.</p>
        </div>
        <Link href="/distribuidora/produtos/criar">
          <BrandButton variant="primary">＋ Cadastrar Nova Armação</BrandButton>
        </Link>
      </header>

      <div className="bg-[var(--brand-secondary)] border border-[var(--brand-border)] p-4 rounded-xl shadow-sm flex flex-wrap gap-3 items-center justify-between">
        <form method="GET" className="flex flex-wrap gap-2 items-center w-full lg:w-auto">
          <input 
            type="text" 
            name="q"
            defaultValue={search}
            placeholder="Buscar por modelo ou referência..." 
            className="border border-[var(--brand-border)] bg-[var(--brand-background)] text-[var(--brand-text)] rounded-lg p-2 text-xs outline-none focus:border-slate-400 min-w-[240px] font-medium"
          />

          <select name="brand" defaultValue={selectedBrand} className="border border-[var(--brand-border)] bg-[var(--brand-background)] text-[var(--brand-text)] rounded-lg p-2 text-xs outline-none font-medium">
            <option value="all">Todas as Grifes</option>
            {uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          <select name="stock" defaultValue={stockFilter} className="border border-[var(--brand-border)] bg-[var(--brand-background)] text-[var(--brand-text)] rounded-lg p-2 text-xs outline-none font-medium">
            <option value="all">Todos os Saldos</option>
            <option value="critical">⚠️ Reposição Crítica</option>
            <option value="available">✓ Estoque Seguro</option>
          </select>

          <button type="submit" className="bg-[var(--brand-primary)] text-white text-xs font-semibold py-2 px-4 rounded-lg transition-all hover:opacity-90">
            Filtrar
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => {
            const minLevel = product.min_stock_level || 5
            const stockStatus = getStockStatus(product.stock_quantity || 0, minLevel)

            return (
              <BrandCard key={product.id} className="flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow group relative">
                
                <div className="absolute top-3 right-3 z-10">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border tracking-wider uppercase ${
                    stockStatus === 'out' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                    stockStatus === 'critical' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {stockStatus === 'out' ? 'Zerado' : stockStatus === 'critical' ? 'Baixo Saldo' : 'Disponível'}
                  </span>
                </div>

                <div className="aspect-video bg-slate-50/60 border rounded-lg flex items-center justify-center overflow-hidden p-2 group-hover:bg-slate-50 transition-colors">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="object-contain max-h-full max-w-full transition-transform group-hover:scale-105" />
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium">Sem imagem</span>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                    {product.brand || 'Geral'}
                  </span>
                  <h3 className="font-bold text-sm text-[var(--brand-text)] line-clamp-1 mt-1">{product.name}</h3>
                  <p className="font-mono text-xs text-slate-400 font-bold">Ref: {product.reference_code || 'N/A'}</p>
                </div>

                <div className="pt-2 border-t border-[var(--brand-border)] flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Preço Tabela</p>
                      <p className="font-black text-base text-[var(--brand-text)]">
                        {parseFloat(product.price as any || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-2 w-full">
                    <ProductAddButton productId={product.id} />
                  </div>
                </div>

              </BrandCard>
            )
          })
        ) : (
          <div className="col-span-full bg-[var(--brand-secondary)] border border-[var(--brand-border)] p-12 text-center text-slate-400 rounded-xl text-sm font-medium">
            Nenhuma armação óptica ou grife localizada para os critérios informados.
          </div>
        )}
      </div>
    </div>
  )
}
