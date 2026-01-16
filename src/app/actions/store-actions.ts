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

export async function createOrderAction(orderData: {
  items: CartItem[];
  total: number;
  shipping?: any;
  billing?: any;
}) {
  const supabase = await createClient();
  const activeUserId = await getActiveUserId();

  if (!activeUserId) throw new Error('Sessão inválida');

  const orderPayload = {
    user_id: activeUserId,
    items: orderData.items,
    total: orderData.total,
    shipping: orderData.shipping || null,
    billing: orderData.billing || null,
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('orders').insert([orderPayload]);
  if (error) throw error;

  await createAuditLog(
    'ORDER_CREATE',
    `Pedido criado para user=${activeUserId} total=${orderData.total}`,
    { items_count: orderData.items?.length ?? 0, total: orderData.total }
  );

  try {
    revalidatePath('/dashboard/orders');
    revalidatePath('/dashboard/saved-carts');
  } catch (e) {
    // ignore
  }

  return {
    success: true,
    order: Array.isArray(data) ? data[0] : data,
  } as const;
}
