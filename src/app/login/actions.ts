'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

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
