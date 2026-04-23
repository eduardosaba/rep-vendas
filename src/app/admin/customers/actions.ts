'use server';

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function getCustomers(companyId?: string) {
  try {
    // If companyId provided, use admin client; otherwise attempt to derive from session
    if (companyId) {
      const { data, error } = await supabaseAdmin
        .from('customers')
        .select('id, company_id, name, document, phone, email, address, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    }

    // Derivar company_id do perfil do usuário autenticado (server client)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Não autenticado' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle();

    const cid = (profile as any)?.company_id;
    if (!cid) return { success: true, data: [] };

    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('id, company_id, name, document, phone, email, address, created_at')
      .eq('company_id', cid)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e?.message || String(e) };
  }
}

export async function getCustomerById(customerId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('*, company:companies(name, slug), orders:orders(id, display_id, created_at, total_value, status)')
      .eq('id', customerId)
      .maybeSingle();

    if (error) throw error;
    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e?.message || String(e) };
  }
}
