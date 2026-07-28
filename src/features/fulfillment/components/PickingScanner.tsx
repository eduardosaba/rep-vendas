'use client'

import { useState, useRef, useEffect } from 'react'
import { PickList, PickListItem } from '@/domain/fulfillment/types'
import { confirmItem } from '@/actions/fulfillment/confirm-item'
import { completePicking } from '@/actions/fulfillment/complete-picking'
import { ExceptionModal } from './ExceptionModal'

interface PickingScannerProps {
  pickList: PickList
  sessionId: string
  settings: {
    blind_picking_enabled: boolean
    require_barcode_scan: boolean
    allow_manual_quantity: boolean
  }
  onComplete: () => void
}

export function PickingScanner({ pickList, sessionId, settings, onComplete }: PickingScannerProps) {
  const [activeItemIndex, setActiveItemIndex] = useState(0)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [quantityInput, setQuantityInput] = useState<number>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showExceptionModal, setShowExceptionModal] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)

  const pendingItems = pickList.items.filter(i => i.status === 'pending')
  const activeItem = pendingItems[activeItemIndex]

  // Foco automático agressivo para leitores Bluetooth
  useEffect(() => {
    if (!showExceptionModal && inputRef.current) {
      inputRef.current.focus()
    }
  }, [activeItemIndex, showExceptionModal, activeItem])

  const handleConfirm = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!activeItem) return

    setLoading(true)
    setError('')
    try {
      await confirmItem(
        pickList.id, 
        sessionId, 
        activeItem.product_id!, 
        quantityInput, 
        settings.require_barcode_scan ? barcodeInput : undefined
      )
      
      // Avança na fila local
      setBarcodeInput('')
      setQuantityInput(1)
      if (activeItemIndex < pendingItems.length - 1) {
        setActiveItemIndex(prev => prev + 1)
      } else {
        // Se era o último, recarrega a página ou checa se dá pra finalizar
        tryToComplete()
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao conferir item')
      if (inputRef.current) inputRef.current.focus()
    } finally {
      setLoading(false)
    }
  }

  const tryToComplete = async () => {
    setLoading(true)
    try {
      await completePicking(pickList.id, sessionId)
      onComplete()
    } catch (err: any) {
      setError(err.message || 'Não foi possível finalizar. Faltam itens ou aprovação de exceções.')
    } finally {
      setLoading(false)
    }
  }

  const handleExceptionSuccess = () => {
    setShowExceptionModal(false)
    setBarcodeInput('')
    setQuantityInput(1)
    if (activeItemIndex < pendingItems.length - 1) {
      setActiveItemIndex(prev => prev + 1)
    } else {
      tryToComplete()
    }
  }

  if (pendingItems.length === 0) {
    return (
      <div className="p-6 text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Todos os itens conferidos!</h3>
        <button 
          onClick={tryToComplete}
          disabled={loading}
          className="w-full bg-green-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-700"
        >
          {loading ? 'Finalizando...' : 'Concluir Separação'}
        </button>
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header Info */}
      <div className="bg-gray-800 text-white p-4">
        <div className="text-sm text-gray-300">Pedido #{pickList.order_id.split('-')[0]}</div>
        {!settings.blind_picking_enabled && (
          <div className="text-sm mt-1">Item {activeItemIndex + 1} de {pendingItems.length}</div>
        )}
      </div>

      {/* Item Display */}
      <div className="p-6">
        <div className="mb-6">
          <div className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-1">Localização</div>
          <div className="text-3xl font-black text-gray-900 tracking-tight">
            {activeItem.location_code || 'Geral'}
          </div>
        </div>

        <div className="mb-6">
          <div className="text-xs font-bold text-gray-500 uppercase mb-1">Produto Esperado</div>
          <div className="text-xl font-semibold text-gray-800">{activeItem.product_name_snapshot}</div>
          {activeItem.sku_snapshot && (
            <div className="text-sm text-gray-500 mt-1">SKU: {activeItem.sku_snapshot}</div>
          )}
          {!settings.blind_picking_enabled && (
            <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Faltam {activeItem.quantity_requested - activeItem.quantity_picked} unidades
            </div>
          )}
        </div>

        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded">{error}</div>}

        {/* Form Inputs */}
        <form onSubmit={handleConfirm} className="space-y-4">
          {settings.require_barcode_scan && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código de Barras</label>
              <input
                ref={inputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="w-full border-2 border-indigo-300 rounded-lg p-3 text-lg focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Escaneie o produto..."
                autoFocus
              />
            </div>
          )}

          {settings.allow_manual_quantity && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade Separada</label>
              <div className="flex items-center space-x-3">
                <button type="button" onClick={() => setQuantityInput(Math.max(1, quantityInput - 1))} className="p-3 bg-gray-100 rounded-lg font-bold text-xl w-12 h-12 flex items-center justify-center hover:bg-gray-200">-</button>
                <input
                  type="number"
                  min="1"
                  value={quantityInput}
                  onChange={(e) => setQuantityInput(parseInt(e.target.value) || 1)}
                  className="flex-1 border-gray-300 rounded-lg p-3 text-center text-xl font-bold focus:border-indigo-500 focus:ring-indigo-500"
                />
                <button type="button" onClick={() => setQuantityInput(quantityInput + 1)} className="p-3 bg-gray-100 rounded-lg font-bold text-xl w-12 h-12 flex items-center justify-center hover:bg-gray-200">+</button>
              </div>
            </div>
          )}

          <div className="pt-4 space-y-3">
            <button
              type="submit"
              disabled={loading || (settings.require_barcode_scan && !barcodeInput)}
              className="w-full bg-indigo-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Conferindo...' : 'Confirmar Item'}
            </button>
            <button
              type="button"
              onClick={() => setShowExceptionModal(true)}
              className="w-full bg-white text-red-600 border border-red-200 py-3 rounded-lg font-medium hover:bg-red-50"
            >
              Registrar Divergência
            </button>
          </div>
        </form>
      </div>

      {showExceptionModal && (
        <ExceptionModal
          pickListId={pickList.id}
          sessionId={sessionId}
          productId={activeItem.product_id!}
          productName={activeItem.product_name_snapshot}
          onClose={() => setShowExceptionModal(false)}
          onSuccess={handleExceptionSuccess}
        />
      )}
    </div>
  )
}
