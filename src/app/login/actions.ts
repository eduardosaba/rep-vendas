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
      const hdrs = await headers();
      const origin =
        typeof hdrs.get === 'function' ? hdrs.get('origin') : undefined;
      if (!base && origin) base = origin;
    } catch (e) {
      // ignore if headers() not available in this context
    }

    // If still no base, default to localhost dev port so Node fetch gets a valid absolute URL
    if (!base) {
      base = `http://localhost:${process.env.PORT || 3001}`;
    }

    // Build a robust absolute URL even if `base` is malformed or a relative path
    let loginUrl = base.trim();
    if (!loginUrl) loginUrl = `http://localhost:${process.env.PORT || 3001}`;
    // If base is just a path like '/api' or starts with '/', use localhost origin
    if (loginUrl.startsWith('/')) {
      loginUrl = `http://localhost:${process.env.PORT || 3001}${loginUrl}`;
    }
    // If base doesn't include protocol, assume http
    if (!/^https?:\/\//i.test(loginUrl)) {
      loginUrl = `http://${loginUrl}`;
    }
    // Ensure no trailing slash and append /api/login
    loginUrl = loginUrl.replace(/\/+$/g, '') + '/api/login';

    console.log('[login] using loginUrl:', loginUrl);

    const resp = await fetch(loginUrl, {
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
