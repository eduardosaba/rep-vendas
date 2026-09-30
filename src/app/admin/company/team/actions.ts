'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function resolveCompanyId(supabase: any, userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id,organization_id')
    .eq('id', userId)
    .maybeSingle();
  let companyId = (profile as any)?.company_id || (profile as any)?.organization_id;
  if (!companyId) {
    const { data: comp } = await supabaseAdmin
      .from('companies')
      .select('id')
      .or(`owner_user_id.eq.${userId},user_id.eq.${userId}`)
      .maybeSingle();
    companyId = comp?.id;
  }
  return companyId;
}

export async function getTeamMembers() {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return { success: false, error: 'Não autenticado' };

    const companyId = await resolveCompanyId(supabase, userId);
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
    if (!userId) return { success: false, error: 'Não autenticado' };

    const companyId = await resolveCompanyId(supabase, userId);
    if (!companyId) return { success: false, error: 'Usuário não vinculado a uma empresa' };

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
