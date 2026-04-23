'use server';

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAuditLog } from '@/lib/audit-service';

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function createCompany(data: { name: string; slug: string; cnpj?: string }) {
  try {
    const { data: inserted, error } = await supabaseAdmin
      .from('companies')
      .insert({
        name: data.name,
        slug: data.slug.toLowerCase().trim(),
        cnpj: data.cnpj,
      })
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/admin/companies');
    return { success: true, data: inserted };
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) };
  }
}

type CreateCompanyWithAdminInput = {
  companyName: string;
  slug: string;
  cnpj?: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
};

const COMPANY_ADMIN_ROLE_CANDIDATES = ['admin_company', 'admin', 'representative', 'rep'] as const;

function isInvalidUserRoleEnumError(error: any) {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return code === '22P02' || message.includes('invalid input value for enum user_role');
}

function normalizeSlug(input: string) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

export async function createCompanyWithAdmin(input: CreateCompanyWithAdminInput) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Não autenticado' };
  }

  const { data: requesterProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const requesterRole = String((requesterProfile as any)?.role || '');
  if (requesterRole !== 'master') {
    return { success: false, error: 'Apenas usuários master podem criar distribuidoras com administrador.' };
  }

  const companyName = String(input?.companyName || '').trim();
  const companySlug = normalizeSlug(String((input as any)?.slug || ''));
  const cnpj = String(input?.cnpj || '').trim() || null;
  const adminName = String(input?.adminName || '').trim();
  const adminEmail = String(input?.adminEmail || '').trim().toLowerCase();
  const adminPassword = String(input?.adminPassword || '');

  if (!companyName || !companySlug || !adminName || !adminEmail || !adminPassword) {
    return { success: false, error: 'Preencha empresa, slug e dados do administrador.' };
  }

  if (adminPassword.length < 8) {
    return { success: false, error: 'A senha provisória deve ter ao menos 8 caracteres.' };
  }

  try {
    // 1) Validações de unicidade
    const { data: existingCompany } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('slug', companySlug)
      .maybeSingle();

    if (existingCompany?.id) {
      return { success: false, error: 'Slug da distribuidora já está em uso.' };
    }

    const { data: existingProfileByEmail } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', adminEmail)
      .maybeSingle();

    if (existingProfileByEmail?.id) {
      return { success: false, error: 'Já existe um usuário com este e-mail.' };
    }

    // 2) Cria empresa
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        name: companyName,
        slug: companySlug,
        cnpj,
      })
      .select()
      .single();

    if (companyError || !company) {
      throw new Error(companyError?.message || 'Erro ao criar distribuidora.');
    }

    let createdAuthUserId: string | null = null;

    try {
      // 3) Cria usuário no Auth
      const { data: createdAuth, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: {
          name: adminName,
          role: 'representative',
          company_id: company.id,
        },
      });

      if (authError || !createdAuth?.user?.id) {
        throw new Error(authError?.message || 'Erro ao criar conta de acesso.');
      }

      createdAuthUserId = createdAuth.user.id;

      // 4) Upsert de profile com fallback de role compatível com o enum local
      let selectedAdminRole: string | null = null;
      for (const candidateRole of COMPANY_ADMIN_ROLE_CANDIDATES) {
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .upsert(
            {
              id: createdAuthUserId,
              full_name: adminName,
              email: adminEmail,
              role: candidateRole,
              company_id: company.id,
              status: 'active',
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );

        if (!profileError) {
          selectedAdminRole = candidateRole;
          break;
        }

        if (!isInvalidUserRoleEnumError(profileError)) {
          throw new Error(profileError.message || 'Erro ao vincular perfil do administrador.');
        }
      }

      if (!selectedAdminRole) {
        throw new Error('Nenhuma role de administrador compatível com o enum user_role deste ambiente.');
      }

      // Melhor esforço: garantir permissão de gestão de catálogo para o administrador corporativo
      try {
        await supabaseAdmin
          .from('profiles')
          .update({ can_manage_catalog: true } as any)
          .eq('id', createdAuthUserId);
      } catch {
        // coluna opcional; não bloqueia fluxo
      }

      // Melhor esforço: alinhar metadata da conta Auth com a role aplicada no profile
      try {
        await supabaseAdmin.auth.admin.updateUserById(createdAuthUserId, {
          user_metadata: {
            name: adminName,
            role: selectedAdminRole,
            company_id: company.id,
          },
        });
      } catch {
        // não bloqueia fluxo
      }

      // 5) Melhor esforço para registrar dono na company (caso coluna exista)
      try {
        await supabaseAdmin
          .from('companies')
          .update({
            owner_user_id: createdAuthUserId,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', company.id);
      } catch {
        // Coluna opcional; não bloqueia fluxo
      }

      await createAuditLog(
        'create_company_with_admin',
        `Distribuidora ${companyName} criada com administrador ${adminEmail}`,
        {
          company_id: company.id,
          company_slug: companySlug,
          admin_user_id: createdAuthUserId,
          admin_email: adminEmail,
          admin_role: selectedAdminRole,
        }
      );

      revalidatePath('/admin/companies');
      return {
        success: true,
        data: {
          company,
          admin_user_id: createdAuthUserId,
          admin_email: adminEmail,
        },
      };
    } catch (innerError: any) {
      // Rollback manual (Auth + Company)
      if (createdAuthUserId) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
        } catch {
          // segue para rollback da empresa
        }
      }

      try {
        await supabaseAdmin.from('companies').delete().eq('id', company.id);
      } catch {
        // melhor esforço
      }

      return { success: false, error: innerError?.message || 'Falha ao criar ecossistema da distribuidora.' };
    }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) };
  }
}

export async function getCompanies() {
  try {
    const { data, error } = await supabaseAdmin
      .from('companies')
      .select('*')
      .order('name');

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) };
  }
}

export async function getCompanyOrders(companyId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(
        `id, display_id, created_at, total_value, status, faturado_at, despachado_at, entregue_at, user_id, customer_id, client_name_guest, client_phone_guest, client_email_guest, company_id`
      )
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Enriquecer com nome do representante e dados do cliente
    const enriched = await Promise.all(
      (data || []).map(async (o: any) => {
        let rep_name = null;
        let customer_name = o.client_name_guest || null;
        let customer_city = null;

        if (o.user_id) {
          const { data: p } = await supabaseAdmin
            .from('profiles')
            .select('full_name')
            .eq('id', o.user_id)
            .maybeSingle();
          rep_name = (p as any)?.full_name || null;
        }

        if (o.customer_id) {
          const { data: c } = await supabaseAdmin
            .from('customers')
            .select('name, address')
            .eq('id', o.customer_id)
            .maybeSingle();
          if (c) {
            customer_name = (c as any).name || customer_name;
            const addr = (c as any).address;
            if (addr && typeof addr === 'object') customer_city = addr.city || null;
          }
        }

        return {
          ...o,
          rep_name,
          customer_name,
          customer_city,
          number: o.display_id,
          total_amount: o.total_value,
        };
      })
    );

    return { success: true, data: enriched };
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) };
  }
}
