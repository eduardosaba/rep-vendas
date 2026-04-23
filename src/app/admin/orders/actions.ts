'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateOrderStatus(orderId: string, newStatus: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('orders')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (error) throw new Error(error.message);

  // Revalida caminhos relevantes
  try {
    revalidatePath('/admin/companies');
  } catch (e) {}
  try {
    revalidatePath('/dashboard/company/orders');
  } catch (e) {}
  try {
    revalidatePath('/dashboard/rep/orders');
  } catch (e) {}

  return { success: true };
}
