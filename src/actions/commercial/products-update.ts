'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface UpdateProductInput {
  id: string
  name: string
  referenceCode: string
  brand: string
  category: string
  gender: string
  material: string
  colecao: string
  colorNome: string
  price: number
  stockQuantity: number
  isActive: boolean
}

export async function updateContextProduct(input: UpdateProductInput) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Sessão expirada. Faça login novamente.' }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) return { success: false, error: 'Perfil não encontrado.' }

    const updateData = {
      name: input.name,
      reference_code: input.referenceCode || null,
      brand: input.brand || null,
      category: input.category || null,
      gender: input.gender || 'Unissex',
      material: input.material || null,
      colecao: input.colecao || null,
      color_nome: input.colorNome || null,
      price: input.price,
      stock_quantity: input.stockQuantity,
      is_active: input.isActive,
      updated_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', input.id)
      .eq('organization_id', profile.organization_id)

    if (error) throw error

    revalidatePath('/distribuidora/produtos')
    revalidatePath(`/distribuidora/produtos/editar/${input.id}`)

    return { success: true }
  } catch (error: any) {
    console.error('[Update Product Error]:', error.message)
    return { success: false, error: 'Falha ao atualizar o produto no catálogo.' }
  }
}
