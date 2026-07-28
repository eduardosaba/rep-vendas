'use client'

import React, { useState } from 'react'
import InventoryFilters from './InventoryFilters'
import StockMovementModal from './StockMovementModal'
import { formatImageUrl } from '@/lib/imageUtils'
import { ArrowRightLeft, ArrowDownToLine, ArrowUpRight } from 'lucide-react'

interface Product {
  id: string
  name: string
  reference_code: string
  brand: string
  stock_quantity: number
  min_stock_level: number
  image_url: string
  gallery_images: any
  image_path: string
}

interface InventoryDashboardProps {
  products: Product[]
}

export default function InventoryDashboard({ products }: InventoryDashboardProps) {
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(products)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleFilterChange = ({ query, status }: { query: string, status: string }) => {
    let filtered = products

    if (query) {
       const q = query.toLowerCase()
       filtered = filtered.filter(p => 
         p.name.toLowerCase().includes(q) || 
         p.reference_code.toLowerCase().includes(q) ||
         (p.brand && p.brand.toLowerCase().includes(q))
       )
    }

    if (status === 'IN_STOCK') {
       filtered = filtered.filter(p => p.stock_quantity > 0)
    } else if (status === 'LOW_STOCK') {
       filtered = filtered.filter(p => p.stock_quantity > 0 && p.stock_quantity <= (p.min_stock_level || 5))
    } else if (status === 'OUT_OF_STOCK') {
       filtered = filtered.filter(p => p.stock_quantity <= 0)
    }

    setFilteredProducts(filtered)
  }

  const openMovementModal = (product: Product) => {
    setSelectedProduct(product)
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <InventoryFilters onFilterChange={handleFilterChange} />

      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="p-4 w-12"></th>
                <th className="p-4">Produto / Modelo</th>
                <th className="p-4 text-center">Físico</th>
                <th className="p-4 text-center">Reservado</th>
                <th className="p-4 text-center">Disponível</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((p) => {
                  // Valores fictícios para reserva no momento
                  const reservado = 0 
                  const disponivel = p.stock_quantity - reservado
                  const isLow = disponivel > 0 && disponivel <= (p.min_stock_level || 5)
                  const isOut = disponivel <= 0
                  const img = formatImageUrl(p.image_path || (p.gallery_images?.[0]?.path) || p.image_url)

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/40 transition-colors group">
                      <td className="p-4">
                        <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center p-1 overflow-hidden">
                           <img src={img} alt={p.name} className="object-contain w-full h-full" />
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                           <span className="font-bold text-slate-800">{p.name}</span>
                           <span className="text-xs text-slate-500 font-mono mt-0.5">{p.reference_code} • {p.brand}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center font-semibold text-slate-700">
                         {p.stock_quantity || 0}
                      </td>
                      <td className="p-4 text-center text-slate-400 text-xs font-mono">
                         {reservado}
                      </td>
                      <td className="p-4 text-center font-bold text-lg text-slate-900">
                         {disponivel}
                      </td>
                      <td className="p-4 text-center">
                         {isOut ? (
                           <span className="bg-rose-100 text-rose-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-rose-200">Ruptura</span>
                         ) : isLow ? (
                           <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-amber-200">Baixo</span>
                         ) : (
                           <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-emerald-200">OK</span>
                         )}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button 
                          onClick={() => openMovementModal(p)}
                          className="text-slate-500 hover:text-blue-600 font-medium text-[11px] border border-slate-200 bg-white rounded px-2.5 py-1.5 shadow-sm hover:bg-slate-50 transition-colors uppercase tracking-wide inline-flex items-center gap-1.5"
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                          Ajustar
                        </button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 text-sm">
                    Nenhum produto encontrado no estoque com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <StockMovementModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedProduct}
      />
    </div>
  )
}
