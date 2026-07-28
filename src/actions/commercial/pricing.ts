// src/actions/commercial/pricing.ts
'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface PriceResolveInput {
  productId: string
  clientId: string
}

interface PriceResolveOutput {
  priceCents: number
  source: 'custom_table' | 'base_price'
}

/**
 * RESOLVEDOR DE PREÇOS B2B
 * Avalia se o cliente associado possui uma tabela de preços ativa.
 * Caso positivo, busca o valor customizado do produto. Do contrário, retorna o preço base.
 */
export async function resolveProductPrice({
  productId,
  clientId
}: PriceResolveInput): Promise<PriceResolveOutput> {
  try {
    let priceTableId: string | null = null

    // 1. Tenta buscar o price_table_id na tabela 'clients'
    const { data: clientData } = await supabaseAdmin
      .from('clients')
      .select('price_table_id')
      .eq('id', clientId)
      .maybeSingle()

    priceTableId = clientData?.price_table_id

    // 2. Fallback para 'customers' caso sua tabela use essa nomenclatura
    if (!priceTableId) {
      const { data: customerData } = await supabaseAdmin
        .from('customers')
        .select('price_table_id')
        .eq('id', clientId)
        .maybeSingle()
      
      priceTableId = customerData?.price_table_id
    }

    // 3. Se houver uma tabela de preços vinculada, busca o valor específico do item
    if (priceTableId) {
      const { data: customItem } = await supabaseAdmin
        .from('price_table_items')
        .select('price_cents')
        .eq('price_table_id', priceTableId)
        .eq('product_id', productId)
        .maybeSingle()

      if (customItem) {
        return { 
          priceCents: customItem.price_cents, 
          source: 'custom_table' 
        }
      }
    }

    // 4. Fallback padrão: Retorna o preço de cadastro base do produto
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('price_cents') // Assume-se que o preço base do produto é salvo em price_cents
      .eq('id', productId)
      .single()

    if (productError || !product) {
      throw new Error(productError?.message || 'Produto não localizado para obter preço base.')
    }

    return { 
      priceCents: product.price_cents, 
      source: 'base_price' 
    }

  } catch (error: any) {
    console.error('[Pricing Engine Error]:', error.message)
    // Retorna 0 para evitar quebra silenciosa, deixando claro no front que houve falha de precificação
    return { priceCents: 0, source: 'base_price' }
  }
}
