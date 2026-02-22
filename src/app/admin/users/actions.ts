'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { logger } from '@/lib/logger';

// --- CONFIGURAÇÃO DO CLIENTE ADMIN (Service Role) ---
const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// --- CHECAGEM DE SEGURANÇA ---
async function requireAdminPermission() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado.');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAllowed = profile?.role === 'admin' || profile?.role === 'master';

  if (!isAllowed) {
    throw new Error(
      'Acesso negado: Apenas administradores podem realizar esta ação.'
    );
  }
  return true;
}

// --- ACTION 1: BUSCAR PLANOS ---
export async function getPlans() {
  try {
    await requireAdminPermission();
    const { data, error } = await supabaseAdmin
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

    const { data, error } = await supabaseAdmin
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

    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select(
        `
        id,
        email,
        role,
        created_at,
        full_name,
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
    const { data: existingProfile } = await supabaseAdmin
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
      return 'rep';
    };

    const dbRole = mapRoleToDb(data.role);

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
        user_metadata: { role: dbRole },
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
      const { data: planData } = await supabaseAdmin
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
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email: data.email,
        full_name: data.email.split('@')[0],
        role: dbRole,
        plan_id: planId, // Sincronizar plan_id
        updated_at: new Date().toISOString(),
      });

    if (profileError) throw new Error(`Erro Perfil: ${profileError.message}`);

    // 4. Subscription
    const { error: subError } = await supabaseAdmin
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
    const { error: settingsError } = await supabaseAdmin
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
      const { data: planData } = await supabaseAdmin
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

    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .update(updateData)
      .eq('user_id', userId)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      if (!updateData.price) updateData.price = 0;
      const { error: insertError } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          user_id: userId,
          ...updateData,
        });
      if (insertError) throw insertError;
    }

    // Sincronizar plan_id em profiles (limpa quando não houver plano ou plano gratuito)
    await supabaseAdmin
      .from('profiles')
      .update({
        plan_id: updateData.plan_id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    // Sincronizar plan_type em settings (armazena o tipo do plano mesmo que seja 'Free' ou vazio)
    await supabaseAdmin.from('settings').upsert({
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

    const { data: currentSub } = await supabaseAdmin
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

    const { error } = await supabaseAdmin.from('subscriptions').upsert(
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

    const { error } = await supabaseAdmin
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId);

    if (error) throw error;

    await supabaseAdmin.auth.admin.updateUserById(userId, {
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

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) throw error;

    return { success: true, message: 'Senha alterada com sucesso!' };
  } catch (error: any) {
    logger.error('Erro adminResetPassword', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

// --- ACTION 9: EXCLUIR USUÁRIO (CORRIGIDA - CLEANUP MANUAL) ---
export async function deleteUser(userId: string) {
  try {
    await requireAdminPermission();

    // 1. Limpeza Manual (Software Cascade)
    // Tenta apagar assinaturas primeiro
    await supabaseAdmin.from('subscriptions').delete().eq('user_id', userId);

    // Tenta apagar perfil depois
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    // DICA: Se tiver tabelas de "stores" ou "products", adicione aqui também:
    // await supabaseAdmin.from('stores').delete().eq('owner_id', userId);

    // 2. Apaga do Auth (A origem do erro)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) throw error;

    revalidatePath('/admin/users');
    return { success: true, message: 'Usuário excluído permanentemente.' };
  } catch (error: any) {
    logger.error('Erro deleteUser', error);

    // Melhora a mensagem de erro para o admin
    let errorMsg = getErrorMessage(error);
    if (errorMsg.includes('violates foreign key constraint')) {
      errorMsg =
        'Erro: Existem dados (lojas/produtos) vinculados a este usuário. Apague-os primeiro ou configure Cascade no Banco.';
    }

    return { success: false, error: errorMsg };
  }
}
