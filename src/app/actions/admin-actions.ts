'use server';

import { createClient } from '@/lib/supabase/server';
import { getActiveUserId } from '@/lib/auth-utils';
import { createAuditLog } from '@/lib/audit-service';
import { revalidatePath } from 'next/cache';

export async function bulkPriceAdjustAction(params: {
  brand: string;
  type: 'percent' | 'fixed';
  value: number;
  propagate: boolean;
}) {
  const supabase = await createClient();
  const activeUserId = await getActiveUserId();

  if (!activeUserId) throw new Error('Não autorizado');

  const { data, error } = await supabase.rpc('bulk_update_prices_by_brand', {
    p_user_id: activeUserId,
    p_brand: params.brand,
    p_adjustment_type: params.type,
    p_value: params.value,
    p_propagate_to_clones: params.propagate,
  });

  if (error) throw error;

  await createAuditLog(
    'BULK_PRICE_ADJUST',
    `Reajuste em massa (${params.type}) de ${params.value} na marca ${params.brand}.`,
    {
      brand: params.brand,
      adjustment: params.value,
      type: params.type,
      affected_count: data,
      propagated: params.propagate,
    }
  );

  try {
    revalidatePath('/dashboard/products');
  } catch (e) {
    // ignore revalidate errors in server action
  }

  return { success: true, affectedRows: data } as any;
}
