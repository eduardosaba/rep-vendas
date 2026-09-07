'use server';

import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin, supabaseAdmin } from '@/infrastructure/supabase/admin';
import { revalidatePath } from 'next/cache';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { logger } from '@/lib/logger';


// --- CHECAGEM DE SEGURANÇA NO SERVIDOR ---
export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado.');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, role, is_active')
    .eq('id', user.id)
    .single();

  if (!profile) {
    throw new Error('Perfil de usuário não encontrado.');
  }

  if (profile.is_active === false) {
    throw new Error('Sua conta de acesso foi desativada pelo administrador.');
  }

  return {
    userId: user.id,
    email: user.email || profile.email,
    role: profile.role as string,
  };
}

async function requireAdminPermission() {
  const user = await getAuthenticatedUser();
  const isAllowed = user.role === 'admin' || user.role === 'master';

  if (!isAllowed) {
    throw new Error('Acesso negado: Apenas administradores podem realizar esta ação.');
  }
  return user;
}

async function requireMasterPermission() {
  const user = await getAuthenticatedUser();
  if (user.role !== 'master') {
    throw new Error('Acesso negado: Ação exclusiva para usuários com perfil Master.');
  }
  return user;
}


// --- ACTION 1: BUSCAR PLANOS ---
export async function getPlans() {
  try {
    await requireAdminPermission();
    const { data, error } = await (supabaseAdmin as any)
      .from('plans')
      .select('*')
      .order('price', { ascending: true });

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- ACTION 2: BUSCAR USUÁRIO ÚNICO (Com Assinatura e Preço) ---
export async function getUserWithSubscription(userId: string) {
  try {
    await requireAdminPermission();

    const { data, error } = await (supabaseAdmin as any)
      .from('profiles')
      .select(
        `
        *,
        subscriptions (
          plan_name,
          status,
          current_period_end,
          price
        )
      `
      )
      .eq('id', userId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- ACTION 3: BUSCAR LISTA DE USUÁRIOS ---
export async function getUsersWithSubscriptions() {
  try {
    await requireAdminPermission();

    const { data: profiles, error } = await (supabaseAdmin as any)
      .from('profiles')
      .select(
        `
        id,
        email,
        role,
        status,
        is_active,
        disabled_at,
        disabled_reason,
        disabled_by,
        trial_ends_at,
        created_at,
        full_name,
        company_id,
        subscriptions (
          status,
          current_period_end,
          plan_name,
          price
        )
      `
      )
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, data: profiles };
  } catch (error: unknown) {
    logger.error('Erro getUsersWithSubscriptions', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

// --- ACTION 4: CRIAR USUÁRIO MANUALMENTE ---
export async function createManualUser(data: {
  email: string;
  password: string;
  role: string;
  planName: string;
  company_id?: string | null;
}) {
  try {
    await requireAdminPermission();

    // Validações de ambiente
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL não configurado');
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurado');
    }

    // Validações de dados
    if (!data.email || !data.email.includes('@')) {
      throw new Error('Email inválido');
    }
    if (!data.password || data.password.length < 6) {
      throw new Error('A senha deve ter pelo menos 6 caracteres.');
    }

    logger.info('Criando usuário', { email: data.email, role: data.role });

    // Evita tentativa de criação quando o email já existe no banco (prevenção de conflito)
    const { data: existingProfile } = await (supabaseAdmin as any)
      .from('profiles')
      .select('id')
      .eq('email', data.email)
      .maybeSingle();

    if (existingProfile) {
      return { success: false, error: 'Email já cadastrado' };
    }

    const mapRoleToDb = (role: string) => {
      const r = (role || '').toString().toLowerCase();
      if (r === 'master' || r === 'admin') return 'master';
      // Preserve company roles when supported by the database role model.
      if (r === 'admin_company') return 'admin_company';
      if (r === 'rep_company') return 'rep_company';
      if (r === 'representante' || r === 'representative') return 'representative';
      return 'rep';
    };

    const isRoleConstraintError = (err: any) => {
      const code = String(err?.code || '');
      const msg = String(err?.message || '').toLowerCase();
      return (
        code === '22P02' ||
        code === '23514' ||
        msg.includes('invalid input value for enum user_role') ||
        msg.includes('check constraint')
      );
    };

    const buildRoleCandidates = (baseRole: string) => {
      const r = (baseRole || '').toLowerCase();
      if (r === 'master' || r === 'admin') return ['master'];
      if (r === 'admin_company') return ['admin_company', 'representative', 'rep'];
      if (r === 'rep_company') return ['rep_company', 'representative', 'rep'];
      if (r === 'representante' || r === 'representative') return ['representative', 'rep'];
      if (r === 'rep') return ['rep'];
      return ['rep'];
    };

    const dbRole = mapRoleToDb(data.role);
    const roleCandidates = buildRoleCandidates(dbRole);

    logger.info('Tentando criar usuário no Auth', {
      email: data.email,
      dbRole,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    });

    // 1. Auth - Tentativa 1: Usar admin.createUser (método preferido)
    let authData: any;
    let userId: string;

    try {
      const result = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { role: roleCandidates[0], company_id: data.company_id ?? null },
      });

      if (result.error) {
        throw result.error;
      }

      authData = result.data;

      if (!authData?.user) {
        throw new Error('Falha ao gerar ID do usuário');
      }

      userId = authData.user.id;
      logger.info('Usuário criado com sucesso via admin API', {
        userId,
        email: data.email,
      });
    } catch (authError: any) {
      logger.error('Supabase auth error creating user', {
        error: authError,
        status: authError?.status,
        code: authError?.code,
        message: authError?.message,
        email: data.email,
      });

      // Mensagens de erro mais específicas
      if (
        authError?.message?.includes('already registered') ||
        authError?.message?.includes('already exists')
      ) {
        throw new Error('Este email já está cadastrado no sistema');
      }

      if (
        authError?.status === 500 ||
        authError?.code === 'unexpected_failure'
      ) {
        throw new Error(
          `Erro de autenticação no Supabase (${authError?.code || '500'}). ` +
            `Verifique: 1) Se SUPABASE_SERVICE_ROLE_KEY está correto, ` +
            `2) Se Email Provider está habilitado no Supabase Dashboard, ` +
            `3) Se não há rate limiting ativo. Detalhes: ${authError?.message || 'Erro desconhecido'}`
        );
      }

      throw new Error(
        `Erro ao criar autenticação: ${authError?.message || 'Erro desconhecido'}`
      );
    }

    if (!userId) {
      throw new Error('Falha ao obter ID do usuário criado');
    }

    // 2. Buscar dados do plano primeiro
    let price = 0;
    let planId = null;
    if (data.planName) {
      const { data: planData } = await (supabaseAdmin as any)
        .from('plans')
        .select('id, price')
        .eq('name', data.planName)
        .maybeSingle();

      if (planData) {
        price = planData.price;
        planId = planData.id;
      }
    }

    // 3. Profile (inclui plan_id para sincronização)
    let selectedRole: string | null = null;
    for (const candidateRole of roleCandidates) {
      const profileUpsert: any = {
        id: userId,
        email: data.email,
        full_name: data.email.split('@')[0],
        role: candidateRole,
        plan_id: planId, // Sincronizar plan_id
        updated_at: new Date().toISOString(),
      };
      if (data.company_id) profileUpsert.company_id = data.company_id;

      const { error: profileError } = await (supabaseAdmin as any)
        .from('profiles')
        .upsert(profileUpsert);

      if (!profileError) {
        selectedRole = candidateRole;
        break;
      }

      if (!isRoleConstraintError(profileError)) {
        throw new Error(`Erro Perfil: ${profileError.message}`);
      }
    }

    if (!selectedRole) {
      throw new Error('Nenhuma role compatível com o schema atual foi aceita pelo banco.');
    }

    // Best effort: manter metadata do Auth alinhada com a role final aplicada no profile.
    try {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          role: selectedRole,
          company_id: data.company_id ?? null,
        },
      });
    } catch {}

    // 4. Subscription
    const { error: subError } = await (supabaseAdmin as any)
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_id: planId,
        status: 'active',
        plan_name: data.planName,
        price: price,
        current_period_end: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
      });

    if (subError) {
      throw new Error(
        `Erro Assinatura: ${subError.message || 'Erro desconhecido'}`
      );
    }

    // 5. Settings (criar com plan_type sincronizado)
    const { error: settingsError } = await (supabaseAdmin as any)
      .from('settings')
      .upsert({
        user_id: userId,
        plan_type: data.planName,
        updated_at: new Date().toISOString(),
      });

    if (settingsError)
      console.warn('Aviso ao criar settings:', settingsError.message);

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error: unknown) {
    logger.error('Erro createManualUser', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

// --- ACTION 5: ATUALIZAR LICENÇA ---
export async function updateUserLicense(
  userId: string,
  prevState: any,
  formData: FormData
) {
  try {
    await requireAdminPermission();

    const planName = formData.get('plan') as string;
    const status = formData.get('status') as string;
    const endsAt = formData.get('ends_at') as string;

    const updateData: any = {
      plan_name: planName,
      status: status,
      updated_at: new Date().toISOString(),
    };

    if (planName) {
      const { data: planData } = await (supabaseAdmin as any)
        .from('plans')
        .select('id, price')
        .eq('name', planName)
        .maybeSingle();

      if (planData) {
        updateData.price = planData.price;
        updateData.plan_id = planData.id;
      }
    }

    if (endsAt) {
      const dateObj = new Date(endsAt);
      dateObj.setUTCHours(23, 59, 59, 999);
      updateData.current_period_end = dateObj.toISOString();
    } else {
      updateData.current_period_end = null;
    }

    const { data, error } = await (supabaseAdmin as any)
      .from('subscriptions')
      .update(updateData)
      .eq('user_id', userId)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      if (!updateData.price) updateData.price = 0;
      const { error: insertError } = await (supabaseAdmin as any)
        .from('subscriptions')
        .insert({
          user_id: userId,
          ...updateData,
        });
      if (insertError) throw insertError;
    }

    // Sincronizar plan_id em profiles (limpa quando não houver plano ou plano gratuito)
    await (supabaseAdmin as any)
      .from('profiles')
      .update({
        plan_id: updateData.plan_id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    // Sincronizar status e trial_ends_at em profiles conforme o status da assinatura
    try {
      if (String(status).toLowerCase() === 'active') {
        await (supabaseAdmin as any)
          .from('profiles')
          .update({ status: 'active', trial_ends_at: null, updated_at: new Date().toISOString() })
          .eq('id', userId);
      } else if (String(status).toLowerCase() === 'trial') {
        // se veio uma data de término, sincronizar trial_ends_at
        if (updateData.current_period_end) {
          await (supabaseAdmin as any)
            .from('profiles')
            .update({ status: 'trial', trial_ends_at: updateData.current_period_end, updated_at: new Date().toISOString() })
            .eq('id', userId);
        } else {
          await (supabaseAdmin as any)
            .from('profiles')
            .update({ status: 'trial', updated_at: new Date().toISOString() })
            .eq('id', userId);
        }
      }
    } catch (e) {
      // não interromper o fluxo principal se a sincronização falhar
      console.warn('Aviso: falha ao sincronizar profile.status após updateUserLicense', e);
    }

    // Sincronizar plan_type em settings (armazena o tipo do plano mesmo que seja 'Free' ou vazio)
    await (supabaseAdmin as any).from('settings').upsert({
      user_id: userId,
      plan_type: planName || null,
      updated_at: new Date().toISOString(),
    });

    revalidatePath(`/admin/users/${userId}`);
    revalidatePath('/admin/users');
    return { success: true, message: 'Assinatura atualizada com sucesso!' };
  } catch (error: any) {
    logger.error('Erro updateUserLicense', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

// --- ACTION 6: RENOVAR ASSINATURA ---
export async function addSubscriptionDays(userId: string, daysToAdd: number) {
  try {
    await requireAdminPermission();

    const { data: currentSub } = await (supabaseAdmin as any)
      .from('subscriptions')
      .select('current_period_end, status')
      .eq('user_id', userId)
      .single();

    let baseDate = new Date();
    if (currentSub?.current_period_end) {
      const currentEnd = new Date(currentSub.current_period_end);
      if (currentEnd > baseDate) {
        baseDate = currentEnd;
      }
    }

    baseDate.setDate(baseDate.getDate() + daysToAdd);
    const newDateIso = baseDate.toISOString();

    const { error } = await (supabaseAdmin as any).from('subscriptions').upsert(
      {
        user_id: userId,
        current_period_end: newDateIso,
        status: 'active',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (error) throw error;

    revalidatePath('/admin/users');
    return { success: true, newDate: newDateIso };
  } catch (error: unknown) {
    logger.error('Erro addSubscriptionDays', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

// --- ACTION 7: ATUALIZAR PERFIL ---
export async function updateUserProfile(
  userId: string,
  prevState: any,
  formData: FormData
) {
  try {
    await requireAdminPermission();

    const fullName = formData.get('full_name') as string;
    const role = formData.get('role') as string;
    // Optional fields
    const estados = formData.getAll('estados') as string[];
    const brandsRaw = (formData.get('brands') as string) || '';
    const brands = brandsRaw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const updatePayload: any = {
      full_name: fullName,
      role: role,
      updated_at: new Date().toISOString(),
    };

    if (Array.isArray(estados) && estados.length > 0)
      updatePayload.estados = estados;
    if (brands.length > 0) updatePayload.brands = brands;

    const { error } = await (supabaseAdmin as any)
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId);

    if (error) throw error;

    await (supabaseAdmin.auth.admin as any).updateUserById(userId, {
      user_metadata: { role: role },
    });

    revalidatePath(`/admin/users/${userId}`);
    revalidatePath('/admin/users');
    return { success: true, message: 'Dados do perfil atualizados!' };
  } catch (error: any) {
    logger.error('Erro updateUserProfile', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

// --- ACTION 8: REDEFINIR SENHA ---
export async function adminResetPassword(
  userId: string,
  prevState: any,
  formData: FormData
) {
  try {
    await requireAdminPermission();

    const newPassword = formData.get('new_password') as string;
    if (!newPassword || newPassword.length < 6) {
      throw new Error('A senha deve ter no mínimo 6 caracteres.');
    }

    const { error } = await (supabaseAdmin.auth.admin as any).updateUserById(userId, {
      password: newPassword,
    });

    if (error) throw error;

    return { success: true, message: 'Senha alterada com sucesso!' };
  } catch (error: any) {
    logger.error('Erro adminResetPassword', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

// --- ACTION 9: DESATIVAR USUÁRIO (AÇÃO PADRÃO CANÔNICA - EXCLUSIVO MASTER) ---
export async function deactivateUser(targetUserId: string, reason?: string) {
  try {
    const caller = await requireMasterPermission();

    if (caller.userId === targetUserId) {
      return { success: false, error: 'Operação negada: você não pode desativar a sua própria conta.' };
    }

    const { data: targetProfile, error: fetchError } = await (supabaseAdmin as any)
      .from('profiles')
      .select('id, email, role, is_active')
      .eq('id', targetUserId)
      .single();

    if (fetchError || !targetProfile) {
      return { success: false, error: 'Usuário não encontrado.' };
    }

    if (targetProfile.role === 'master' && caller.role !== 'master') {
      return { success: false, error: 'Acesso negado: Administradores comuns não podem desativar usuários Master.' };
    }

    if (targetProfile.is_active === false) {
      return { success: true, message: 'O usuário já se encontra desativado.' };
    }

    // 1. Executar RPC transacional com FOR UPDATE no banco (Fonte Canônica)
    const { data: rpcRes, error: rpcError } = await (supabaseAdmin as any).rpc('deactivate_user_safe', {
      p_target_user_id: targetUserId,
      p_disabled_by: caller.userId,
      p_reason: reason || 'Desativado via painel administrativo',
    });

    if (rpcError) {
      logger.error('Erro na RPC deactivate_user_safe', rpcError);
      return { success: false, error: rpcError.message || 'Erro ao desativar usuário no banco.' };
    }

    // 2. Trava adicional de apoio no Auth (ban_duration)
    let authWarning: string | null = null;
    try {
      const { error: banError } = await (supabaseAdmin.auth.admin as any).updateUserById(targetUserId, {
        ban_duration: '876600h',
      });
      if (banError) {
        logger.error('Erro ao aplicar ban no Auth durante desativação', banError);
        authWarning = `Acesso desativado no banco, mas houve falha ao aplicar o ban no Auth: ${banError.message}`;
      }
    } catch (err: any) {
      logger.error('Exceção ao aplicar ban no Auth', err);
      authWarning = `Acesso desativado no banco, mas houve exceção ao aplicar ban no Auth.`;
    }

    // 3. Registrar Log de Auditoria com snapshot textual do executor
    try {
      await (supabaseAdmin as any).from('activity_logs').insert({
        user_id: caller.userId,
        action: 'user_deactivated',
        details: JSON.stringify({
          target_user_id: targetUserId,
          target_email: targetProfile.email,
          executor_email: caller.email,
          reason: reason || 'Nenhuma justificativa fornecida',
          auth_warning: authWarning,
        }),
      });
    } catch (auditErr) {
      logger.error('Erro ao salvar log de auditoria de desativação', auditErr);
    }

    revalidatePath('/admin/users');
    revalidatePath(`/admin/users/${targetUserId}`);

    if (authWarning) {
      return { success: true, warning: authWarning, message: 'Usuário desativado no banco com alerta de Auth.' };
    }

    return { success: true, message: 'Acesso do usuário desativado com sucesso.' };
  } catch (error: any) {
    logger.error('Erro deactivateUser', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

// --- ACTION 10: REATIVAR USUÁRIO (EXCLUSIVO MASTER) ---
export async function reactivateUser(targetUserId: string) {
  try {
    const caller = await requireMasterPermission();

    const { data: targetProfile, error: fetchError } = await (supabaseAdmin as any)
      .from('profiles')
      .select('id, email, is_active')
      .eq('id', targetUserId)
      .single();

    if (fetchError || !targetProfile) {
      return { success: false, error: 'Usuário não encontrado.' };
    }

    if (targetProfile.is_active !== false) {
      return { success: true, message: 'O usuário já está ativo.' };
    }

    // 1. Remover o ban no Auth PRIMEIRO
    const { error: unbanError } = await (supabaseAdmin.auth.admin as any).updateUserById(targetUserId, {
      ban_duration: 'none',
    });

    if (unbanError) {
      logger.error('Erro ao remover ban no Auth durante reativação', unbanError);
      return {
        success: false,
        error: `Falha ao remover o bloqueio no Supabase Auth: ${unbanError.message}. A conta permanece desativada.`,
      };
    }

    // 2. Somente se o Auth confirmar, atualizar is_active = true no banco
    const { error: updateError } = await (supabaseAdmin as any)
      .from('profiles')
      .update({
        is_active: true,
        disabled_at: null,
        disabled_by: null,
        disabled_reason: null,
      })
      .eq('id', targetUserId);

    if (updateError) {
      logger.error('Erro ao reativar perfil no banco:', updateError);
      // Tentar re-banir no Auth para manter consistência
      await (supabaseAdmin.auth.admin as any).updateUserById(targetUserId, { ban_duration: '876600h' });
      return { success: false, error: `Erro ao atualizar status do perfil no banco: ${updateError.message}` };
    }

    // 3. Auditoria
    try {
      await (supabaseAdmin as any).from('activity_logs').insert({
        user_id: caller.userId,
        action: 'user_reactivated',
        details: JSON.stringify({
          target_user_id: targetUserId,
          target_email: targetProfile.email,
          executor_email: caller.email,
        }),
      });
    } catch (err) {
      logger.error('Erro ao salvar log de auditoria de reativação', err);
    }

    revalidatePath('/admin/users');
    revalidatePath(`/admin/users/${targetUserId}`);
    return { success: true, message: 'Acesso do usuário reativado com sucesso.' };
  } catch (error: any) {
    logger.error('Erro reactivateUser', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

// --- ACTION 11: PRÉVIA DE IMPACTO DA EXCLUSÃO DEFINITIVA (EXCLUSIVO MASTER) ---
export async function getUserDeletionImpact(targetUserId: string) {
  try {
    await requireMasterPermission();

    const { data: targetProfile, error: fetchError } = await (supabaseAdmin as any)
      .from('profiles')
      .select('id, email, role, is_active')
      .eq('id', targetUserId)
      .single();

    if (fetchError || !targetProfile) {
      return { success: false, error: fetchError ? `Erro ao buscar perfil: ${fetchError.message}` : 'Usuário não encontrado.' };
    }

    // 1. Contar produtos pertencentes ao usuário (Autorizados para remoção via CASCADE)
    const { count: productsCount, data: userProducts, error: productsError } = await (supabaseAdmin as any)
      .from('products')
      .select('id', { count: 'exact' })
      .eq('user_id', targetUserId);

    if (productsError) {
      logger.error('Erro ao consultar tabela products', productsError);
      return { success: false, error: `Não foi possível verificar a tabela products: ${productsError.message}` };
    }

    // 2. Contar clientes pertencentes ao usuário (Bloqueante: clients possui ON DELETE CASCADE)
    const { count: clientsCount, data: userClients, error: clientsError } = await (supabaseAdmin as any)
      .from('clients')
      .select('id', { count: 'exact' })
      .eq('user_id', targetUserId);

    if (clientsError) {
      logger.error('Erro ao consultar tabela clients', clientsError);
      return { success: false, error: `Não foi possível verificar a tabela clients: ${clientsError.message}` };
    }

    // 3. Contar pedidos por user_id e client_id
    const { count: directOrdersCount, error: directOrdersError } = await (supabaseAdmin as any)
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', targetUserId);

    if (directOrdersError) {
      logger.error('Erro ao consultar orders por user_id', directOrdersError);
      return { success: false, error: `Não foi possível verificar a tabela orders (user_id): ${directOrdersError.message}` };
    }

    let ordersCount = directOrdersCount || 0;

    const clientIds = (userClients || []).map((c: any) => c.id);
    if (clientIds.length > 0) {
      const { count: clientOrdersCount, error: clientOrdersError } = await (supabaseAdmin as any)
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .in('client_id', clientIds);

      if (clientOrdersError) {
        logger.error('Erro ao consultar orders por client_id', clientOrdersError);
        return { success: false, error: `Não foi possível verificar a tabela orders (client_id): ${clientOrdersError.message}` };
      }

      ordersCount += clientOrdersCount || 0;
    }

    // 4. Contar pedidos onde o usuário figura como rep_user_id
    let ordersAsRepresentativeCount = 0;
    const { count: repOrdersCount, error: repOrdersError } = await (supabaseAdmin as any)
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('rep_user_id', targetUserId);

    if (repOrdersError) {
      logger.error('Erro ao consultar orders por rep_user_id', repOrdersError);
      return { success: false, error: `Não foi possível verificar a tabela orders (rep_user_id): ${repOrdersError.message}` };
    }
    ordersAsRepresentativeCount = repOrdersCount || 0;

    // 5. Contar itens de pedido vinculados aos produtos do usuário
    let orderItemsCount = 0;
    const productIds = (userProducts || []).map((p: any) => p.id);
    if (productIds.length > 0) {
      const { count: itemsCount, error: orderItemsError } = await (supabaseAdmin as any)
        .from('order_items')
        .select('id', { count: 'exact', head: true })
        .in('product_id', productIds);

      if (orderItemsError) {
        logger.error('Erro ao consultar order_items', orderItemsError);
        return { success: false, error: `Não foi possível verificar a tabela order_items: ${orderItemsError.message}` };
      }

      orderItemsCount = itemsCount || 0;
    }

    // 6. Contar carrinhos salvos (saved_carts)
    const { count: cartsCount, error: savedCartsError } = await (supabaseAdmin as any)
      .from('saved_carts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', targetUserId);

    if (savedCartsError) {
      logger.error('Erro ao consultar saved_carts', savedCartsError);
      return { success: false, error: `Não foi possível verificar a tabela saved_carts: ${savedCartsError.message}` };
    }
    const savedCartsCount = cartsCount || 0;

    // 7. Contar rascunhos de pedidos (draft_orders)
    const { count: draftsCount, error: draftOrdersError } = await (supabaseAdmin as any)
      .from('draft_orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', targetUserId);

    if (draftOrdersError) {
      logger.error('Erro ao consultar draft_orders', draftOrdersError);
      return { success: false, error: `Não foi possível verificar a tabela draft_orders: ${draftOrdersError.message}` };
    }
    const draftOrdersCount = draftsCount || 0;

    // 8. Contar configurações (settings)
    const { count: sCount, error: settingsError } = await (supabaseAdmin as any)
      .from('settings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', targetUserId);

    if (settingsError) {
      logger.error('Erro ao consultar settings', settingsError);
      return { success: false, error: `Não foi possível verificar a tabela settings: ${settingsError.message}` };
    }
    const settingsCount = sCount || 0;

    // 9. Contar preferências (user_preferences)
    const { count: prefCount, error: userPreferencesError } = await (supabaseAdmin as any)
      .from('user_preferences')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', targetUserId);

    if (userPreferencesError) {
      logger.error('Erro ao consultar user_preferences', userPreferencesError);
      return { success: false, error: `Não foi possível verificar a tabela user_preferences: ${userPreferencesError.message}` };
    }
    const userPreferencesCount = prefCount || 0;

    // Determinar se a exclusão está bloqueada (APENAS productsCount pode ser > 0)
    const isBlocked =
      (clientsCount || 0) > 0 ||
      ordersCount > 0 ||
      ordersAsRepresentativeCount > 0 ||
      orderItemsCount > 0 ||
      savedCartsCount > 0 ||
      draftOrdersCount > 0 ||
      settingsCount > 0 ||
      userPreferencesCount > 0;

    const reasons: string[] = [];
    if ((clientsCount || 0) > 0) reasons.push(`${clientsCount} cliente(s)`);
    if (ordersCount > 0) reasons.push(`${ordersCount} pedido(s)`);
    if (ordersAsRepresentativeCount > 0) reasons.push(`${ordersAsRepresentativeCount} pedido(s) como representante`);
    if (orderItemsCount > 0) reasons.push(`${orderItemsCount} item(ns) de pedido`);
    if (savedCartsCount > 0) reasons.push(`${savedCartsCount} carrinho(s) salvo(s)`);
    if (draftOrdersCount > 0) reasons.push(`${draftOrdersCount} rascunho(s) de pedido`);
    if (settingsCount > 0) reasons.push(`${settingsCount} configuração(ões)`);
    if (userPreferencesCount > 0) reasons.push(`${userPreferencesCount} preferência(s) de usuário`);

    const blockReason = isBlocked
      ? `A exclusão foi bloqueada pois a conta possui dependências não autorizadas para exclusão em cascata: ${reasons.join(', ')}. Utilize a opção "Desativar Acesso" para suspender logins preservando os dados.`
      : null;

    return {
      success: true,
      impact: {
        email: targetProfile.email,
        productsCount: productsCount || 0,
        clientsCount: clientsCount || 0,
        ordersCount,
        ordersAsRepresentativeCount,
        orderItemsCount,
        savedCartsCount,
        draftOrdersCount,
        settingsCount,
        userPreferencesCount,
        isBlocked,
        blockReason,
      },
    };
  } catch (error: any) {
    logger.error('Erro getUserDeletionImpact', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

// --- ACTION 12: EXCLUSÃO DEFINITIVA DO USUÁRIO (EXCLUSIVO MASTER - VIA AUTH DELETEUSER ONLY) ---
export async function permanentlyDeleteUser(targetUserId: string, confirmationEmail: string) {
  try {
    const caller = await requireMasterPermission();

    if (caller.userId === targetUserId) {
      return { success: false, error: 'Operação negada: você não pode excluir a sua própria conta.' };
    }

    const { data: targetProfile, error: fetchError } = await (supabaseAdmin as any)
      .from('profiles')
      .select('id, email, role, is_active')
      .eq('id', targetUserId)
      .single();

    if (fetchError || !targetProfile) {
      return { success: false, error: fetchError ? `Erro ao buscar perfil: ${fetchError.message}` : 'Usuário não encontrado.' };
    }

    if (targetProfile.role === 'master') {
      return { success: false, error: 'Operação bloqueada: usuários Master não podem ser excluídos definitivamente.' };
    }

    // Regra 8: Exigir que a conta esteja previamente desativada (is_active = false)
    if (targetProfile.is_active !== false) {
      return { success: false, error: 'Desative o acesso antes de realizar a exclusão definitiva.' };
    }

    // Regra 7: Buscar email no Auth como fonte canônica
    const { data: authUserData, error: authUserFetchError } = await supabaseAdmin.auth.admin.getUserById(targetUserId);

    if (authUserFetchError || !authUserData?.user) {
      return {
        success: false,
        error: authUserFetchError
          ? `Erro ao buscar usuário no Supabase Auth: ${authUserFetchError.message}`
          : 'Usuário não encontrado no Supabase Auth.',
      };
    }

    const authUser = authUserData.user;
    const canonicalEmail = authUser.email || targetProfile.email || '';

    if ((confirmationEmail || '').trim().toLowerCase() !== canonicalEmail.trim().toLowerCase()) {
      return { success: false, error: 'O email de confirmação não confere com o email da conta.' };
    }

    // 1. RECALCULAR A PRÉVIA DE IMPACTO IMEDIATAMENTE ANTES DE CHAMAR O DELETEUSER
    const impactRes = await getUserDeletionImpact(targetUserId);
    if (!impactRes.success || !impactRes.impact) {
      return { success: false, error: impactRes.error || 'Falha ao validar impacto de exclusão.' };
    }

    if (impactRes.impact.isBlocked) {
      return {
        success: false,
        error: impactRes.impact.blockReason || 'Exclusão bloqueada por dependências não autorizadas existentes na conta.',
      };
    }

    // 2. Regra 3: Auditoria attempted OBRIGATÓRIA pré-exclusão
    const { error: auditAttemptError } = await (supabaseAdmin as any).from('activity_logs').insert({
      user_id: caller.userId,
      action: 'user_permanent_deletion_attempted',
      details: JSON.stringify({
        target_user_id: targetUserId,
        target_email: canonicalEmail,
        executor_id: caller.userId,
        executor_email: caller.email,
        products_count: impactRes.impact.productsCount,
        clients_count: impactRes.impact.clientsCount,
        orders_count: impactRes.impact.ordersCount,
        orders_as_rep_count: impactRes.impact.ordersAsRepresentativeCount,
        order_items_count: impactRes.impact.orderItemsCount,
        saved_carts_count: impactRes.impact.savedCartsCount,
        draft_orders_count: impactRes.impact.draftOrdersCount,
        settings_count: impactRes.impact.settingsCount,
        user_preferences_count: impactRes.impact.userPreferencesCount,
        status: 'attempted',
      }),
    });

    if (auditAttemptError) {
      logger.error('Erro ao registrar auditoria de tentativa de exclusão', auditAttemptError);
      return {
        success: false,
        error: `Falha ao registrar auditoria de pré-exclusão: ${auditAttemptError.message}. Operação cancelada por segurança.`,
      };
    }

    // 3. Regra 4: A exclusão DEVE partir estritamente do Auth (SEM DELETES MANUAIS EM BANCO)
    const { error: authDeleteError } = await (supabaseAdmin.auth.admin as any).deleteUser(targetUserId);
    if (authDeleteError) {
      logger.error('Erro ao excluir no Supabase Auth', authDeleteError);

      const { error: auditFailedError } = await (supabaseAdmin as any).from('activity_logs').insert({
        user_id: caller.userId,
        action: 'user_permanent_deletion_failed',
        details: JSON.stringify({
          target_user_id: targetUserId,
          target_email: canonicalEmail,
          executor_id: caller.userId,
          executor_email: caller.email,
          error_message: authDeleteError.message,
          status: 'failed',
        }),
      });

      if (auditFailedError) {
        logger.error('Erro ao registrar log de auditoria de falha do Auth', auditFailedError);
      }

      return { success: false, error: `Erro ao excluir usuário no Supabase Auth: ${authDeleteError.message}` };
    }

    // 4. Regras 5 e 6: Tripla confirmação pós-Auth (Auth ausente, Profile ausente, Products = 0)
    const { data: postAuthCheck, error: postAuthError } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
    const isAuthStillExists = !postAuthError && !!postAuthCheck?.user;

    const { data: profileCheck, error: profileCheckError } = await (supabaseAdmin as any)
      .from('profiles')
      .select('id')
      .eq('id', targetUserId)
      .maybeSingle();

    const { count: remainingProducts, error: productsCheckError } = await (supabaseAdmin as any)
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', targetUserId);

    const hasResidues =
      isAuthStillExists || !!profileCheck || (remainingProducts !== null && remainingProducts > 0) || profileCheckError || productsCheckError;

    if (hasResidues) {
      logger.error('Resíduos detectados após exclusão via Auth', {
        isAuthStillExists,
        profileCheck,
        remainingProducts,
        profileCheckError,
        productsCheckError,
      });

      const { error: auditInconsistentError } = await (supabaseAdmin as any).from('activity_logs').insert({
        user_id: caller.userId,
        action: 'user_permanent_deletion_failed',
        details: JSON.stringify({
          target_user_id: targetUserId,
          target_email: canonicalEmail,
          executor_id: caller.userId,
          executor_email: caller.email,
          reason: 'O Auth foi removido, mas a limpeza em cascata não foi confirmada. É necessária verificação administrativa.',
          is_auth_present: isAuthStillExists,
          is_profile_present: !!profileCheck,
          remaining_products_count: remainingProducts || 0,
          status: 'inconsistent',
        }),
      });

      if (auditInconsistentError) {
        logger.error('Erro ao registrar log de auditoria inconsistente', auditInconsistentError);
      }

      return {
        success: false,
        error: 'O Auth foi removido, mas a limpeza em cascata não foi confirmada. É necessária verificação administrativa.',
      };
    }

    // 5. Log de Auditoria pós-exclusão concluída (status = completed) apenas após 3 confirmações
    const { error: auditCompletedError } = await (supabaseAdmin as any).from('activity_logs').insert({
      user_id: caller.userId,
      action: 'user_permanently_deleted',
      details: JSON.stringify({
        target_user_id: targetUserId,
        target_email: canonicalEmail,
        executor_id: caller.userId,
        executor_email: caller.email,
        products_deleted: impactRes.impact.productsCount,
        status: 'completed',
      }),
    });

    if (auditCompletedError) {
      logger.error('Erro ao registrar log pós-exclusão completed', auditCompletedError);
      return {
        success: false,
        error: `Exclusão realizada no Auth, porém falhou a gravação do registro de auditoria final: ${auditCompletedError.message}`,
      };
    }

    revalidatePath('/admin/users');
    revalidatePath(`/admin/users/${targetUserId}`);
    return { success: true, message: 'Usuário e seus produtos foram excluídos definitivamente com sucesso.' };
  } catch (error: any) {
    logger.error('Erro permanentlyDeleteUser', error);
    return { success: false, error: getErrorMessage(error) };
  }
}
