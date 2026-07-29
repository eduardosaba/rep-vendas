'use server'

import { createClient } from '@/lib/supabase/server'
import { resolveCommercialPrice } from '../pricing/resolver'

interface CartItemInput {
  productId: string
  quantity: number
}

export interface OrderDraftItem {
  product_id: string
  quantity: number
  unit_price: number
  total_price: number
  brand: string | null
  product_name: string
  reference_code: string | null
}

export interface OrderDraft {
  clientId: string
  items: OrderDraftItem[]
  totalValue: number
}

/**
 * Monta o draft imutável do pedido.
 * Executa as validações, resolve os preços congelados e denormaliza metadados estáticos do produto.
 */
export async function freezeOrderDraft(clientId: string, items: CartItemInput[]): Promise<OrderDraft> {
  const supabase = await createClient()

  let totalValue = 0
  const processedItems: OrderDraftItem[] = []

  // Resolve os preços baseados na política e busca dados da referência no milissegundo do checkout
  for (const item of items) {
    const { data: product } = await supabase
      .from('products')
      .select('name, reference_code, brand, price')
      .eq('id', item.productId)
      .single()

    if (!product) throw new Error(`Referência óptica com ID ${item.productId} não foi localizada no catálogo.`)

    const basePrice = parseFloat(product.price as any || 0)
    
    // Passa o basePrice e o clientId para aplicar as regras de negócio
    const finalUnitPrice = await resolveCommercialPrice({
      productId: item.productId,
      clientId,
      basePrice,
      brand: product.brand
    })

    const finalTotalPrice = finalUnitPrice * item.quantity
    totalValue += finalTotalPrice

    processedItems.push({
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: Number(finalUnitPrice.toFixed(2)),
      total_price: Number(finalTotalPrice.toFixed(2)),
      brand: product.brand,
      product_name: product.name,
      reference_code: product.reference_code
    })
  }

  return {
    clientId,
    items: processedItems,
    totalValue: Number(totalValue.toFixed(2))
  }
}
