'use client'

import React, { createContext, useContext, useState, useTransition, useCallback } from 'react'
import { addItemToDraft, updateItemQuantity, removeItemFromDraft, updateItemNotes } from './draft-order-service'
import { executeB2BCheckout } from '@/actions/commercial/checkout'

interface DraftCartContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isLoading: boolean;
  error: string | null;
  executeAddItem: (productId: string, quantity?: number) => void;
  executeUpdateQuantity: (itemId: string, quantity: number) => void;
  executeRemoveItem: (itemId: string) => void;
  executeUpdateNotes: (itemId: string, notes: string) => void;
  executeCheckout: (draftId: string, paymentMethodId: string, notes?: string) => Promise<boolean>;
}

const DraftCartContext = createContext<DraftCartContextType | undefined>(undefined)

export function DraftCartProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const executeAddItem = useCallback((productId: string, quantity?: number) => {
    setError(null)
    startTransition(async () => {
      const result = await addItemToDraft({ productId, quantity })
      if (result.success) {
        setIsOpen(true)
      } else {
        setError(result.error || 'Falha ao adicionar item ao rascunho.')
      }
    })
  }, [])

  const executeUpdateQuantity = useCallback((itemId: string, quantity: number) => {
    setError(null)
    startTransition(async () => {
      const result = await updateItemQuantity(itemId, quantity)
      if (!result.success) {
        setError(result.error || 'Falha ao atualizar quantidade.')
      }
    })
  }, [])

  const executeRemoveItem = useCallback((itemId: string) => {
    setError(null)
    startTransition(async () => {
      const result = await removeItemFromDraft(itemId)
      if (!result.success) {
        setError(result.error || 'Falha ao remover item.')
      }
    })
  }, [])

  const executeUpdateNotes = useCallback((itemId: string, notes: string) => {
    setError(null)
    startTransition(async () => {
      const result = await updateItemNotes(itemId, notes)
      if (!result.success) {
        setError(result.error || 'Falha ao salvar observação.')
      }
    })
  }, [])

  const executeCheckout = useCallback(async (draftId: string, paymentMethodId: string, notes?: string) => {
    setError(null)
    const result = await executeB2BCheckout({ draftId, paymentMethodId, notes })
    
    if (!result.success) {
      setError(result.error || 'Falha no checkout comercial.')
      return false
    }

    setIsOpen(false)
    return true
  }, [])

  return (
    <DraftCartContext.Provider value={{
      isOpen,
      setIsOpen,
      isLoading: isPending,
      error,
      executeAddItem,
      executeUpdateQuantity,
      executeRemoveItem,
      executeUpdateNotes,
      executeCheckout
    }}>
      {children}
    </DraftCartContext.Provider>
  )
}

export function useDraftCart() {
  const context = useContext(DraftCartContext)
  if (!context) {
    throw new Error('useDraftCart must be used within a DraftCartProvider')
  }
  return context
}
