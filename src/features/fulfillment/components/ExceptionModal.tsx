'use client'

import { useState } from 'react'
import { PickingExceptionType } from '@/domain/fulfillment/types'
import { registerException } from '@/actions/fulfillment/register-exception'

interface ExceptionModalProps {
  pickListId: string
  sessionId: string
  productId: string
  productName: string
  onClose: () => void
  onSuccess: () => void
}

export function ExceptionModal({ pickListId, sessionId, productId, productName, onClose, onSuccess }: ExceptionModalProps) {
  const [type, setType] = useState<PickingExceptionType>(PickingExceptionType.MISSING_STOCK)
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await registerException(pickListId, sessionId, productId, type, description)
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar exceção')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Registrar Divergência</h2>
          <p className="text-sm text-gray-500">Produto: {productName}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && <div className="p-3 bg-red-100 text-red-700 text-sm rounded">{error}</div>}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value as PickingExceptionType)}
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value={PickingExceptionType.MISSING_STOCK}>Sem estoque</option>
              <option value={PickingExceptionType.DAMAGED}>Avaria / Danificado</option>
              <option value={PickingExceptionType.WRONG_ITEM}>Produto Errado na Gaveta</option>
              <option value={PickingExceptionType.OTHER}>Outro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observação (Opcional)</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Descreva o problema encontrado..."
            />
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <button 
              type="button" 
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-red-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {loading ? 'Registrando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
