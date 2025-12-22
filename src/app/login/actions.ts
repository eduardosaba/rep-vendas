'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import { checkSupabaseEnv } from '@/lib/env';

// --- LOGIN COM EMAIL ---
export async function login(formData: FormData) {
  checkSupabaseEnv();

  const supabase = await createClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('signInWithPassword error:', error);
    const text = error.message || 'Email ou senha incorretos.';
    return redirect(
      `/login?message_type=error&message_text=${encodeURIComponent(text)}`
    );
  }

  // ESSENCIAL: Revalida o layout para garantir que o cookie de sessão seja propagado
  revalidatePath('/', 'layout');

  let redirectTo = '/dashboard';

  if (data.session && data.user) {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, onboarding_completed')
        .eq('id', data.user.id)
        .maybeSingle();

      const role = profileData?.role;
      const onboardingCompleted = profileData?.onboarding_completed;

      if (!onboardingCompleted) {
        redirectTo = '/onboarding';
      } else if (role === 'master') {
        redirectTo = '/admin';
      }
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
    }
  }

  return redirect(redirectTo);
}

// --- CADASTRO COM EMAIL ---
export async function signup(formData: FormData) {
  checkSupabaseEnv();
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const origin = (await headers()).get('origin');

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return redirect(
      `/register?message_type=error&message_text=${encodeURIComponent(error.message)}`
    );
  }

  return redirect(
    `/login?message_type=success&message_text=${encodeURIComponent(
      'Cadastro realizado! Verifique seu email para confirmar.'
    )}`
  );
}

// --- LOGIN COM GOOGLE ---
export async function loginWithGoogle() {
  checkSupabaseEnv();
  const supabase = await createClient();
  const origin = (await headers()).get('origin');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    return { error: 'Erro ao conectar com Google', url: null };
  }

  return { error: null, url: data.url };
}
