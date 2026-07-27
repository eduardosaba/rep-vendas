import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

export async function createDemoUsers(supabaseAdmin: ReturnType<typeof createSupabaseAdmin>, companyId: string) {
  const defaultPassword = 'password123';

  const users = [
    { email: 'admin@alpha.demo', name: 'Administrador', role: 'company_admin' },
    { email: 'rep@alpha.demo', name: 'Representante', role: 'representative' },
    { email: 'picker@alpha.demo', name: 'Separador', role: 'picker' },
    { email: 'financeiro@alpha.demo', name: 'Financeiro', role: 'finance' },
  ];

  for (const u of users) {
    // Tenta deletar se já existir no Auth
    const { data: existingAuth } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingAuth?.users?.find((existing: any) => existing.email === u.email);
    
    if (userExists) {
      await supabaseAdmin.auth.admin.deleteUser(userExists.id);
    }

    const { data: createdAuth, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: u.email,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: {
        name: u.name,
        role: u.role,
        company_id: companyId,
      },
    });

    if (authError || !createdAuth?.user?.id) {
      throw new Error(authError?.message || `Erro ao criar usuário ${u.email}`);
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: createdAuth.user.id,
        full_name: u.name,
        email: u.email,
        role: u.role,
        company_id: companyId,
        status: 'active',
        can_manage_catalog: u.role === 'company_admin',
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      throw new Error(profileError.message || `Erro ao atualizar profile ${u.email}`);
    }
  }

  return { success: true };
}
