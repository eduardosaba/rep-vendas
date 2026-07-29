'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { resolveCatalogScope } from '@/lib/catalog-scope'

export interface CreateProductInput {
  name: string
  referenceCode: string
  brand: string
  category: string
  gender: string
  price: number
  stockQuantity: number
  
  // Optical attributes
  color_nome?: string
  frame_formato?: string
  material?: string
  material_haste?: string
  colecao?: string
  fotocromatico?: boolean
  polarizado?: boolean
  
  // Commercial attributes
  sale_price?: number
  cost?: number
  sku?: string
}

export async function createContextProduct(input: CreateProductInput) {
  try {
    const supabase = await createClient()

    // 1. Identifica o usuário da sessão ativa e resolve seu perfil
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Sessão expirada. Faça login novamente.' }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return { success: false, error: 'Usuário não encontrado.' }
    }

    // 2. Determina o Ownership baseado no perfil usando o Scope Resolver unificado
    const scope = resolveCatalogScope(profile, user)
    
    const insertData: Record<string, any> = {
      name: input.name,
      reference_code: input.referenceCode || null,
      brand: input.brand || null,
      category: input.category || null,
      gender: input.gender || 'Unissex',
      price: input.price,
      stock_quantity: input.stockQuantity,
      
      color_nome: input.color_nome || null,
      frame_formato: input.frame_formato || null,
      material: input.material || null,
      material_haste: input.material_haste || null,
      colecao: input.colecao || null,
      fotocromatico: input.fotocromatico || false,
      polarizado: input.polarizado || false,
      
      sale_price: input.sale_price || null,
      cost: input.cost || null,
      sku: input.sku || null,

      is_active: true,
      updated_at: new Date().toISOString(),
      
      user_id: scope.userId,
      organization_id: scope.organizationId
    }

    // 3. Executa o insert nativo no banco
    const { error } = await supabase.from('products').insert(insertData)
    if (error) {
      if (error.code === '23505') {
         return { success: false, error: 'Já existe um produto com este código/referência.' }
      }
      throw error
    }

    // 4. Limpa o cache da listagem para renderizar o novo item na hora
    revalidatePath('/distribuidora/produtos')

    return { success: true }

  } catch (error: any) {
    console.error('[Create Product Orchestrator Error]:', error.message)
    return { success: false, error: 'Falha ao salvar o modelo no catálogo.' }
  }
}
