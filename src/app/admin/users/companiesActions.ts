"use server";

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function getCompanies() {
  try {
    const { data, error } = await supabaseAdmin.from('companies').select('id,name').order('name');
    if (error) throw error;
    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e?.message || String(e) };
  }
}
