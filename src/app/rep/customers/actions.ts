'use server';

import { createClient } from '@/lib/supabase/server';

export async function getCustomerDetails(customerId: string) {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: customer, error } = await supabase
      .from('customers')
      .select(`*, orders(id, display_id, total_value, status, created_at)`)
      .eq('id', customerId)
      .maybeSingle();

    if (error) throw error;

    // Ensure orders sorted desc
    if (customer && Array.isArray((customer as any).orders)) {
      (customer as any).orders.sort((a: any, b: any) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      (customer as any).orders = (customer as any).orders.slice(0, 5);
    }

    let repSlug: string | null = null;
    let companySlug: string | null = null;

    if (user?.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('slug, company_id')
        .eq('id', user.id)
        .maybeSingle();

      repSlug = (profile as any)?.slug || null;

      const profileCompanyId = (profile as any)?.company_id;
      const effectiveCompanyId = profileCompanyId || (customer as any)?.company_id;

      if (effectiveCompanyId) {
        const { data: company } = await supabase
          .from('companies')
          .select('slug')
          .eq('id', effectiveCompanyId)
          .maybeSingle();

        companySlug = (company as any)?.slug || null;
      }
    }

    if (customer) {
      (customer as any).sales_context = {
        company_slug: companySlug,
        representative_slug: repSlug,
      };
    }

    return { success: true, data: customer };
  } catch (e: any) {
    return { success: false, error: e?.message || String(e) };
  }
}

export async function searchCustomers(term: string) {
  const supabase = await createClient();

  try {
    // derive company_id from current profile
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, data: [], error: 'Não autenticado' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle();

    const cid = (profile as any)?.company_id;
    if (!cid) return { success: true, data: [] };

    let query = supabase
      .from('customers')
      .select(`id, name, document, address->> 'city' as address_city, address->> 'state' as address_state, financial_status`)
      .eq('company_id', cid);

    if (term && term.trim().length > 0) {
      const t = term.trim();
      // ilike for name or document
      query = query.or(`name.ilike.%${t}%,document.ilike.%${t}%`);
    }

    const { data, error } = await query.limit(20).order('name');
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (e: any) {
    return { success: false, data: [], error: e?.message || String(e) };
  }
}
