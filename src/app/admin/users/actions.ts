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
      .select(`
        *,
        subscriptions (
          plan_name,
          status,
          current_period_end,
          price
        )
      `)
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
      .select(`
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
      `)
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

    const mapRoleToDb = (role: string) => {
      const r = (role || '').toString().toLowerCase();
      if (r === 'master' || r === 'admin') return 'master';
      return 'rep';
    };

    const dbRole = mapRoleToDb(data.role);

    // 1. Auth
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { role: dbRole },
      });

    if (authError) throw new Error(`Erro Auth: ${authError.message}`);
    if (!authData.user) throw new Error('Falha ao gerar ID.');

    const userId = authData.user.id;

    // 2. Profile
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      email: data.email,
      full_name: data.email.split('@')[0],
      role: dbRole,
      updated_at: new Date().toISOString(),
    });

    if (profileError) throw new Error(`Erro Perfil: ${profileError.message}`);

    // 3. Subscription (Busca preço real)
    let price = 0;
    if (data.planName) {
      const { data: planData } = await supabaseAdmin
        .from('plans')
        .select('price')
        .eq('name', data.planName)
        .maybeSingle();

      if (planData) price = planData.price;
    }

    const { error: subError } = await supabaseAdmin.from('subscriptions').insert({
      user_id: userId,
      status: 'active',
      plan_name: data.planName,
      price: price,
      current_period_end: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
    });

    if (subError) throw new Error(`Erro Assinatura: ${subError.message}`);

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
        .select('price')
        .eq('name', planName)
        .maybeSingle();

      if (planData) updateData.price = planData.price;
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

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: fullName,
        role: role,
        updated_at: new Date().toISOString(),
      })
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
      errorMsg = 'Erro: Existem dados (lojas/produtos) vinculados a este usuário. Apague-os primeiro ou configure Cascade no Banco.';
    }
    
    return { success: false, error: errorMsg };
  }
}