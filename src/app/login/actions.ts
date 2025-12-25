'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export async function login(prevState: any, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email e senha são obrigatórios.' };
  }

  try {
    const supabase = await createClient(); //

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message || 'Erro ao autenticar.' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle();

    const redirectTo = profile?.role === 'master' ? '/admin' : '/dashboard';

    revalidatePath('/', 'layout'); //

    return { success: true, redirectTo };
  } catch (e) {
    console.error('[login] Erro interno:', e);
    return { error: 'Erro interno ao autenticar.' };
  }
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');

  // O redirect DEVE ficar fora de blocos try/catch para funcionar em Server Actions
  redirect('/login');
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message || 'Erro ao criar conta.' };

    revalidatePath('/', 'layout');
    return {
      success: true,
      message:
        'Cadastro realizado. Verifique seu e-mail para confirmar a conta.',
      user: data.user ?? null,
    };
  } catch (e) {
    return { error: 'Erro interno ao cadastrar usuário.' };
  }
}

export async function loginWithGoogle() {
  const supabase = await createClient();
  const hdr = await headers();
  const origin = hdr.get('origin');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`, //
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  });

  if (error) return { error: 'Erro ao conectar com Google' };
  return { url: data.url };
}
