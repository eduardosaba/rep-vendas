'use client'

import React from 'react'
import { BrandButton } from '@/components/ui/brand/BrandButton'
import { useDraftCart } from '../use-draft-cart'

interface ProductAddButtonProps {
  productId: string
}

export function ProductAddButton({ productId }: ProductAddButtonProps) {
  const { executeAddItem, isLoading } = useDraftCart()

  return (
    <BrandButton 
      variant="primary" 
      onClick={() => executeAddItem(productId, 1)}
      disabled={isLoading}
      className="w-full sm:w-auto text-center font-bold"
    >
      + Adicionar pré-venda
    </BrandButton>
  )
}
