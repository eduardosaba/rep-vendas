'use server';

import { createClient } from '@/lib/supabase/server';
import { getActiveUserId } from '@/lib/auth-utils';
import { createAuditLog } from '@/lib/audit-service';
import { revalidatePath } from 'next/cache';

type CartItem = {
  product_id: string;
  quantity: number;
  price?: number;
};

export async function saveCartAction(items: CartItem[]) {
  const supabase = await createClient();
  const activeUserId = await getActiveUserId();

  if (!activeUserId) throw new Error('Sessão inválida');

  const payload = {
    user_id: activeUserId,
    items,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('saved_carts')
    .upsert(payload, { onConflict: 'user_id' });

  if (error) throw error;

  await createAuditLog(
    'CART_UPDATE',
    `Carrinho atualizado para user=${activeUserId}`,
    { items_count: items?.length ?? 0 }
  );

  try {
    revalidatePath('/dashboard/saved-carts');
  } catch (e) {
    // ignore
  }

  return { success: true, data } as const;
}

import { checkoutCommercialOrder } from '@/actions/commercial/orders/create';

interface LegacyCreateOrderInput {
  clientId: string
  items: Array<{
    productId: string
    quantity: number
  }>
  paymentMethod: 'boleto' | 'pix' | 'cartao'
  notes?: string
}

/**
 * Adaptador de Compatibilidade do Carrinho / Loja Virtual
 * Deixa de realizar o .insert() direto na tabela 'orders' e delega a 
 * responsabilidade para o pipeline transacional atômico da Distribuidora.
 */
export async function createOrderAction(input: LegacyCreateOrderInput) {
  try {
    // Validação básica de entrada na borda do adaptador
    if (!input.clientId || !input.items || input.items.length === 0) {
      return { success: false, error: 'Dados do carrinho inválidos ou vazios.' }
    }

    // Encaminha o payload para o ecossistema comercial unificado
    const result = await checkoutCommercialOrder({
      clientId: input.clientId,
      items: input.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity
      })),
      paymentMethod: input.paymentMethod,
      notes: input.notes
    })

    return result

  } catch (error: any) {
    console.error('[Store Action Adapter Crash]:', error.message)
    return { 
      success: false, 
      error: 'Ocorreu uma falha operacional ao processar o checkout do pedido.' 
    }
  }
}
