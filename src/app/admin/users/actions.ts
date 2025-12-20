'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { logger } from '@/lib/logger';

// --- CONFIGURAÇÃO DO CLIENTE ADMIN ---
const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // <--- Verifique se está no .env.local
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

// --- TIPO DE DADOS ---
interface CreateUserData {
  email: string;
  password: string;
  role: string;
  planName: string;
}

// --- ACTION 1: CRIAR USUÁRIO ---
export async function createManualUser(data: CreateUserData) {
  try {
    // 1. Verifica se quem pediu é admin
    await requireAdminPermission();

    // 2. Cria no Auth (Login)
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { role: data.role },
      });

    if (authError) throw new Error(`Erro Auth: ${authError.message}`);
    if (!authData.user) throw new Error('Falha ao gerar ID.');

    const userId = authData.user.id;

    // 3. Cria Perfil
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email: data.email,
        full_name: data.email.split('@')[0],
        role: data.role,
        updated_at: new Date().toISOString(),
      });

    if (profileError) throw new Error(`Erro Perfil: ${profileError.message}`);

    // 4. Cria Assinatura
    let price = 0;
    if (data.planName === 'Basic') price = 49.9;
    if (data.planName === 'Pro') price = 99.9;
    if (data.planName === 'Enterprise') price = 299.9;

    const { error: subError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
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

// --- ACTION 2: RENOVAR ASSINATURA ---
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

    if (currentSub) {
      const { error: updateError } = await supabaseAdmin
        .from('subscriptions')
        .update({
          current_period_end: newDateIso,
          status: 'active',
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          user_id: userId,
          current_period_end: newDateIso,
          status: 'active',
          plan_name: 'Pro (Renovado)',
          price: 0,
        });

      if (insertError) throw insertError;
    }

    revalidatePath('/admin/users');
    return { success: true, newDate: newDateIso };
  } catch (error: unknown) {
    logger.error('Erro addSubscriptionDays', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

// --- ACTION 3: ATUALIZAR LICENÇA DO USUÁRIO ---
export async function updateUserLicense(
  userId: string,
  formData: FormData
): Promise<void> {
  await requireAdminPermission();

  const plan = formData.get('plan') as string;
  const status = formData.get('status') as string;
  const endsAt = formData.get('ends_at') as string;

  const updateData: Record<string, unknown> = {
    plan: plan || null,
    subscription_status: status || null,
    updated_at: new Date().toISOString(),
  };

  if (endsAt) {
    updateData.subscription_ends_at = new Date(endsAt).toISOString();
  } else {
    updateData.subscription_ends_at = null;
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update(updateData)
    .eq('id', userId);

  if (error) {
    logger.error('Erro updateUserLicense', error);
    throw new Error(error.message);
  }

  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${userId}`);
}
