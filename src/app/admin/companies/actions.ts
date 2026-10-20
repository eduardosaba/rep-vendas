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
  orderManagementMode?: 'representative' | 'distributor';
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
        order_management_mode: input.orderManagementMode || 'representative',
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
    const { data: companies, error } = await supabaseAdmin
      .from('companies')
      .select('*')
      .order('name');

    if (error) throw error;

    // Buscar contagem de representantes vinculados
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('company_id')
      .not('company_id', 'is', null);

    const counts: Record<string, number> = {};
    (profiles || []).forEach((p: any) => {
      if (p.company_id) {
        counts[p.company_id] = (counts[p.company_id] || 0) + 1;
      }
    });

    const enriched = (companies || []).map((c: any) => {
      const isActive =
        c.is_active !== undefined && c.is_active !== null
          ? Boolean(c.is_active)
          : (c.metadata?.is_active !== undefined ? Boolean(c.metadata.is_active) : !c.block_new_orders);

      return {
        ...c,
        is_active: isActive,
        representatives_count: counts[c.id] || 0,
      };
    });

    return { success: true, data: enriched };
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) };
  }
}

export async function getCompanyRepresentatives(companyId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, role, is_active, created_at')
      .eq('company_id', companyId)
      .order('full_name');

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) };
  }
}

export async function updateCompany(
  companyId: string,
  data: {
    name: string;
    slug: string;
    cnpj?: string | null;
    orderManagementMode?: 'representative' | 'distributor';
  }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Não autenticado' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'master') {
      return {
        success: false,
        error: 'Apenas administradores Master podem editar distribuidoras.',
      };
    }

    const name = String(data.name || '').trim();
    const slug = normalizeSlug(data.slug);
    const cnpj = String(data.cnpj || '').trim() || null;
    const mode = data.orderManagementMode || 'representative';

    if (!name || !slug) {
      return { success: false, error: 'Nome e slug são obrigatórios.' };
    }

    // Verificar se outro registro já utiliza este slug
    const { data: existing } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('slug', slug)
      .neq('id', companyId)
      .maybeSingle();

    if (existing?.id) {
      return { success: false, error: 'Este slug já está em uso por outra distribuidora.' };
    }

    const { data: updated, error } = await supabaseAdmin
      .from('companies')
      .update({
        name,
        slug,
        cnpj,
        order_management_mode: mode,
        updated_at: new Date().toISOString(),
      })
      .eq('id', companyId)
      .select()
      .single();

    if (error) throw error;

    await createAuditLog(
      'update_company',
      `Distribuidora ${name} atualizada pelo Master`,
      { company_id: companyId, slug, mode }
    );

    revalidatePath('/admin/companies');
    revalidatePath(`/catalogo/${slug}`);

    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) };
  }
}

export async function toggleCompanyActive(
  companyId: string,
  isActive: boolean,
  reason?: string
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Não autenticado' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'master') {
      return {
        success: false,
        error: 'Apenas administradores Master podem ativar ou desativar distribuidoras.',
      };
    }

    const { data: existingCompany } = await supabaseAdmin
      .from('companies')
      .select('id, name, slug, metadata, organization_id')
      .eq('id', companyId)
      .maybeSingle();

    if (!existingCompany) {
      return { success: false, error: 'Distribuidora não encontrada.' };
    }

    const currentMetadata =
      existingCompany.metadata && typeof existingCompany.metadata === 'object'
        ? existingCompany.metadata
        : {};

    const updatedMetadata = {
      ...currentMetadata,
      is_active: isActive,
      status: isActive ? 'active' : 'suspended',
      deactivated_at: !isActive ? new Date().toISOString() : null,
      deactivated_reason: !isActive ? (reason || 'Desativada pelo administrador Master') : null,
    };

    const updatePayload: any = {
      block_new_orders: !isActive,
      metadata: updatedMetadata,
      updated_at: new Date().toISOString(),
    };

    const company = existingCompany;
    let { error } = await supabaseAdmin
      .from('companies')
      .update({
        ...updatePayload,
        is_active: isActive,
      })
      .eq('id', companyId);

    if (error && (error.code === '42703' || String(error.message).includes('is_active'))) {
      const fallback = await supabaseAdmin
        .from('companies')
        .update(updatePayload)
        .eq('id', companyId);
      error = fallback.error;
    }

    if (error) throw error;

    // Sincronizar organização vinculada se houver
    if (existingCompany.organization_id) {
      try {
        await supabaseAdmin
          .from('organizations')
          .update({
            is_active: isActive,
            status: isActive ? 'active' : 'suspended',
          })
          .eq('id', existingCompany.organization_id);
      } catch {}
    }

    await createAuditLog(
      'toggle_company_active',
      `Distribuidora ${company.name} ${isActive ? 'reativada' : 'desativada'} pelo Master`,
      { company_id: companyId, is_active: isActive, reason: reason || null }
    );

    revalidatePath('/admin/companies');
    revalidatePath(`/catalogo/${company.slug}`);

    return {
      success: true,
      message: `Distribuidora "${company.name}" ${isActive ? 'reativada' : 'desativada'} com sucesso!`,
    };
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) };
  }
}

export async function deleteCompany(companyId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Não autenticado' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'master') {
      return {
        success: false,
        error: 'Apenas administradores Master podem excluir distribuidoras.',
      };
    }

    // 1. Obter dados da empresa para auditoria
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('id, name, slug')
      .eq('id', companyId)
      .maybeSingle();

    if (!company) {
      return { success: false, error: 'Distribuidora não encontrada.' };
    }

    // 2. Verificar dependências comerciais e operacionais
    const [ordersRes, productsRes, customersRes, profilesRes] = await Promise.all([
      supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      supabaseAdmin.from('products').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      supabaseAdmin.from('customers').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
    ]);

    const ordersCount = ordersRes.count || 0;
    const productsCount = productsRes.count || 0;
    const customersCount = customersRes.count || 0;
    const profilesCount = profilesRes.count || 0;

    const blockingReasons: string[] = [];
    if (ordersCount > 0) blockingReasons.push(`${ordersCount} pedido(s) registrados`);
    if (productsCount > 0) blockingReasons.push(`${productsCount} produto(s) no catálogo`);
    if (customersCount > 0) blockingReasons.push(`${customersCount} cliente(s) vinculados`);
    if (profilesCount > 0) blockingReasons.push(`${profilesCount} representante(s)/admin(s) vinculados`);

    if (blockingReasons.length > 0) {
      return {
        success: false,
        error: `Não é possível excluir esta distribuidora porque ela possui dependências ativas: ${blockingReasons.join(', ')}. Para preservar o histórico comercial e fiscal, utilize a opção "Desativar Distribuidora". A exclusão definitiva é permitida apenas para empresas criadas por engano sem movimentação.`,
      };
    }

    // 3. Remover a organização vinculada no metadata se houver
    try {
      await supabaseAdmin
        .from('organizations')
        .delete()
        .filter('metadata->>company_id', 'eq', companyId);
    } catch {}

    // 4. Remover a empresa
    const { error: deleteError } = await supabaseAdmin
      .from('companies')
      .delete()
      .eq('id', companyId);

    if (deleteError) {
      throw deleteError;
    }

    await createAuditLog(
      'delete_company',
      `Distribuidora ${company.name} excluída definitivamente pelo Master (sem dependências)`,
      { company_id: companyId, slug: company.slug }
    );

    revalidatePath('/admin/companies');
    revalidatePath('/admin/users');

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) };
  }
}

export async function getCompanyOrders(companyId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(
        `id, display_id, created_at, total_value, status, faturado_at, despachado_at, entregue_at, user_id, seller_id, customer_id, client_name_guest, client_phone_guest, client_email_guest, company_id`
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

        const effectiveSellerId = o.seller_id || o.user_id;
        if (effectiveSellerId) {
          const { data: p } = await supabaseAdmin
            .from('profiles')
            .select('full_name')
            .eq('id', effectiveSellerId)
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

export async function updateCompanyOrderManagementMode(
  companyId: string,
  mode: 'representative' | 'distributor'
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Não autenticado' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'master') {
      return {
        success: false,
        error:
          'Apenas o administrador Master pode alterar o modelo de gestão contratado pela distribuidora.',
      };
    }

    const { error } = await supabaseAdmin
      .from('companies')
      .update({
        order_management_mode: mode,
        updated_at: new Date().toISOString(),
      })
      .eq('id', companyId);

    if (error) {
      return { success: false, error: error.message };
    }

    await createAuditLog(
      'update_company_order_management_mode',
      `Modelo de gestão da distribuidora alterado para: ${mode}`,
      { company_id: companyId, mode }
    );

    revalidatePath('/admin/companies');
    revalidatePath('/dashboard/orders');

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) };
  }
}
