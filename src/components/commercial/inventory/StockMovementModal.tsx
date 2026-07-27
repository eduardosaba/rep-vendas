'use client'

import React, { useState, useTransition } from 'react'
import { registerStockMovement } from '@/actions/commercial/inventory'
import { X, ArrowUpRight, ArrowDownRight, RefreshCw, AlertTriangle, FileText } from 'lucide-react'

interface StockMovementModalProps {
  isOpen: boolean
  onClose: () => void
  product: {
    id: string
    name: string
    reference_code: string
    stock_quantity: number
  } | null
}

export default function StockMovementModal({ isOpen, onClose, product }: StockMovementModalProps) {
  const [isPending, startTransition] = useTransition()
  const [type, setType] = useState<'ENTRY' | 'SALE' | 'RESERVE' | 'CANCEL' | 'ADJUSTMENT'>('ENTRY')
  const [quantity, setQuantity] = useState('1')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  
  if (!isOpen || !product) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const qty = parseInt(quantity)
    if (isNaN(qty) || qty <= 0) {
      setError('A quantidade deve ser maior que zero.')
      return
    }

    // Saídas (SALE, RESERVE, ADJUSTMENT se negativo) precisam ter sinal ajustado
    let finalQty = qty
    if (type === 'SALE' || type === 'RESERVE') {
      finalQty = -qty
    } else if (type === 'ADJUSTMENT') {
      // Para ajuste, vamos simplificar que a pessoa informa a quantidade a adicionar/remover
      // Idealmente seria o "novo saldo", mas o RPC pede o delta. Vamos manter o delta.
      // A UI poderia ter um botão +/-
    }

    startTransition(async () => {
      const result = await registerStockMovement({
        productId: product.id,
        quantity: finalQty,
        type,
        reason
      })

      if (result.success) {
        setQuantity('1')
        setReason('')
        onClose()
      } else {
        setError(result.error || null)
      }
    })
  }

  const typeConfig = {
    ENTRY: { label: 'Entrada Fio', icon: ArrowUpRight, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    SALE: { label: 'Baixa / Venda', icon: ArrowDownRight, color: 'text-blue-600', bg: 'bg-blue-100' },
    RESERVE: { label: 'Reserva', icon: FileText, color: 'text-amber-600', bg: 'bg-amber-100' },
    CANCEL: { label: 'Cancelamento / Devolução', icon: RefreshCw, color: 'text-rose-600', bg: 'bg-rose-100' },
    ADJUSTMENT: { label: 'Ajuste Físico (Balanço)', icon: AlertTriangle, color: 'text-slate-600', bg: 'bg-slate-100' }
  }

  const ActiveIcon = typeConfig[type].icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Nova Movimentação de Estoque</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && <div className="p-3 bg-rose-50 text-rose-800 text-sm rounded-lg border border-rose-100 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5"/> {error}</div>}
          
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Produto Selecionado</p>
            <p className="font-bold text-slate-800">{product.name}</p>
            <div className="flex gap-4 mt-2">
              <span className="text-sm text-slate-600 font-mono">Ref: {product.reference_code}</span>
              <span className="text-sm text-slate-600">Saldo Atual: <strong className="text-slate-800">{product.stock_quantity || 0}</strong> un</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-2 block uppercase tracking-wider">Tipo de Movimentação</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(typeConfig) as Array<keyof typeof typeConfig>).map((key) => {
                   const { label, color, bg } = typeConfig[key]
                   return (
                     <button
                       key={key}
                       type="button"
                       onClick={() => setType(key)}
                       className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                         type === key 
                           ? `border-${color.split('-')[1]}-300 ${bg} ${color}`
                           : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                       }`}
                     >
                       {label}
                     </button>
                   )
                })}
              </div>
            </div>

            <div className="flex gap-4">
               <div className="w-1/3">
                 <label className="text-xs font-bold text-slate-700 mb-2 block uppercase tracking-wider">Quant. (Δ)</label>
                 <input 
                   type="number" 
                   min="1"
                   required
                   value={quantity}
                   onChange={e => setQuantity(e.target.value)}
                   className="w-full border border-slate-200 rounded-lg p-3 text-lg font-bold outline-none focus:border-blue-400"
                 />
               </div>
               <div className="flex-1">
                 <label className="text-xs font-bold text-slate-700 mb-2 block uppercase tracking-wider">Motivo / Obs (Opcional)</label>
                 <input 
                   type="text"
                   value={reason}
                   onChange={e => setReason(e.target.value)}
                   placeholder="Ex: NF 1234, Devolução Cliente X"
                   className="w-full border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-blue-400"
                 />
               </div>
            </div>

            {/* Aviso visual do impacto */}
            <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-500 flex items-center gap-2">
              <ActiveIcon className={`w-4 h-4 ${typeConfig[type].color}`} />
              Esta operação vai <strong>{type === 'ENTRY' || type === 'CANCEL' ? 'adicionar' : type === 'ADJUSTMENT' ? 'ajustar' : 'subtrair'} {quantity || 0} peças</strong> do saldo físico oficial.
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-medium py-2.5 px-6 rounded-lg text-sm transition-all shadow-sm">
              {isPending ? 'Processando...' : 'Confirmar Movimentação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
