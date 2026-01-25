'use server';

import { createClient } from '@/lib/supabase/server';
import { getActiveUserId } from '@/lib/auth-utils';
import { createAuditLog } from '@/lib/audit-service';
import { revalidatePath } from 'next/cache';

export async function updateProductAction(productId: string, formData: any) {
  try {
    const supabase = await createClient();
    const activeUserId = await getActiveUserId();

    if (!activeUserId)
      return { success: false, status: 401, error: 'Não autorizado' };

    // Prevent unique constraint violation on (user_id, reference_code)
    if (formData?.reference_code) {
      const qc = await supabase
        .from('products')
        .select('id')
        .eq('user_id', activeUserId)
        .eq('reference_code', formData.reference_code)
        .limit(1);
      if (qc.error) {
        return {
          success: false,
          status: 500,
          error: qc.error.message || String(qc.error),
        };
      }
      const conflict =
        qc.data && qc.data.length > 0 && qc.data[0].id !== productId;
      if (conflict) {
        return {
          success: false,
          status: 409,
          error: 'Código de referência já existe para este usuário.',
        };
      }
    }

    const { data, error } = await supabase
      .from('products')
      .update({
        ...formData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId)
      .eq('user_id', activeUserId);

    if (error) {
      return {
        success: false,
        status: 500,
        error: error.message || String(error),
      };
    }

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
  } catch (e: any) {
    console.error('updateProductAction error', e);
    return { success: false, status: 500, error: e?.message || String(e) };
  }
}
