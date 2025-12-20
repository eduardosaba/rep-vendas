'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { mapToDbStatus } from '@/lib/orderStatus';

export async function updateOrderStatus(
  orderId: number | string,
  newStatus: string
) {
  const ensureSupabaseEnv = () => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
       
      console.error(
        'Faltam variáveis de ambiente Supabase: NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY'
      );
      throw new Error(
        'Configuração inválida: verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY'
      );
    }
  };

  ensureSupabaseEnv();
  const supabase = await createClient();

  // 1. Verifica usuário
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autorizado');

  // 2. Normaliza/Valida status para obedecer CHECK constraint no DB
  const normalized = mapToDbStatus(newStatus);

  // 2. Atualiza status
  const { error } = await supabase
    .from('orders')
    .update({ status: normalized })
    .eq('id', orderId)
    .eq('user_id', user.id); // Garante que só o dono pode alterar

  if (error) throw new Error(error.message);

  // 3. Atualiza as páginas
  revalidatePath('/dashboard/orders');
  // Revalida também a página de detalhes pública. O caminho de visualização usa
  // o `display_id` (ID curto). Buscamos o pedido para obter esse valor.
  const { data: orderRow } = await supabase
    .from('orders')
    .select('display_id')
    .eq('id', orderId)
    .maybeSingle();

  if (orderRow?.display_id) {
    revalidatePath(`/dashboard/orders/${orderRow.display_id}`);
  } else {
    // fallback: tentar revalidar pela UUID (antigo comportamento)
    revalidatePath(`/dashboard/orders/${orderId}`);
  }

  return { success: true };
}
