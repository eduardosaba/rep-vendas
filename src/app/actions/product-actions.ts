'use server';

import { createClient } from '@/lib/supabase/server';
import { getActiveUserId } from '@/lib/auth-utils';
import { createAuditLog } from '@/lib/audit-service';
import { revalidatePath } from 'next/cache';

export async function updateProductAction(productId: string, formData: any) {
  const supabase = await createClient();
  const activeUserId = await getActiveUserId();

  if (!activeUserId) throw new Error('Não autorizado');

  const { data, error } = await supabase
    .from('products')
    .update({
      ...formData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId)
    .eq('user_id', activeUserId);

  if (error) throw error;

  await createAuditLog(
    'PRODUCT_UPDATE',
    `Produto ${formData.name || 'sem nome'} atualizado via Dashboard.`,
    { product_id: productId, reference: formData.reference_code }
  );

  try {
    revalidatePath('/dashboard/products');
    revalidatePath(`/dashboard/products/${productId}`);
  } catch (e) {
    // ignore revalidate errors in server action
  }

  return { success: true };
}
