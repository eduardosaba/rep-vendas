'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

/**
 * Realiza o login com email e senha.
 * Retorna um objeto de sucesso com a URL de destino para que o cliente
 * faça o redirecionamento, garantindo a gravação dos cookies no Next.js 15.
 */
export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  // 1. Tenta a autenticação
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message || 'Email ou senha incorretos.' };
  }

  // 2. FORÇA a leitura do usuário no servidor logo após o login.
  // Isso garante que os cabeçalhos Set-Cookie sejam preparados corretamente.
  await supabase.auth.getUser();

  // 3. Invalida o cache para que o layout reconheça a nova sessão
  revalidatePath('/', 'layout');

  // 4. Determina o destino baseado no perfil
  let redirectTo = '/dashboard';

  if (data.user) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, onboarding_completed')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profile) {
        if (!profile.onboarding_completed) {
          redirectTo = '/onboarding';
        } else if (profile.role === 'master') {
          redirectTo = '/admin';
        }
      }
    } catch (err) {
      console.error('[login] Erro ao buscar perfil:', err);
      // Mantém o redirecionamento padrão para /dashboard em caso de erro no perfil
    }
  }

  // 5. Retornamos o destino para que o Client-Side faça o redirecionamento.
  // Isso previne o loop de login causado por redirecionamentos de servidor que limpam cookies.
  return { success: true, redirectTo };
}

/**
 * Inicia o fluxo de autenticação com o Google.
 */
export async function loginWithGoogle() {
  const supabase = await createClient();
  const origin = (await headers()).get('origin');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // URL de callback configurada no seu painel do Supabase
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    console.error('[loginWithGoogle] Erro:', error);
    return { error: 'Erro ao conectar com Google' };
  }

  return { url: data.url };
}

/**
 * Realiza o cadastro de novos usuários.
 */
export async function signup(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return { error: error.message || 'Erro ao criar conta.' };
    }

    revalidatePath('/', 'layout');

    return {
      success: true,
      message:
        'Cadastro realizado. Verifique seu e-mail para confirmar a conta antes de fazer login.',
      user: data.user ?? null,
    };
  } catch (e) {
    console.error('[signup] Erro interno:', e);
    return { error: 'Erro interno ao cadastrar usuário.' };
  }
}
