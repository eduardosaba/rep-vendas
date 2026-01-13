'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

export async function login(_arg: unknown, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    // AQUI ESTÁ A CORREÇÃO: Adicionamos o await
    const supabase = await createClient();

    // Agora 'supabase' é o cliente real e possui a propriedade 'auth'
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { error: 'E-mail ou senha incorretos.' };

    // ... restante do código (também usando await para consultas ao banco)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    revalidatePath('/', 'layout');

    return {
      success: true,
      redirectTo: profile?.role === 'master' ? '/admin' : '/dashboard',
    };
  } catch (err: unknown) {
    const message =
      err && typeof err === 'object' && 'message' in err
        ? (err as { message?: unknown }).message
        : String(err);
    console.error('Erro na Server Action:', message);
    return { error: 'Erro interno no servidor.' };
  }
}

// Server action para iniciar login via Google (OAuth)
export async function loginWithGoogle() {
  try {
    const supabase = await createClient();

    // Avoid forcing a non-existent callback route. Use the app root as
    // redirect target (or let Supabase default) to reduce Redirect URI mismatch errors.
    const redirectTo =
      typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}`
        : undefined;

    // signInWithOAuth retorna uma URL para redirecionamento em muitas versões
    // usamos o resultado para o client-side redirecionar o usuário.
    // Ajuste conforme a versão do SDK se necessário.
    // @ts-ignore allow any shape from supabase client
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });

    if (error) return { error: error?.message };

    return { url: data?.url };
  } catch (err: unknown) {
    const message =
      err && typeof err === 'object' && 'message' in err
        ? (err as { message?: unknown }).message
        : String(err);
    console.error('Erro loginWithGoogle:', message);
    return { error: 'Erro ao iniciar login com Google' };
  }
}

// Minimal signup server action (basic flow). Adjust business logic as needed.
export async function signup(formData: FormData) {
  try {
    const supabase = await createClient();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { data: _data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error)
      return { error: (error as { message?: string }).message || 'Erro' };

    // Se o signUp foi criado com sucesso, tentamos criar uma assinatura trial
    try {
      const userId = (_data as any)?.user?.id;
      if (userId && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const supabaseAdmin = createSupabaseAdmin(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
            auth: { autoRefreshToken: false, persistSession: false },
          }
        );

        // Escolhe um plano padrão (o mais barato cadastrado) para o trial
        const { data: plans } = await supabaseAdmin
          .from('plans')
          .select('id, name, price')
          .order('price', { ascending: true })
          .limit(1);

        const plan = Array.isArray(plans) && plans.length > 0 ? plans[0] : null;
        const planId = plan?.id || null;
        const planName = plan?.name || 'Trial';

        // Inserir assinatura trial (14 dias)
        const endsAt = new Date(
          Date.now() + 14 * 24 * 60 * 60 * 1000
        ).toISOString();
        await supabaseAdmin.from('subscriptions').upsert(
          {
            user_id: userId,
            plan_id: planId,
            status: 'trial',
            plan_name: planName,
            current_period_end: endsAt,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

        // Atualiza settings.plan_type para refletir o trial (resiliência)
        await supabaseAdmin.from('settings').upsert({
          user_id: userId,
          plan_type: planName,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      // Não bloqueamos o fluxo se a criação do trial falhar; apenas logamos.
      console.warn(
        'Não foi possível criar assinatura trial automaticamente',
        err
      );
    }

    return { success: true, redirectTo: '/dashboard' };
  } catch (err: unknown) {
    const message =
      err && typeof err === 'object' && 'message' in err
        ? (err as { message?: unknown }).message
        : String(err);
    console.error('Erro signup:', message);
    return { error: 'Erro ao cadastrar usuário' };
  }
}

// Minimal logout server action
export async function logout() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return { success: true };
  } catch (err: unknown) {
    const message =
      err && typeof err === 'object' && 'message' in err
        ? (err as { message?: unknown }).message
        : String(err);
    console.error('Erro logout:', message);
    return { error: 'Erro ao fazer logout' };
  }
}
