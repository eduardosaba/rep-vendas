'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import { checkSupabaseEnv } from '@/lib/env';

// --- LOGIN COM EMAIL ---
export async function login(formData: FormData) {
  // Checar variáveis de ambiente de forma centralizada
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

  // Define o destino padrão
  let redirectTo = '/dashboard';

  // Verifica o perfil para decidir se vai para /admin
  if (data.session && data.user) {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();

      const role = profileData?.role;

      if (role === 'master') {
        redirectTo = '/admin';
      }
      // Se não for master, mantém '/dashboard'
    } catch (err) {
      // Agora este catch só pega erros reais de banco de dados,
      // não pega mais o erro de redirecionamento.
      console.error('Erro ao buscar perfil:', err);
      // Em caso de erro no perfil, mantemos o destino padrão '/dashboard'
    }
  }

  // O redirecionamento acontece FORA do try/catch
  revalidatePath('/', 'layout');
  return redirect(redirectTo);
}

// --- CADASTRO COM EMAIL ---
export async function signup(formData: FormData) {
  const ensureSupabaseEnv = () => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      console.error(
        'Faltam variáveis de ambiente Supabase: NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY'
      );
      throw new Error(
        'Configuração inválida: verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY'
      );
    }
  };

  ensureSupabaseEnv();
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
    return redirect(
      `/register?message_type=error&message_text=${encodeURIComponent(
        error.message
      )}`
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
  const ensureSupabaseEnv = () => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      console.error(
        'Faltam variáveis de ambiente Supabase: NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY'
      );
      throw new Error(
        'Configuração inválida: verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY'
      );
    }
  };

  ensureSupabaseEnv();
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
    return {
      error: 'Erro ao conectar com Google',
      url: null,
    };
  }

  // Retorna a URL para o cliente fazer o redirecionamento
  return {
    error: null,
    url: data.url,
  };
}
