'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message || 'Email ou senha incorretos.' };
  }

  // Revalida para garantir que o cache do servidor não ignore a nova sessão
  revalidatePath('/');

  let redirectTo = '/dashboard';
  if (data.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, onboarding_completed')
      .eq('id', data.user.id)
      .maybeSingle();

    if (!profile?.onboarding_completed) redirectTo = '/onboarding';
    else if (profile?.role === 'master') redirectTo = '/admin';
  }

  // Retornamos o destino para que o Client-Side faça o redirect após gravar cookies
  return { success: true, redirectTo };
}

export async function loginWithGoogle() {
  const supabase = await createClient();
  const origin = (await headers()).get('origin');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  });

  if (error) return { error: 'Erro ao conectar com Google' };
  return { url: data.url };
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message || 'Erro ao criar conta.' };

    // revalida para atualizar possíveis caches server-side
    revalidatePath('/');

    return {
      success: true,
      message:
        'Cadastro realizado. Verifique seu e-mail para confirmar a conta antes de fazer login.',
      user: data.user ?? null,
    };
  } catch (e) {
    return { error: 'Erro interno ao cadastrar usuário.' };
  }
}
