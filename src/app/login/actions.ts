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
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email e senha são obrigatórios.' };
  }

  try {
    // Use the API route that sets cookies server-side to ensure the browser receives Set-Cookie
    let base = process.env.NEXT_PUBLIC_BASE_URL || '';
    try {
      const hdrs = headers();
      const origin = hdrs.get && hdrs.get('origin');
      if (!base && origin) base = origin;
    } catch (e) {
      // ignore if headers() not available in this context
    }

    // If still no base, default to localhost dev port so Node fetch gets a valid absolute URL
    if (!base) {
      base = `http://localhost:${process.env.PORT || 3001}`;
    }

    const resp = await fetch(`${base}/api/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    const json = await resp.json();
    if (!resp.ok) return { error: json?.text || 'Erro ao autenticar.' };

    // Revalida para garantir que o cache do servidor não ignore a nova sessão
    revalidatePath('/');

    return { success: true, redirectTo: json.redirect };
  } catch (e) {
    console.error('[login] fetch /api/login failed', e);
    return { error: 'Erro interno ao autenticar.' };
  }
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
