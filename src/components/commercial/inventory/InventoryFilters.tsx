'use client'

import React, { useState } from 'react'
import { Search, Filter, SlidersHorizontal, PackageX } from 'lucide-react'

interface InventoryFiltersProps {
  onFilterChange: (filters: { query: string, status: string }) => void
}

export default function InventoryFilters({ onFilterChange }: InventoryFiltersProps) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('ALL')

  const handleApply = () => {
    onFilterChange({ query, status })
  }

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
      <div className="flex-1 flex gap-3 w-full">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por referência, nome ou SKU..." 
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              onFilterChange({ query: e.target.value, status })
            }}
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 bg-slate-50 focus:bg-white transition-colors"
          />
        </div>
        
        <select 
          value={status} 
          onChange={e => {
            setStatus(e.target.value)
            onFilterChange({ query, status: e.target.value })
          }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none bg-white text-slate-600"
        >
          <option value="ALL">Todos os saldos</option>
          <option value="IN_STOCK">Em Estoque (&gt;0)</option>
          <option value="LOW_STOCK">Estoque Baixo</option>
          <option value="OUT_OF_STOCK">Sem Estoque (0)</option>
        </select>
      </div>
      
      <div className="flex items-center gap-2">
        <button className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
          <SlidersHorizontal className="w-4 h-4" /> Filtros Avançados
        </button>
      </div>
    </div>
  )
}
