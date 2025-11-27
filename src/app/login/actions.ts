'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

// --- LOGIN COM EMAIL ---
export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return redirect(
      `/login?message=${encodeURIComponent('Email ou senha incorretos.')}`
    );
  }

  // Verifica se é Master ou User Comum
  if (data.session && data.user) {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      const role = profileData?.role;

      revalidatePath('/', 'layout');

      if (role === 'master') {
        return redirect('/admin');
      } else {
        return redirect('/dashboard');
      }
    } catch (err) {
      return redirect('/dashboard');
    }
  }

  return redirect('/dashboard');
}

// --- CADASTRO COM EMAIL ---
export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  // Pega a origem atual (localhost ou produção)
  const origin = (await headers()).get('origin');

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return redirect(`/register?message=${encodeURIComponent(error.message)}`);
  }

  return redirect(
    `/login?message=${encodeURIComponent('Cadastro realizado! Verifique seu email para confirmar.')}`
  );
}

// --- LOGIN COM GOOGLE (A Função que faltava) ---
export async function loginWithGoogle() {
  const supabase = await createClient();

  // Determina a URL base dinamicamente
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
    return redirect(
      `/login?message=${encodeURIComponent('Erro ao conectar com Google')}`
    );
  }

  if (data.url) {
    redirect(data.url); // Redireciona para a página de consentimento do Google
  }
}
