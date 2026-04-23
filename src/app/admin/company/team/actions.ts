'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function getTeamMembers() {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return { success: false, error: 'Not authenticated' };

    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', userId)
      .maybeSingle();
    if (pErr) throw pErr;
    const companyId = (profile as any)?.company_id;
    if (!companyId) return { success: true, data: [] };

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role, status, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

export async function addTeamMember(data: { email: string; password: string; name: string }) {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return { success: false, error: 'Not authenticated' };

    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', userId)
      .maybeSingle();
    if (pErr) throw pErr;
    const companyId = (profile as any)?.company_id;
    if (!companyId) return { success: false, error: 'User not linked to a company' };

    // Create user in Auth via service role
    const result = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { role: 'representative', company_id: companyId },
    });

    if (result.error) throw result.error;
    const authUser = result.data?.user;
    if (!authUser) throw new Error('Failed to create auth user');

    // Insert profile linked to company
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: authUser.id,
      email: data.email,
      full_name: data.name,
      role: 'representative',
      company_id: companyId,
      status: 'active',
    });

    if (profileError) throw profileError;

    revalidatePath('/admin/company/team');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}
