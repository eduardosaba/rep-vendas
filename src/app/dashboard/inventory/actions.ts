'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateStockAction(productId: string, amount: number) {
  try {
    const supabase = await createClient();

    // 1. Verificar se o utilizador está autenticado
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autorizado');

    // 2. Buscar o saldo atual para evitar valores negativos
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', productId)
      .eq('user_id', user.id) // Segurança: garante que o produto pertence ao user
      .single();

    if (fetchError || !product) throw new Error('Produto não encontrado');

    const newQuantity = Math.max(0, (product.stock_quantity || 0) + amount);

    // 3. Atualizar no Supabase
    const { error: updateError } = await supabase
      .from('products')
      .update({ stock_quantity: newQuantity })
      .eq('id', productId)
      .eq('user_id', user.id);

    if (updateError) throw new Error('Erro ao atualizar base de dados');

    // 4. Limpar o cache para as páginas refletirem o novo valor instantaneamente
    revalidatePath('/dashboard/inventory');
    revalidatePath('/dashboard');

    return { success: true, newQuantity };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
