'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function updateOrderStatus(orderId: string, status: string) {
  const supabase = await createClient();

  // Verificar usuário autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.warn('Tentativa de atualizar pedido sem autenticação', {
      orderId,
      status,
    });
    throw new Error('Não autenticado');
  }

  // Atualizar o status do pedido — garantir que o pedido pertença ao usuário
  const { data: order, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    logger.error('Erro ao atualizar status do pedido', {
      orderId,
      status,
      error,
    });
    throw new Error(error.message || 'Falha ao atualizar pedido');
  }

  // Revalidar a rota do detalhe do pedido e o dashboard para atualizar listas
  try {
    revalidatePath(`/dashboard/orders/${orderId}`);
    revalidatePath('/dashboard');
  } catch (e) {
    // Não é crítico, só logamos
    logger.debug('RevalidatePath falhou (provavelmente contexto de cache)', e);
  }

  logger.info('Pedido atualizado', { orderId, status });

  return { success: true, order };
}
