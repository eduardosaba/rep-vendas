'use server';

import { createClient } from '@/lib/supabase/server';
import { getActiveUserId } from '@/lib/auth-utils';
import { createAuditLog } from '@/lib/audit-service';
import { revalidatePath } from 'next/cache';

export async function getAdminContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Acesso negado');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id,full_name,email,role,company_id,can_manage_catalog')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !profile) {
    throw new Error(error?.message || 'Perfil não encontrado');
  }

  if (profile.role !== 'admin_company' && profile.role !== 'master') {
    throw new Error('Permissão insuficiente');
  }

  if (!profile.company_id && profile.role !== 'master') {
    throw new Error('Usuário sem company_id vinculado');
  }

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id,name,slug,cnpj,primary_color,secondary_color,logo_url,about_text,shipping_policy,contact_email')
    .eq('id', profile.company_id)
    .maybeSingle();

  if (companyError) {
    throw new Error(companyError.message);
  }

  return {
    profile,
    company,
  };
}

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
